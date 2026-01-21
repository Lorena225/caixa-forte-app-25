// ============================================================
// Audit Service - Logging, Reporting, and Security Alerts
// ============================================================

import { supabase } from "@/integrations/supabase/client";

export interface AuditEntry {
  company_id: string;
  user_id?: string;
  table_name: string;
  record_id?: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE';
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  correlation_id?: string;
  sensitivity_level?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AuditFilters {
  usuario?: string;
  recurso?: string;
  acao?: string;
  dataInicio?: string;
  dataFim?: string;
  sensitivity?: string;
}

export interface SecurityAlert {
  type: 'failed_logins' | 'off_hours_access' | 'bulk_changes' | 'permission_escalation' | 'data_export';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  count: number;
  details: Record<string, unknown>;
  detected_at: string;
}

// Sensitive fields that should be redacted in logs
const SENSITIVE_FIELDS = [
  'password', 'senha', 'secret', 'token', 'api_key', 'key_hash',
  'cpf', 'cnpj', 'rg', 'pis', 'cnh', 'credit_card', 'card_number',
  'cvv', 'pin', 'otp', 'mfa_secret'
];

// ==================== REDACTION ====================
function redactSensitiveData(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null;
  
  const redacted = { ...data };
  for (const key of Object.keys(redacted)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
      redacted[key] = redactSensitiveData(redacted[key] as Record<string, unknown>);
    }
  }
  return redacted;
}

// ==================== HASH CHAIN ====================
async function calculateHash(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function getLastEntryHash(companyId: string): Promise<string | null> {
  // Use base table for hash chain (audit_logs has hash columns)
  const { data } = await supabase
    .from('audit_logs')
    .select('entry_hash')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  return (data as { entry_hash?: string })?.entry_hash || null;
}

// ==================== AUDIT SERVICE ====================
export class AuditService {
  
  /**
   * Log an audit entry with automatic redaction and hash chain
   */
  static async log(entry: AuditEntry): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      // Redact sensitive data
      const redactedOldData = redactSensitiveData(entry.old_data || null);
      const redactedNewData = redactSensitiveData(entry.new_data || null);
      
      // Get previous hash for chain integrity
      const prevHash = await getLastEntryHash(entry.company_id);
      
      // Calculate entry hash
      const entryData = JSON.stringify({
        ...entry,
        old_data: redactedOldData,
        new_data: redactedNewData,
        prev_hash: prevHash,
        timestamp: new Date().toISOString(),
      });
      const entryHash = await calculateHash(entryData);
      
      // Determine sensitivity level based on table/action
      const sensitivity = entry.sensitivity_level || this.determineSensitivity(entry);
      
      // Insert audit log - cast to any to avoid strict type checking on insert
      const insertData: Record<string, unknown> = {
        company_id: entry.company_id,
        user_id: entry.user_id || null,
        table_name: entry.table_name,
        record_id: entry.record_id || null,
        action: entry.action,
        old_data: redactedOldData,
        new_data: redactedNewData,
        ip_address: entry.ip_address || null,
        user_agent: entry.user_agent || null,
        correlation_id: entry.correlation_id || null,
        prev_hash: prevHash,
        entry_hash: entryHash,
        sensitivity_level: sensitivity,
      };
      
      const { data, error } = await supabase
        .from('audit_logs')
        .insert(insertData as never)
        .select('id')
        .single();
      
      if (error) throw error;
      
      // Check if this is a critical action that needs alerts
      if (sensitivity === 'critical') {
        await this.triggerSecurityAlert(entry);
      }
      
      return { success: true, id: data?.id };
    } catch (error) {
      console.error('Audit log error:', error);
      return { success: false, error: (error as Error).message };
    }
  }
  
  /**
   * Determine sensitivity level based on table and action
   */
  private static determineSensitivity(entry: AuditEntry): 'low' | 'medium' | 'high' | 'critical' {
    const criticalTables = ['user_permissions', 'roles', 'api_keys', 'ai_company_settings', 'bank_accounts'];
    const highTables = ['transactions', 'settlements', 'counterparties', 'fiscal_documents'];
    
    if (entry.action === 'PERMISSION_CHANGE') return 'critical';
    if (criticalTables.includes(entry.table_name)) return 'critical';
    if (entry.action === 'DELETE' && highTables.includes(entry.table_name)) return 'high';
    if (highTables.includes(entry.table_name)) return 'medium';
    return 'low';
  }
  
  /**
   * Trigger security alert for critical actions
   */
  private static async triggerSecurityAlert(entry: AuditEntry): Promise<void> {
    // Log to ai_monitor_alerts for visibility
    try {
      await supabase.from('ai_monitor_alerts').insert({
        company_id: entry.company_id,
        alert_type: 'security_audit',
        severity: 'warning',
        title: `Ação crítica: ${entry.action} em ${entry.table_name}`,
        message_summary: `Uma ação de nível crítico foi registrada no sistema.`,
        details_json: {
          table: entry.table_name,
          action: entry.action,
          record_id: entry.record_id,
          user_id: entry.user_id,
        },
      });
    } catch (e) {
      console.error('Failed to create security alert:', e);
    }
  }
  
  /**
   * Get paginated audit report with filters
   */
  static async getAuditReport(
    companyId: string,
    filters: AuditFilters,
    page: number = 1,
    limit: number = 100
  ): Promise<{ data: Record<string, unknown>[]; total: number }> {
    let query = supabase
      .from('audit_logs_safe')
      .select('*', { count: 'exact' })
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    
    if (filters.usuario) {
      query = query.eq('user_id', filters.usuario);
    }
    if (filters.recurso) {
      query = query.eq('table_name', filters.recurso);
    }
    if (filters.acao) {
      query = query.eq('action', filters.acao);
    }
    if (filters.dataInicio) {
      query = query.gte('created_at', filters.dataInicio);
    }
    if (filters.dataFim) {
      query = query.lte('created_at', filters.dataFim + 'T23:59:59');
    }
    if (filters.sensitivity) {
      query = query.eq('sensitivity_level', filters.sensitivity);
    }
    
    const offset = (page - 1) * limit;
    query = query.range(offset, offset + limit - 1);
    
    const { data, count, error } = await query;
    if (error) throw error;
    
    return { data: data || [], total: count || 0 };
  }
  
  /**
   * Generate security report detecting suspicious patterns
   */
  static async generateSecurityReport(companyId: string): Promise<SecurityAlert[]> {
    const alerts: SecurityAlert[] = [];
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // 1. Multiple failed logins (check api_logs for 401/403)
    const { data: failedLogins } = await supabase
      .from('api_logs')
      .select('*')
      .eq('company_id', companyId)
      .in('status_code', [401, 403])
      .gte('created_at', last24h);
    
    if (failedLogins && failedLogins.length >= 5) {
      alerts.push({
        type: 'failed_logins',
        severity: failedLogins.length >= 20 ? 'critical' : 'high',
        description: `${failedLogins.length} tentativas de acesso falharam nas últimas 24h`,
        count: failedLogins.length,
        details: { sample: failedLogins.slice(0, 3) },
        detected_at: now.toISOString(),
      });
    }
    
    // 2. Off-hours access (between 22:00 and 06:00)
    const { data: offHoursAccess } = await supabase
      .from('audit_logs_safe')
      .select('*')
      .eq('company_id', companyId)
      .gte('created_at', last24h);
    
    const offHoursLogs = (offHoursAccess || []).filter(log => {
      const hour = new Date(log.created_at).getHours();
      return hour >= 22 || hour < 6;
    });
    
    if (offHoursLogs.length >= 10) {
      alerts.push({
        type: 'off_hours_access',
        severity: 'medium',
        description: `${offHoursLogs.length} acessos fora do horário comercial nas últimas 24h`,
        count: offHoursLogs.length,
        details: { hours: offHoursLogs.map(l => new Date(l.created_at).getHours()) },
        detected_at: now.toISOString(),
      });
    }
    
    // 3. Bulk changes (many deletes in short period)
    const { data: bulkDeletes } = await supabase
      .from('audit_logs_safe')
      .select('*')
      .eq('company_id', companyId)
      .eq('action', 'DELETE')
      .gte('created_at', last24h);
    
    if (bulkDeletes && bulkDeletes.length >= 20) {
      alerts.push({
        type: 'bulk_changes',
        severity: 'high',
        description: `${bulkDeletes.length} registros excluídos nas últimas 24h`,
        count: bulkDeletes.length,
        details: { 
          tables: [...new Set(bulkDeletes.map(d => d.table_name))],
        },
        detected_at: now.toISOString(),
      });
    }
    
    // 4. Permission escalation
    const { data: permissionChanges } = await supabase
      .from('audit_logs_safe')
      .select('*')
      .eq('company_id', companyId)
      .in('table_name', ['user_permissions', 'roles', 'user_roles'])
      .gte('created_at', last7d);
    
    if (permissionChanges && permissionChanges.length >= 5) {
      alerts.push({
        type: 'permission_escalation',
        severity: 'medium',
        description: `${permissionChanges.length} alterações de permissões nos últimos 7 dias`,
        count: permissionChanges.length,
        details: { actions: permissionChanges.map(p => p.action) },
        detected_at: now.toISOString(),
      });
    }
    
    // 5. Data exports
    const { data: exports } = await supabase
      .from('audit_logs_safe')
      .select('*')
      .eq('company_id', companyId)
      .eq('action', 'EXPORT')
      .gte('created_at', last7d);
    
    if (exports && exports.length >= 10) {
      alerts.push({
        type: 'data_export',
        severity: 'low',
        description: `${exports.length} exportações de dados nos últimos 7 dias`,
        count: exports.length,
        details: { tables: [...new Set(exports.map(e => e.table_name))] },
        detected_at: now.toISOString(),
      });
    }
    
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
  
  /**
   * Export audit logs to CSV format
   */
  static async exportToCSV(
    companyId: string,
    filters: AuditFilters
  ): Promise<string> {
    const { data } = await this.getAuditReport(companyId, filters, 1, 10000);
    
    if (!data.length) return '';
    
    const headers = ['Data/Hora', 'Usuário', 'Tabela', 'Ação', 'Registro', 'Sensibilidade'];
    const rows = data.map(log => [
      log.created_at,
      log.user_id || 'Sistema',
      log.table_name,
      log.action,
      log.record_id || '-',
      log.sensitivity_level || 'low',
    ]);
    
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');
    
    // Log the export action
    await this.log({
      company_id: companyId,
      table_name: 'audit_logs',
      action: 'EXPORT',
      new_data: { 
        record_count: data.length,
        filters,
        exported_at: new Date().toISOString(),
      },
      sensitivity_level: 'medium',
    });
    
    return csvContent;
  }
  
  /**
   * Verify hash chain integrity for audit logs
   */
  static async verifyIntegrity(companyId: string, limit: number = 100): Promise<{
    valid: boolean;
    checked: number;
    broken_at?: string;
  }> {
    // Use base table for hash verification
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('id, entry_hash, prev_hash, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })
      .limit(limit);
    
    if (!logs || logs.length === 0) {
      return { valid: true, checked: 0 };
    }
    
    // Type assertion for logs with hash fields
    const typedLogs = logs as Array<{
      id: string;
      entry_hash: string | null;
      prev_hash: string | null;
      created_at: string;
    }>;
    
    for (let i = 1; i < typedLogs.length; i++) {
      const current = typedLogs[i];
      const previous = typedLogs[i - 1];
      
      if (current.prev_hash && current.prev_hash !== previous.entry_hash) {
        return {
          valid: false,
          checked: i + 1,
          broken_at: current.created_at,
        };
      }
    }
    
    return { valid: true, checked: typedLogs.length };
  }
  
  /**
   * Get audit statistics for dashboard
   */
  static async getAuditStats(companyId: string): Promise<{
    total_today: number;
    total_week: number;
    by_action: Record<string, number>;
    by_sensitivity: Record<string, number>;
    top_tables: Array<{ table: string; count: number }>;
  }> {
    const now = new Date();
    const today = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    // Today's count
    const { count: todayCount } = await supabase
      .from('audit_logs_safe')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', today);
    
    // Week's count
    const { count: weekCount } = await supabase
      .from('audit_logs_safe')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', weekAgo);
    
    // Get logs for aggregation
    const { data: logs } = await supabase
      .from('audit_logs_safe')
      .select('action, sensitivity_level, table_name')
      .eq('company_id', companyId)
      .gte('created_at', weekAgo);
    
    const byAction: Record<string, number> = {};
    const bySensitivity: Record<string, number> = {};
    const tableCount: Record<string, number> = {};
    
    (logs || []).forEach(log => {
      byAction[log.action] = (byAction[log.action] || 0) + 1;
      const sens = log.sensitivity_level || 'low';
      bySensitivity[sens] = (bySensitivity[sens] || 0) + 1;
      tableCount[log.table_name] = (tableCount[log.table_name] || 0) + 1;
    });
    
    const topTables = Object.entries(tableCount)
      .map(([table, count]) => ({ table, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      total_today: todayCount || 0,
      total_week: weekCount || 0,
      by_action: byAction,
      by_sensitivity: bySensitivity,
      top_tables: topTables,
    };
  }
}
