// ============================================================
// Non-Repudiation Service - Digital Signatures & Compliance
// LGPD, SOX, Basileia, ISO 27001, RFC 3161
// ============================================================

import { supabase } from "@/integrations/supabase/client";

// ==================== TYPES ====================
export interface DigitalSignatureRequest {
  auditLogId: string;
  signerCpf: string;
  signerName: string;
  certificateSerialNumber?: string;
  certificateIssuer?: string;
  certificateSubject?: string;
  certificateValidFrom?: string;
  certificateValidUntil?: string;
}

export interface DigitalSignature {
  id: string;
  company_id: string;
  audit_log_id: string;
  signer_cpf: string;
  signer_name: string;
  certificate_serial_number?: string;
  certificate_issuer?: string;
  signature_algorithm: string;
  signature_value: string;
  signed_data_hash: string;
  timestamp_authority?: string;
  timestamp_at?: string;
  is_valid: boolean;
  created_at: string;
}

export interface PendingSignature {
  id: string;
  company_id: string;
  audit_log_id: string;
  operation_type: string;
  operation_description?: string;
  amount?: number;
  requested_by?: string;
  requested_at: string;
  expires_at: string;
  status: 'pending' | 'signed' | 'expired' | 'rejected';
  signed_at?: string;
  rejection_reason?: string;
}

export interface CriticalOperation {
  id: string;
  company_id: string;
  operation_code: string;
  operation_name: string;
  description?: string;
  threshold_amount?: number;
  requires_signature: boolean;
  requires_dual_approval: boolean;
  signature_timeout_minutes: number;
  is_active: boolean;
}

export interface ComplianceReport {
  id: string;
  company_id: string;
  report_type: 'LGPD' | 'SOX' | 'BASILEIA' | 'ISO27001';
  report_period_start: string;
  report_period_end: string;
  status: 'draft' | 'pending_review' | 'approved' | 'signed';
  summary_json?: Record<string, unknown>;
  findings_json?: Record<string, unknown>;
  recommendations_json?: Record<string, unknown>;
  generated_at: string;
}

export interface IntegrityCheck {
  id: string;
  company_id: string;
  checked_at: string;
  records_checked: number;
  is_valid: boolean;
  first_record_timestamp?: string;
  last_record_timestamp?: string;
  broken_at_timestamp?: string;
  expected_hash?: string;
  found_hash?: string;
  verification_duration_ms?: number;
}

// ==================== HASH UTILITIES ====================
async function calculateSHA256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ==================== NON-REPUDIATION SERVICE ====================
export class NonRepudiationService {
  
  /**
   * Sign an audit log entry with digital signature
   */
  static async signOperation(
    companyId: string,
    request: DigitalSignatureRequest
  ): Promise<{ success: boolean; signatureId?: string; error?: string }> {
    try {
      // Get the audit log entry hash
      const { data: auditLog, error: auditError } = await supabase
        .from('audit_logs')
        .select('entry_hash, company_id')
        .eq('id', request.auditLogId)
        .single();
      
      if (auditError || !auditLog) {
        return { success: false, error: 'Audit log not found' };
      }
      
      // Type assertion for entry_hash
      const typedAuditLog = auditLog as { entry_hash: string | null; company_id: string };
      
      if (typedAuditLog.company_id !== companyId) {
        return { success: false, error: 'Unauthorized company access' };
      }
      
      const signedDataHash = typedAuditLog.entry_hash || await calculateSHA256(JSON.stringify(auditLog));
      
      // Create signature value (in production, this would use actual PKI)
      const signatureData = JSON.stringify({
        auditLogId: request.auditLogId,
        dataHash: signedDataHash,
        signerCpf: request.signerCpf,
        timestamp: new Date().toISOString(),
      });
      const signatureValue = await calculateSHA256(signatureData);
      
      // Insert digital signature
      const { data: signature, error: sigError } = await supabase
        .from('digital_signatures')
        .insert({
          company_id: companyId,
          audit_log_id: request.auditLogId,
          signer_cpf: request.signerCpf,
          signer_name: request.signerName,
          certificate_serial_number: request.certificateSerialNumber,
          certificate_issuer: request.certificateIssuer,
          certificate_subject: request.certificateSubject,
          certificate_valid_from: request.certificateValidFrom,
          certificate_valid_until: request.certificateValidUntil,
          signature_value: signatureValue,
          signed_data_hash: signedDataHash,
          timestamp_at: new Date().toISOString(),
        } as never)
        .select('id')
        .single();
      
      if (sigError) throw sigError;
      
      // Update audit log with signature info
      await supabase
        .from('audit_logs')
        .update({
          signed_at: new Date().toISOString(),
          signed_by_cpf: request.signerCpf,
          signed_by_name: request.signerName,
          signature_hash: signatureValue,
          certificate_serial_number: request.certificateSerialNumber,
        } as never)
        .eq('id', request.auditLogId);
      
      // Update pending signature if exists
      await supabase
        .from('pending_signatures')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_id: signature?.id,
        } as never)
        .eq('audit_log_id', request.auditLogId)
        .eq('status', 'pending');
      
      return { success: true, signatureId: signature?.id };
    } catch (error) {
      console.error('Sign operation error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Get pending signatures requiring action
   */
  static async getPendingSignatures(companyId: string): Promise<PendingSignature[]> {
    const { data, error } = await supabase
      .from('pending_signatures')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('requested_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as unknown as PendingSignature[];
  }
  
  /**
   * Reject a pending signature
   */
  static async rejectSignature(
    pendingId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('pending_signatures')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        } as never)
        .eq('id', pendingId);
      
      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Get critical operations configuration
   */
  static async getCriticalOperations(companyId: string): Promise<CriticalOperation[]> {
    const { data, error } = await supabase
      .from('critical_operations')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('operation_name');
    
    if (error) throw error;
    return (data || []) as unknown as CriticalOperation[];
  }
  
  /**
   * Configure a critical operation threshold
   */
  static async configureCriticalOperation(
    companyId: string,
    config: Partial<CriticalOperation>
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('critical_operations')
        .upsert({
          company_id: companyId,
          ...config,
          updated_at: new Date().toISOString(),
        } as never)
        .select('id')
        .single();
      
      if (error) throw error;
      return { success: true, id: data?.id };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Verify integrity of audit logs with hash chain
   */
  static async verifyIntegrity(
    companyId: string,
    limit: number = 1000
  ): Promise<IntegrityCheck> {
    const startTime = Date.now();
    
    // Get audit logs ordered by creation
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('id, entry_hash, prev_hash, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (error) throw error;
    
    const typedLogs = (logs || []) as Array<{
      id: string;
      entry_hash: string | null;
      prev_hash: string | null;
      created_at: string;
    }>;
    
    let isValid = true;
    let brokenAt: string | undefined;
    let expectedHash: string | undefined;
    let foundHash: string | undefined;
    let brokenRecordId: string | undefined;
    
    for (let i = 1; i < typedLogs.length; i++) {
      const current = typedLogs[i];
      const previous = typedLogs[i - 1];
      
      if (current.prev_hash && previous.entry_hash && current.prev_hash !== previous.entry_hash) {
        isValid = false;
        brokenAt = current.created_at;
        expectedHash = previous.entry_hash;
        foundHash = current.prev_hash;
        brokenRecordId = current.id;
        break;
      }
    }
    
    const duration = Date.now() - startTime;
    
    // Save verification result
    const { data: check } = await supabase
      .from('audit_integrity_checks')
      .insert({
        company_id: companyId,
        records_checked: typedLogs.length,
        is_valid: isValid,
        first_record_id: typedLogs[0]?.id,
        last_record_id: typedLogs[typedLogs.length - 1]?.id,
        first_record_timestamp: typedLogs[0]?.created_at,
        last_record_timestamp: typedLogs[typedLogs.length - 1]?.created_at,
        broken_at_record_id: brokenRecordId,
        broken_at_timestamp: brokenAt,
        expected_hash: expectedHash,
        found_hash: foundHash,
        verification_duration_ms: duration,
      } as never)
      .select()
      .single();
    
    return (check || {
      id: '',
      company_id: companyId,
      checked_at: new Date().toISOString(),
      records_checked: typedLogs.length,
      is_valid: isValid,
      first_record_timestamp: typedLogs[0]?.created_at,
      last_record_timestamp: typedLogs[typedLogs.length - 1]?.created_at,
      broken_at_timestamp: brokenAt,
      expected_hash: expectedHash,
      found_hash: foundHash,
      verification_duration_ms: duration,
    }) as IntegrityCheck;
  }
  
  /**
   * Get integrity check history
   */
  static async getIntegrityHistory(companyId: string, limit: number = 20): Promise<IntegrityCheck[]> {
    const { data, error } = await supabase
      .from('audit_integrity_checks')
      .select('*')
      .eq('company_id', companyId)
      .order('checked_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []) as unknown as IntegrityCheck[];
  }
  
  /**
   * Generate compliance report
   */
  static async generateComplianceReport(
    companyId: string,
    reportType: 'LGPD' | 'SOX' | 'BASILEIA' | 'ISO27001',
    periodStart: string,
    periodEnd: string
  ): Promise<ComplianceReport> {
    // Get audit statistics for the period
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('action, table_name, sensitivity_level, is_critical_operation, requires_signature, signed_at')
      .eq('company_id', companyId)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd + 'T23:59:59');
    
    const typedLogs = (logs || []) as Array<{
      action: string;
      table_name: string;
      sensitivity_level: string | null;
      is_critical_operation: boolean;
      requires_signature: boolean;
      signed_at: string | null;
    }>;
    
    // Calculate summary
    const summary = {
      total_operations: typedLogs.length,
      by_action: {} as Record<string, number>,
      by_sensitivity: {} as Record<string, number>,
      critical_operations: typedLogs.filter(l => l.is_critical_operation).length,
      signed_operations: typedLogs.filter(l => l.signed_at).length,
      unsigned_critical: typedLogs.filter(l => l.requires_signature && !l.signed_at).length,
    };
    
    typedLogs.forEach(log => {
      summary.by_action[log.action] = (summary.by_action[log.action] || 0) + 1;
      const sens = log.sensitivity_level || 'low';
      summary.by_sensitivity[sens] = (summary.by_sensitivity[sens] || 0) + 1;
    });
    
    // Generate findings based on report type
    const findings: Record<string, unknown> = {};
    const recommendations: Record<string, unknown> = {};
    
    if (reportType === 'LGPD') {
      findings.data_access_count = typedLogs.filter(l => l.action === 'VIEW').length;
      findings.data_exports = typedLogs.filter(l => l.action === 'EXPORT').length;
      findings.high_sensitivity_access = typedLogs.filter(l => ['high', 'critical'].includes(l.sensitivity_level || '')).length;
      
      if (summary.unsigned_critical > 0) {
        recommendations.sign_critical = `${summary.unsigned_critical} operações críticas aguardam assinatura`;
      }
    } else if (reportType === 'SOX') {
      findings.financial_changes = typedLogs.filter(l => 
        ['transactions', 'settlements', 'journal_entries'].includes(l.table_name)
      ).length;
      findings.permission_changes = typedLogs.filter(l =>
        ['user_permissions', 'roles', 'user_roles'].includes(l.table_name)
      ).length;
      findings.signature_compliance = summary.critical_operations > 0 
        ? ((summary.signed_operations / summary.critical_operations) * 100).toFixed(1) + '%'
        : '100%';
    }
    
    // Insert report
    const { data: report, error } = await supabase
      .from('compliance_reports')
      .insert({
        company_id: companyId,
        report_type: reportType,
        report_period_start: periodStart,
        report_period_end: periodEnd,
        status: 'draft',
        summary_json: summary,
        findings_json: findings,
        recommendations_json: recommendations,
      } as never)
      .select()
      .single();
    
    if (error) throw error;
    return report as unknown as ComplianceReport;
  }
  
  /**
   * Get compliance reports
   */
  static async getComplianceReports(
    companyId: string,
    reportType?: string
  ): Promise<ComplianceReport[]> {
    let query = supabase
      .from('compliance_reports')
      .select('*')
      .eq('company_id', companyId)
      .order('generated_at', { ascending: false });
    
    if (reportType) {
      query = query.eq('report_type', reportType);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as ComplianceReport[];
  }
  
  /**
   * Get digital signatures for an audit log
   */
  static async getSignatures(auditLogId: string): Promise<DigitalSignature[]> {
    const { data, error } = await supabase
      .from('digital_signatures')
      .select('*')
      .eq('audit_log_id', auditLogId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as unknown as DigitalSignature[];
  }
  
  /**
   * Export audit trail for compliance (signed PDF placeholder)
   */
  static async exportAuditTrail(
    companyId: string,
    startDate: string,
    endDate: string,
    format: 'CSV' | 'JSON' | 'XML' = 'CSV'
  ): Promise<string> {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', startDate)
      .lte('created_at', endDate + 'T23:59:59')
      .order('created_at', { ascending: true });
    
    const typedLogs = (logs || []) as Array<Record<string, unknown>>;
    
    if (format === 'JSON') {
      return JSON.stringify(typedLogs, null, 2);
    } else if (format === 'XML') {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<audit_trail>\n';
      typedLogs.forEach(log => {
        xml += '  <entry>\n';
        Object.entries(log).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            const escapedValue = String(value)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');
            xml += `    <${key}>${escapedValue}</${key}>\n`;
          }
        });
        xml += '  </entry>\n';
      });
      xml += '</audit_trail>';
      return xml;
    } else {
      // CSV format
      if (typedLogs.length === 0) return '';
      
      const headers = ['Data/Hora', 'Usuário', 'Tabela', 'Ação', 'Registro', 'Crítico', 'Assinado', 'Hash'];
      const rows = typedLogs.map(log => [
        log.created_at,
        log.user_id || 'Sistema',
        log.table_name,
        log.action,
        log.record_id || '-',
        log.is_critical_operation ? 'Sim' : 'Não',
        log.signed_at ? 'Sim' : 'Não',
        (log.entry_hash as string)?.substring(0, 16) || '-',
      ]);
      
      return [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    }
  }
}
