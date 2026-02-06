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
  status: 'rascunho' | 'ativo' | 'suspenso' | 'encerrado' | 'cancelado' | 'vigente' | 'expirado';
  valor_total: number | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  // New subscription fields
  description?: string;
  billing_cycle?: 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  billing_day?: number;
  monthly_value?: number;
  auto_adjustment?: boolean;
  adjustment_index?: 'IGPM' | 'IPCA' | 'INPC' | 'SELIC' | 'MANUAL';
  next_adjustment_date?: string;
  auto_generate_billing?: boolean;
  next_billing_date?: string;
  last_billing_date?: string;
  cancellation_fee_percentage?: number;
  cancellation_reason?: string;
  cancelled_at?: string;
  suspended_at?: string;
  suspended_reason?: string;
  counterparty?: {
    id?: string;
    name: string;
    document: string;
    email?: string;
    phone?: string;
  };
}

export interface ContractItem {
  id: string;
  contract_id: string;
  product_id?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  is_active: boolean;
  product?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface ContractBilling {
  id: string;
  contract_id: string;
  transaction_id?: string;
  reference_month: number;
  reference_year: number;
  billing_date: string;
  due_date: string;
  amount: number;
  status: 'gerado' | 'faturado' | 'pago' | 'cancelado';
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

export interface ContractStats {
  total: number;
  ativos: number;
  suspensos?: number;
  cancelados?: number;
  vencendo: number;
  mrr?: number;
  arr?: number;
  churnRate?: number;
  valorTotal: number;
}

export type ContractInput = Omit<Contract, 'id' | 'created_at' | 'updated_at' | 'counterparty'>;

// Lista de contratos
export function useContracts(filters?: { tipo?: string; status?: string; search?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['contracts', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('contracts')
        .select(`
          *,
          counterparty:counterparties(id, name, document, email, phone)
        `)
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false });

      if (filters?.tipo) {
        query = query.eq('tipo', filters.tipo);
      }
      if (filters?.status && filters.status !== 'todos') {
        query = query.eq('status', filters.status);
      }
      if (filters?.search) {
        query = query.or(`contract_number.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Contract[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Contrato por ID
export function useContract(id: string | null) {
  return useQuery({
    queryKey: ['contract', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          counterparty:counterparties(id, name, document, email, phone)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Contract;
    },
    enabled: !!id,
  });
}

// Itens do contrato
export function useContractItems(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-items', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      
      const { data, error } = await supabase
        .from('contract_items')
        .select(`
          *,
          product:products(id, name, code)
        `)
        .eq('contract_id', contractId)
        .eq('is_active', true)
        .order('created_at');
      
      if (error) throw error;
      return (data || []) as ContractItem[];
    },
    enabled: !!contractId,
  });
}

// Histórico de faturamentos
export function useContractBillings(contractId: string | null) {
  return useQuery({
    queryKey: ['contract-billings', contractId],
    queryFn: async () => {
      if (!contractId) return [];
      
      const { data, error } = await supabase
        .from('contract_billings')
        .select('*')
        .eq('contract_id', contractId)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });
      
      if (error) throw error;
      return (data || []) as ContractBilling[];
    },
    enabled: !!contractId,
  });
}

// Alertas do contrato
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

// Estatísticas de contratos (MRR, Churn, etc)
export function useContractsStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['contracts-stats', currentCompany?.id],
    queryFn: async (): Promise<ContractStats> => {
      const { data, error } = await supabase
        .from('contracts')
        .select('id, status, valor_total, monthly_value, data_fim, cancelled_at')
        .eq('company_id', currentCompany!.id);

      if (error) throw error;

      const all = data || [];
      const ativos = all.filter(c => c.status === 'ativo');
      const suspensos = all.filter(c => c.status === 'suspenso');
      const cancelados = all.filter(c => c.status === 'cancelado');
      
      // Contratos a vencer nos próximos 30 dias
      const hoje = new Date();
      const trintaDias = new Date();
      trintaDias.setDate(hoje.getDate() + 30);
      
      const vencendo = ativos.filter(c => {
        if (!c.data_fim) return false;
        const dataFim = new Date(c.data_fim);
        return dataFim >= hoje && dataFim <= trintaDias;
      });

      // MRR = soma dos valores mensais dos contratos ativos
      const mrr = ativos.reduce((sum, c) => sum + (Number(c.monthly_value) || Number(c.valor_total) || 0), 0);
      
      // ARR = MRR * 12
      const arr = mrr * 12;

      // Churn Rate = cancelados nos últimos 30 dias / total ativos no início
      const umMesAtras = new Date();
      umMesAtras.setMonth(umMesAtras.getMonth() - 1);
      
      const canceladosRecentes = cancelados.filter(c => {
        if (!c.cancelled_at) return false;
        return new Date(c.cancelled_at) >= umMesAtras;
      });
      
      const churnRate = ativos.length > 0 
        ? (canceladosRecentes.length / (ativos.length + canceladosRecentes.length)) * 100 
        : 0;

      const valorTotal = all.reduce((sum, c) => sum + (Number(c.valor_total) || Number(c.monthly_value) || 0), 0);

      return {
        total: all.length,
        ativos: ativos.length,
        suspensos: suspensos.length,
        cancelados: cancelados.length,
        vencendo: vencendo.length,
        mrr,
        arr,
        churnRate: Math.round(churnRate * 100) / 100,
        valorTotal,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Criar contrato
export function useCreateContract() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<ContractInput, 'company_id' | 'contract_number'> & { items?: Partial<ContractItem>[] }) => {
      const { items, ...contractData } = input;
      
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
          ...contractData, 
          company_id: currentCompany!.id,
          contract_number 
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Criar itens se fornecidos
      if (items && items.length > 0) {
        const itemsToInsert = items.map(item => ({
          contract_id: data.id,
          product_id: item.product_id,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          discount_percentage: item.discount_percentage || 0,
          is_active: true,
        }));
        
        const { error: itemsError } = await supabase
          .from("contract_items")
          .insert(itemsToInsert);
        
        if (itemsError) throw itemsError;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });
}

// Atualizar contrato
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
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Excluir contrato
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
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato excluído!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Suspender contrato
export function useSuspendContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'suspenso',
          suspended_at: new Date().toISOString(),
          suspended_reason: reason,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato suspenso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao suspender: ${error.message}`);
    },
  });
}

// Cancelar contrato
export function useCancelContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'cancelado',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      // Nota: A multa por cancelamento deve ser criada manualmente em Contas a Receber
      // para garantir a seleção correta de conta contábil e carteira
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato cancelado. Se aplicável, crie a multa em Contas a Receber.');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao cancelar: ${error.message}`);
    },
  });
}

// Renovar contrato
export function useRenewContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newEndDate }: { id: string; newEndDate: string }) => {
      const { error } = await supabase
        .from('contracts')
        .update({
          data_fim: newEndDate,
          status: 'ativo',
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato renovado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao renovar: ${error.message}`);
    },
  });
}

// Reativar contrato suspenso
export function useReactivateContract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contracts')
        .update({
          status: 'ativo',
          suspended_at: null,
          suspended_reason: null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Contrato reativado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao reativar: ${error.message}`);
    },
  });
}

// Gerar faturamento do mês
export function useGenerateBilling() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({ month, year }: { month: number; year: number }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      
      // Buscar contratos ativos com geração automática
      const { data: contracts, error: fetchError } = await supabase
        .from('contracts')
        .select('id, contract_number')
        .eq('company_id', currentCompany.id)
        .eq('status', 'ativo')
        .eq('auto_generate_billing', true);
      
      if (fetchError) throw fetchError;
      
      const results = { success: 0, errors: 0, skipped: 0, messages: [] as string[] };
      
      for (const contract of contracts || []) {
        try {
          const { error } = await supabase.rpc('generate_contract_billing', {
            p_contract_id: contract.id,
            p_reference_month: month,
            p_reference_year: year,
          });
          
          if (error) {
            if (error.message.includes('já existe') || error.message.includes('already exists')) {
              results.skipped++;
              results.messages.push(`${contract.contract_number}: já faturado`);
            } else {
              results.errors++;
              results.messages.push(`${contract.contract_number}: ${error.message}`);
            }
          } else {
            results.success++;
          }
        } catch (e) {
          results.errors++;
        }
      }
      
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      queryClient.invalidateQueries({ queryKey: ['contract-billings'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      if (results.success > 0) {
        toast.success(`${results.success} contrato(s) faturado(s) com sucesso`);
      }
      if (results.skipped > 0) {
        toast.info(`${results.skipped} contrato(s) já faturados neste período`);
      }
      if (results.errors > 0) {
        toast.error(`${results.errors} erro(s) no faturamento`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Erro ao gerar faturamento: ${error.message}`);
    },
  });
}

// Adicionar item ao contrato
export function useAddContractItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Partial<ContractItem> & { contract_id: string }) => {
      const { data, error } = await supabase
        .from('contract_items')
        .insert([{
          contract_id: item.contract_id,
          product_id: item.product_id,
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          discount_percentage: item.discount_percentage || 0,
          is_active: true,
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Recalcular monthly_value do contrato
      const { data: items } = await supabase
        .from('contract_items')
        .select('quantity, unit_price, discount_percentage')
        .eq('contract_id', item.contract_id)
        .eq('is_active', true);
      
      const total = (items || []).reduce((sum, i) => {
        return sum + (Number(i.quantity) * Number(i.unit_price) * (1 - (Number(i.discount_percentage) || 0) / 100));
      }, 0);
      
      await supabase
        .from('contracts')
        .update({ monthly_value: total })
        .eq('id', item.contract_id);
      
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-items', variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.contract_id] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Item adicionado');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar item: ${error.message}`);
    },
  });
}

// Remover item do contrato
export function useRemoveContractItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ itemId, contractId }: { itemId: string; contractId: string }) => {
      const { error } = await supabase
        .from('contract_items')
        .update({ is_active: false })
        .eq('id', itemId);
      
      if (error) throw error;
      
      // Recalcular monthly_value
      const { data: items } = await supabase
        .from('contract_items')
        .select('quantity, unit_price, discount_percentage')
        .eq('contract_id', contractId)
        .eq('is_active', true);
      
      const total = (items || []).reduce((sum, i) => {
        return sum + (Number(i.quantity) * Number(i.unit_price) * (1 - (Number(i.discount_percentage) || 0) / 100));
      }, 0);
      
      await supabase
        .from('contracts')
        .update({ monthly_value: total })
        .eq('id', contractId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contract-items', variables.contractId] });
      queryClient.invalidateQueries({ queryKey: ['contract', variables.contractId] });
      queryClient.invalidateQueries({ queryKey: ['contracts-stats'] });
      toast.success('Item removido');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    },
  });
}
