import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface Contract {
  id: string;
  company_id: string;
  contract_number: string;
  tipo: 'cliente' | 'fornecedor';
  counterparty_id: string;
  data_inicio: string;
  data_fim: string | null;
  renovacao_automatica: boolean;
  condicoes_comerciais_json: Json;
  alertar_antes_dias: number;
  status: 'rascunho' | 'ativo' | 'suspenso' | 'encerrado' | 'cancelado';
  valor_total: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  counterparty?: {
    name: string;
    document: string;
  };
}

export interface ContractAlert {
  id: string;
  contract_id: string;
  data_alerta: string;
  tipo_alerta: 'vencimento' | 'renovacao' | 'revisao' | 'custom';
  mensagem: string | null;
  enviado: boolean;
  enviado_em: string | null;
  created_at: string;
}

export type ContractInput = Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'counterparty'>;

export function useContracts(filters?: { tipo?: string; status?: string; search?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['contracts', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          counterparty:counterparties(name, document)
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });

      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.ilike('contract_number', `%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useContract(id: string | null) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          counterparty:counterparties(name, document)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Contract;
    },
    enabled: !!id,
  });
}

export function useContractAlerts(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-alerts', contractId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contract_alerts')
        .select('*')
        .eq('contract_id', contractId!)
        .order('data_alerta', { ascending: true });
      if (error) throw error;
      return data as ContractAlert[];
    },
    enabled: !!contractId,
  });
}

export function useCreateContract() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<ContractInput, 'company_id' | 'contract_number'>) => {
      // Generate contract number
      const { data: lastContract } = await supabase
        .from('contracts')
        .select('contract_number')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastContract?.contract_number) {
        const match = lastContract.contract_number.match(/\d+/);
        if (match) nextNumber = parseInt(match[0]) + 1;
      }

      const contract_number = `CTR-${String(nextNumber).padStart(6, '0')}`;

      const { data, error } = await supabase
        .from('contracts')
        .insert([{ 
          ...input, 
          company_id: currentCompany!.id,
          contract_number 
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });
}

export function useUpdateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Contract> & { id: string }) => {
      const { error } = await supabase
        .from('contracts')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      toast.success('Contrato excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useContractsStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['contracts-stats', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select('status, valor_total')
        .eq('company_id', currentCompany!.id);

      if (error) throw error;

      const total = data.length;
      const ativos = data.filter(c => c.status === 'ativo').length;
      const vencendo = data.filter(c => c.status === 'ativo').length; // Simplified
      const valorTotal = data.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0);

      return { total, ativos, vencendo, valorTotal };
    },
    enabled: !!currentCompany?.id,
  });
}
