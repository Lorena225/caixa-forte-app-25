// ============================================================
// Non-Repudiation Hooks - Digital Signatures & Compliance
// ============================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { 
  NonRepudiationService, 
  DigitalSignatureRequest, 
  CriticalOperation,
  IntegrityCheck,
  ComplianceReport 
} from "@/services/NonRepudiationService";
import { toast } from "sonner";

// ==================== PENDING SIGNATURES ====================
export function usePendingSignatures() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["pending-signatures", companyId],
    queryFn: () => NonRepudiationService.getPendingSignatures(companyId!),
    enabled: !!companyId,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
}

export function useSignOperation() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: DigitalSignatureRequest): Promise<{ success: boolean; signatureId?: string; error?: string }> =>
      NonRepudiationService.signOperation(currentCompany!.id, request),
    onSuccess: (result: { success: boolean; signatureId?: string; error?: string }) => {
      if (result.success) {
        toast.success("Operação assinada digitalmente");
        queryClient.invalidateQueries({ queryKey: ["pending-signatures"] });
        queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      } else {
        toast.error(result.error || "Erro ao assinar operação");
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useRejectSignature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ pendingId, reason }: { pendingId: string; reason: string }): Promise<{ success: boolean; error?: string }> =>
      NonRepudiationService.rejectSignature(pendingId, reason),
    onSuccess: (result: { success: boolean; error?: string }) => {
      if (result.success) {
        toast.success("Assinatura rejeitada");
        queryClient.invalidateQueries({ queryKey: ["pending-signatures"] });
      } else {
        toast.error(result.error || "Erro ao rejeitar assinatura");
      }
    },
  });
}

// ==================== CRITICAL OPERATIONS ====================
export function useCriticalOperations() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["critical-operations", companyId],
    queryFn: () => NonRepudiationService.getCriticalOperations(companyId!),
    enabled: !!companyId,
  });
}

export function useConfigureCriticalOperation() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (config: Partial<CriticalOperation>): Promise<{ success: boolean; id?: string; error?: string }> =>
      NonRepudiationService.configureCriticalOperation(currentCompany!.id, config),
    onSuccess: (result: { success: boolean; id?: string; error?: string }) => {
      if (result.success) {
        toast.success("Operação crítica configurada");
        queryClient.invalidateQueries({ queryKey: ["critical-operations"] });
      } else {
        toast.error(result.error || "Erro ao configurar operação");
      }
    },
  });
}

// ==================== INTEGRITY VERIFICATION ====================
export function useIntegrityCheck() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (limit?: number): Promise<IntegrityCheck> =>
      NonRepudiationService.verifyIntegrity(currentCompany!.id, limit),
    onSuccess: (result: IntegrityCheck) => {
      if (result.is_valid) {
        toast.success(`Integridade OK - ${result.records_checked} registros verificados`);
      } else {
        toast.error(`Integridade comprometida em ${result.broken_at_timestamp}`);
      }
      queryClient.invalidateQueries({ queryKey: ["integrity-history"] });
    },
  });
}

export function useIntegrityHistory() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["integrity-history", companyId],
    queryFn: () => NonRepudiationService.getIntegrityHistory(companyId!),
    enabled: !!companyId,
  });
}

// ==================== COMPLIANCE REPORTS ====================
export function useComplianceReports(reportType?: string) {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  
  return useQuery({
    queryKey: ["compliance-reports", companyId, reportType],
    queryFn: () => NonRepudiationService.getComplianceReports(companyId!, reportType),
    enabled: !!companyId,
  });
}

export function useGenerateComplianceReport() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      reportType,
      periodStart,
      periodEnd,
    }: {
      reportType: 'LGPD' | 'SOX' | 'BASILEIA' | 'ISO27001';
      periodStart: string;
      periodEnd: string;
    }): Promise<ComplianceReport> =>
      NonRepudiationService.generateComplianceReport(
        currentCompany!.id,
        reportType,
        periodStart,
        periodEnd
      ),
    onSuccess: (report: ComplianceReport) => {
      toast.success(`Relatório ${report.report_type} gerado com sucesso`);
      queryClient.invalidateQueries({ queryKey: ["compliance-reports"] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar relatório: ${error.message}`);
    },
  });
}

// ==================== DIGITAL SIGNATURES ====================
export function useDigitalSignatures(auditLogId?: string) {
  return useQuery({
    queryKey: ["digital-signatures", auditLogId],
    queryFn: () => NonRepudiationService.getSignatures(auditLogId!),
    enabled: !!auditLogId,
  });
}

// ==================== EXPORT ====================
export function useExportAuditTrail() {
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: ({
      startDate,
      endDate,
      format,
    }: {
      startDate: string;
      endDate: string;
      format: 'CSV' | 'JSON' | 'XML';
    }): Promise<string> =>
      NonRepudiationService.exportAuditTrail(
        currentCompany!.id,
        startDate,
        endDate,
        format
      ),
    onSuccess: (data: string, variables) => {
      // Create download
      const blob = new Blob([data], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_trail_${variables.startDate}_${variables.endDate}.${variables.format.toLowerCase()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`Trilha de auditoria exportada em ${variables.format}`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao exportar: ${error.message}`);
    },
  });
}
