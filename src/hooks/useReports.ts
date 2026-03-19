// =====================================================
// REPORTS HOOKS - React Query hooks for report management
// =====================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ReportEngine } from '@/services/reportEngine';
import {
  ReportTemplate,
  ReportGenerated,
  ReportData,
  ReportPeriod,
  ReportType,
  ExportFormat,
} from '@/types/reports';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

// =====================================================
// HELPERS
// =====================================================

function parseJsonField<T>(json: Json | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return json as unknown as T;
  } catch {
    return fallback;
  }
}

async function getCompanyId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!profile?.company_id) throw new Error('Empresa não encontrada');
  return profile.company_id;
}

// =====================================================
// TEMPLATES HOOKS
// =====================================================

export function useReportTemplates() {
  return useQuery({
    queryKey: ['report-templates'],
    queryFn: async () => {
      const companyId = await getCompanyId();
      
      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .or(`company_id.eq.${companyId},is_public.eq.true`)
        .order('name');

      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        config: parseJsonField(item.config, { columns: [], filters: [] }),
        columns_config: parseJsonField(item.columns_config, []),
        filters_config: parseJsonField(item.filters_config, {}),
        grouping_config: parseJsonField(item.grouping_config, {}),
      })) as ReportTemplate[];
    },
  });
}

export function useReportTemplate(templateId: string | null) {
  return useQuery({
    queryKey: ['report-template', templateId],
    queryFn: async () => {
      if (!templateId) return null;

      const { data, error } = await supabase
        .from('report_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        config: parseJsonField(data.config, { columns: [], filters: [] }),
        columns_config: parseJsonField(data.columns_config, []),
        filters_config: parseJsonField(data.filters_config, {}),
        grouping_config: parseJsonField(data.grouping_config, {}),
      } as ReportTemplate;
    },
    enabled: !!templateId,
  });
}

export function useCreateReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (template: Partial<ReportTemplate>) => {
      const companyId = await getCompanyId();
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from('report_templates')
        .insert({
          name: template.name || 'Novo Template',
          type: template.type || 'custom',
          description: template.description,
          company_id: companyId,
          created_by: user?.id,
          is_public: template.is_public || false,
          is_favorite: template.is_favorite || false,
          config: JSON.parse(JSON.stringify(template.config || { columns: [], filters: [] })),
          columns_config: JSON.parse(JSON.stringify(template.columns_config || [])),
          filters_config: JSON.parse(JSON.stringify(template.filters_config || {})),
          grouping_config: JSON.parse(JSON.stringify(template.grouping_config || {})),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar template'),
  });
}

export function useDeleteReportTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.from('report_templates').delete().eq('id', templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      toast.success('Template excluído');
    },
    onError: () => toast.error('Erro ao excluir template'),
  });
}

// =====================================================
// REPORT GENERATION HOOKS
// =====================================================

interface GenerateReportParams {
  type: ReportType;
  periodo: ReportPeriod;
  templateId?: string;
  options?: Record<string, unknown>;
}

export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, periodo, templateId, options = {} }: GenerateReportParams): Promise<ReportData> => {
      const companyId = await getCompanyId();
      const startTime = Date.now();

      let reportData: ReportData;

      switch (type) {
        case 'dre':
          reportData = await ReportEngine.generateDRE(companyId, periodo, options);
          break;
        case 'fluxo_caixa':
          reportData = await ReportEngine.generateFluxoCaixa(companyId, periodo, options);
          break;
        case 'orcamento_realizado':
          reportData = await ReportEngine.generateOrcamentoRealizado(companyId, periodo, options);
          break;
        case 'aging':
          reportData = await ReportEngine.generateAging(companyId, 'receivable', { ...options, asOfDate: periodo.fim });
          break;
        default:
          throw new Error(`Tipo de relatório não suportado: ${type}`);
      }

      // Get company name
      const { data: company } = await supabase
        .from('companies')
        .select('name')
        .eq('id', companyId)
        .single();

      if (company) {
        reportData.metadata.companyName = company.name || '';
      }

      // Save generated report
      const { data: { user } } = await supabase.auth.getUser();
      const generationTime = Date.now() - startTime;

      await supabase.from('reports_generated').insert({
        company_id: companyId,
        template_id: templateId || null,
        report_type: type,
        report_name: reportData.metadata.reportName,
        periodo_inicio: periodo.inicio,
        periodo_fim: periodo.fim,
        data: JSON.parse(JSON.stringify(reportData)),
        summary: JSON.parse(JSON.stringify(reportData.summary)),
        row_count: reportData.rows.length,
        file_size_bytes: new Blob([JSON.stringify(reportData)]).size,
        generation_time_ms: generationTime,
        generated_by: user?.id,
      });

      return reportData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report-history'] });
      toast.success('Relatório gerado com sucesso');
    },
    onError: () => toast.error('Erro ao gerar relatório'),
  });
}

// =====================================================
// REPORT HISTORY HOOKS
// =====================================================

export function useReportHistory(templateId?: string, limit = 20) {
  return useQuery({
    queryKey: ['report-history', templateId],
    queryFn: async () => {
      const companyId = await getCompanyId();

      let query = supabase
        .from('reports_generated')
        .select('*')
        .eq('company_id', companyId)
        .order('generated_at', { ascending: false })
        .limit(limit);

      if (templateId) {
        query = query.eq('template_id', templateId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map(item => ({
        ...item,
        data: parseJsonField(item.data, { metadata: {}, columns: [], rows: [], summary: {} }),
        summary: parseJsonField(item.summary, {}),
        metadata: parseJsonField(item.metadata, {}),
      })) as ReportGenerated[];
    },
  });
}

// =====================================================
// EXPORT HOOKS
// =====================================================

export function useExportReport() {
  return useMutation({
    mutationFn: async ({ reportData, format }: { reportData: ReportData; format: ExportFormat }) => {
      const result = await ReportEngine.exportReport(reportData, format);
      
      const url = URL.createObjectURL(result.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return result;
    },
    onSuccess: (_, { format }) => toast.success(`Relatório exportado como ${format.toUpperCase()}`),
    onError: () => toast.error('Erro ao exportar relatório'),
  });
}

// =====================================================
// COMBINED HOOK
// =====================================================

export function useReports(options: { templateId?: string; historyLimit?: number } = {}) {
  const templatesQuery = useReportTemplates();
  const templateQuery = useReportTemplate(options.templateId || null);
  const historyQuery = useReportHistory(options.templateId, options.historyLimit);

  const generateReport = useGenerateReport();
  const exportReport = useExportReport();
  const createTemplate = useCreateReportTemplate();
  const deleteTemplate = useDeleteReportTemplate();

  return {
    templates: templatesQuery.data || [],
    template: templateQuery.data,
    history: historyQuery.data || [],
    isLoadingTemplates: templatesQuery.isLoading,
    isGenerating: generateReport.isPending,
    isExporting: exportReport.isPending,
    generateReport,
    exportReport,
    createTemplate,
    deleteTemplate,
    refetchTemplates: templatesQuery.refetch,
    refetchHistory: historyQuery.refetch,
  };
}
