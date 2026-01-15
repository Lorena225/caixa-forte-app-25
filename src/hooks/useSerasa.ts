import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface SerasaConfig {
  id: string;
  company_id: string;
  api_key_encrypted: string | null;
  api_secret_encrypted: string | null;
  environment: 'sandbox' | 'production';
  is_active: boolean;
  auto_negativar_dias: number | null;
  auto_consulta_cnpj: boolean;
  webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SerasaConsulta {
  id: string;
  company_id: string;
  counterparty_id: string | null;
  documento: string;
  tipo_documento: 'cpf' | 'cnpj';
  nome_consultado: string | null;
  score: number | null;
  risco: 'baixo' | 'medio' | 'alto' | 'muito_alto' | null;
  pendencias_financeiras: number;
  protestos: number;
  acoes_judiciais: number;
  cheques_sem_fundo: number;
  participacao_falencias: boolean;
  consulta_json: Record<string, unknown> | null;
  consultado_em: string;
  validade_ate: string | null;
  status: 'pendente' | 'processando' | 'concluida' | 'erro';
  error_message: string | null;
  created_at: string;
}

export interface SerasaNegativacao {
  id: string;
  company_id: string;
  transaction_id: string | null;
  counterparty_id: string | null;
  documento: string;
  tipo_documento: 'cpf' | 'cnpj';
  nome_devedor: string;
  valor_divida: number;
  data_vencimento: string;
  numero_contrato: string | null;
  descricao_divida: string | null;
  protocolo_serasa: string | null;
  status: 'pendente' | 'enviado' | 'negativado' | 'baixado' | 'erro' | 'cancelado';
  negativado_em: string | null;
  baixado_em: string | null;
  motivo_baixa: string | null;
  error_message: string | null;
  response_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ConsultaInsert {
  documento: string;
  tipo_documento: 'cpf' | 'cnpj';
}

export interface NegativacaoInsert {
  documento: string;
  tipo_documento: 'cpf' | 'cnpj';
  nome_devedor: string;
  valor_divida: number;
  data_vencimento: string;
  numero_contrato?: string | null;
  descricao_divida?: string | null;
}

// Hook principal
export function useSerasa() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id;

  // Fetch config
  const configQuery = useQuery({
    queryKey: ['serasa-config', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await (supabase
        .from('serasa_config' as any)
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle() as any);
      
      if (error) throw error;
      return data as SerasaConfig | null;
    },
    enabled: !!companyId,
  });

  // Fetch consultas
  const consultasQuery = useQuery({
    queryKey: ['serasa-consultas', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase
        .from('serasa_consultas' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }) as any);
      
      if (error) throw error;
      return (data || []) as SerasaConsulta[];
    },
    enabled: !!companyId,
  });

  // Fetch negativações
  const negativacoesQuery = useQuery({
    queryKey: ['serasa-negativacoes', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await (supabase
        .from('serasa_negativacoes' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false }) as any);
      
      if (error) throw error;
      return (data || []) as SerasaNegativacao[];
    },
    enabled: !!companyId,
  });

  // Save/update config
  const saveConfigMutation = useMutation({
    mutationFn: async (config: Partial<SerasaConfig>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const { data: existing } = await (supabase
        .from('serasa_config' as any)
        .select('id')
        .eq('company_id', companyId)
        .maybeSingle() as any);

      if (existing) {
        const { error } = await (supabase
          .from('serasa_config' as any)
          .update({ ...config, updated_at: new Date().toISOString() })
          .eq('company_id', companyId) as any);
        if (error) throw error;
      } else {
        const { error } = await (supabase
          .from('serasa_config' as any)
          .insert({ ...config, company_id: companyId }) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-config', companyId] });
      toast.success('Configurações Serasa salvas');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });

  // Create consulta
  const createConsultaMutation = useMutation({
    mutationFn: async (consulta: ConsultaInsert) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const { data, error } = await (supabase
        .from('serasa_consultas' as any)
        .insert({ 
          ...consulta, 
          company_id: companyId,
          status: 'pendente',
          pendencias_financeiras: 0,
          protestos: 0,
          acoes_judiciais: 0,
          cheques_sem_fundo: 0,
          participacao_falencias: false,
        })
        .select()
        .single() as any);
      
      if (error) throw error;
      return data as SerasaConsulta;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-consultas', companyId] });
      toast.success('Consulta Serasa criada');
    },
    onError: (error) => {
      toast.error(`Erro ao criar consulta: ${error.message}`);
    },
  });

  // Create negativação
  const createNegativacaoMutation = useMutation({
    mutationFn: async (neg: NegativacaoInsert) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const { data, error } = await (supabase
        .from('serasa_negativacoes' as any)
        .insert({ 
          ...neg, 
          company_id: companyId,
          status: 'pendente',
        })
        .select()
        .single() as any);
      
      if (error) throw error;
      return data as SerasaNegativacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-negativacoes', companyId] });
      toast.success('Negativação registrada');
    },
    onError: (error) => {
      toast.error(`Erro ao registrar negativação: ${error.message}`);
    },
  });

  // Update negativação status
  const updateNegativacaoMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SerasaNegativacao> & { id: string }) => {
      const { error } = await (supabase
        .from('serasa_negativacoes' as any)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-negativacoes', companyId] });
      toast.success('Negativação atualizada');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar: ${error.message}`);
    },
  });

  // Baixar negativação
  const baixarNegativacaoMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: string; motivo: string }) => {
      const { error } = await (supabase
        .from('serasa_negativacoes' as any)
        .update({
          status: 'baixado',
          baixado_em: new Date().toISOString(),
          motivo_baixa: motivo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-negativacoes', companyId] });
      toast.success('Negativação baixada com sucesso');
    },
    onError: (error) => {
      toast.error(`Erro ao baixar negativação: ${error.message}`);
    },
  });

  // Cancel negativação
  const cancelNegativacaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('serasa_negativacoes' as any)
        .update({
          status: 'cancelado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-negativacoes', companyId] });
      toast.success('Negativação cancelada');
    },
    onError: (error) => {
      toast.error(`Erro ao cancelar: ${error.message}`);
    },
  });

  // Delete consulta
  const deleteConsultaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('serasa_consultas' as any)
        .delete()
        .eq('id', id) as any);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serasa-consultas', companyId] });
      toast.success('Consulta removida');
    },
  });

  return {
    // Config
    config: configQuery.data,
    configLoading: configQuery.isLoading,
    saveConfig: saveConfigMutation.mutate,
    savingConfig: saveConfigMutation.isPending,

    // Consultas
    consultas: consultasQuery.data || [],
    consultasLoading: consultasQuery.isLoading,
    createConsulta: createConsultaMutation.mutate,
    creatingConsulta: createConsultaMutation.isPending,
    deleteConsulta: deleteConsultaMutation.mutate,

    // Negativações
    negativacoes: negativacoesQuery.data || [],
    negativacoesLoading: negativacoesQuery.isLoading,
    createNegativacao: createNegativacaoMutation.mutate,
    creatingNegativacao: createNegativacaoMutation.isPending,
    updateNegativacao: updateNegativacaoMutation.mutate,
    baixarNegativacao: baixarNegativacaoMutation.mutate,
    cancelNegativacao: cancelNegativacaoMutation.mutate,
  };
}
