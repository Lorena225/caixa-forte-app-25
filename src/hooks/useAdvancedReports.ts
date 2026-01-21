// =====================================================
// HOOK - ADVANCED REPORTS MODULE
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  REPORT_CATALOG, 
  ReportDefinition, 
  ReportSchedule, 
  ReportExecution,
  ReportCategory,
  ExportFormat,
} from '@/types/advancedReports';

// =====================================================
// REPORT CATALOG - Get all available reports
// =====================================================

export function useReportCatalog() {
  const reports = REPORT_CATALOG.map((r, i) => ({ ...r, id: `sys_${i}` })) as ReportDefinition[];
  
  const byCategory = reports.reduce((acc, report) => {
    if (!acc[report.category]) {
      acc[report.category] = [];
    }
    acc[report.category].push(report);
    return acc;
  }, {} as Record<ReportCategory, ReportDefinition[]>);
  
  return {
    reports,
    byCategory,
    getReport: (code: string) => reports.find(r => r.code === code),
    searchReports: (query: string) => {
      const q = query.toLowerCase();
      return reports.filter(r => 
        r.name.toLowerCase().includes(q) || 
        r.description.toLowerCase().includes(q) ||
        r.category.includes(q)
      );
    },
  };
}

// =====================================================
// REPORT FAVORITES (stub - tables created but types not synced)
// =====================================================

export function useReportFavorites() {
  const { currentCompany, user } = useAuth();
  
  return useQuery({
    queryKey: ['report-favorites', currentCompany?.id, user?.id],
    queryFn: async () => {
      // Types not synced yet - return empty array
      return [] as Array<{ id: string; report_code: string; user_id: string }>;
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useToggleReportFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ reportCode, isFavorite }: { reportCode: string; isFavorite: boolean }) => {
      // Stub until types are synced
      console.log('Toggle favorite:', reportCode, isFavorite);
    },
    onSuccess: (_, { isFavorite }) => {
      queryClient.invalidateQueries({ queryKey: ['report-favorites'] });
      toast.success(isFavorite ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
    },
  });
}

// =====================================================
// REPORT SCHEDULES (stub)
// =====================================================

export function useReportSchedules() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['report-schedules', currentCompany?.id],
    queryFn: async () => [] as ReportSchedule[],
    enabled: !!currentCompany?.id,
  });
}

export function useCreateReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_schedule: Omit<ReportSchedule, 'id' | 'createdAt'>) => {
      return {} as ReportSchedule;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Agendamento criado');
    },
  });
}

export function useDeleteReportSchedule() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_scheduleId: string) => {},
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-schedules'] });
      toast.success('Agendamento removido');
    },
  });
}

// =====================================================
// REPORT EXECUTIONS (stub)
// =====================================================

export function useReportExecutions(_limit = 50) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['report-executions', currentCompany?.id],
    queryFn: async () => [] as ReportExecution[],
    enabled: !!currentCompany?.id,
  });
}

export function useExecuteReport() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      reportCode, 
      reportName, 
      parameters,
      exportFormat = 'excel',
    }: { 
      reportCode: string; 
      reportName: string;
      parameters: Record<string, unknown>;
      exportFormat?: ExportFormat;
    }) => {
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      return {
        id: crypto.randomUUID(),
        reportCode,
        reportName,
        parameters,
        exportFormat,
        status: 'completed' as const,
        createdAt: new Date().toISOString(),
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-executions'] });
      toast.success('Relatório gerado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao gerar relatório');
    },
  });
}

// =====================================================
// REPORT TEMPLATES (stub)
// =====================================================

export function useReportTemplates(_baseReportCode?: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['report-templates', currentCompany?.id],
    queryFn: async () => [],
    enabled: !!currentCompany?.id,
  });
}

export function useSaveReportTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_template: {
      baseReportCode: string;
      name: string;
      description?: string;
    }) => ({}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template salvo');
    },
  });
}

// =====================================================
// REPORT STATISTICS
// =====================================================

export function useReportStats() {
  return useQuery({
    queryKey: ['report-stats'],
    queryFn: async () => ({
      reportsGenerated: 0,
      activeSchedules: 0,
      totalFavorites: 0,
      totalAvailable: REPORT_CATALOG.length,
    }),
  });
}
