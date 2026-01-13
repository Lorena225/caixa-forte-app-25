import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type SettlementType = 'PAGAMENTO' | 'RECEBIMENTO' | 'CANCELAMENTO' | 'ABATIMENTO' | 'LUCRO_PERDA' | 'COMPENSACAO';
export type SettlementOrigin = 'MANUAL' | 'CNAB' | 'CSV' | 'BORDERO' | 'IMPORTACAO' | 'COMPENSACAO';
export type SettlementStatus = 'RASCUNHO' | 'PROCESSADO' | 'CANCELADO';
export type TitleType = 'PAGAR' | 'RECEBER';
export type MatchStatus = 'OK' | 'NOT_FOUND' | 'VALUE_MISMATCH' | 'ALREADY_SETTLED' | 'AMBIGUOUS';

export interface SettlementItem {
  transaction_id: string;
  amount_settled: number;
  interest?: number;
  penalty?: number;
  discount?: number;
  fx_difference?: number;
}

export interface CreateSettlementParams {
  settlement_type: SettlementType;
  origin: SettlementOrigin;
  title_type: TitleType;
  settlement_date: string;
  bank_account_id?: string;
  notes?: string;
  items: SettlementItem[];
  source_file_id?: string;
}

export interface OpenTitle {
  id: string;
  description: string;
  counterparty_name: string | null;
  document_number: string | null;
  due_date: string;
  original_amount: number;
  balance_amount: number;
  status: string;
  direction: 'entrada' | 'saida';
}

export interface Settlement {
  id: string;
  company_id: string;
  settlement_type: string;
  origin: string;
  title_type: string;
  settlement_date: string;
  bank_account_id: string | null;
  user_id: string;
  notes: string | null;
  status: string;
  is_reversal: boolean;
  created_at: string;
}

export interface SettlementHistory {
  id: string;
  settlement_id: string;
  transaction_id: string;
  settlement_type: string;
  origin: string;
  settlement_date: string;
  settlement_status: string;
  is_reversal: boolean;
  notes: string | null;
  amount_settled: number;
  interest: number;
  penalty: number;
  discount: number;
  fx_difference: number;
  previous_balance: number;
  new_balance: number;
  created_at: string;
}

// Hook para buscar títulos em aberto
export function useOpenTitles(filters?: {
  title_type?: TitleType;
  counterparty_id?: string;
  due_date_from?: string;
  due_date_to?: string;
  bank_account_id?: string;
}) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['open-titles', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('transactions')
        .select(`
          id,
          description,
          document_number,
          due_date,
          original_amount,
          balance_amount,
          total_amount,
          status,
          direction,
          counterparties:counterparty_id (name)
        `)
        .eq('company_id', currentCompany.id)
        .in('status', ['lancado', 'rascunho'])
        .gt('balance_amount', 0)
        .order('due_date', { ascending: true });

      if (filters?.title_type === 'PAGAR') {
        query = query.eq('direction', 'saida');
      } else if (filters?.title_type === 'RECEBER') {
        query = query.eq('direction', 'entrada');
      }

      if (filters?.counterparty_id) {
        query = query.eq('counterparty_id', filters.counterparty_id);
      }

      if (filters?.due_date_from) {
        query = query.gte('due_date', filters.due_date_from);
      }

      if (filters?.due_date_to) {
        query = query.lte('due_date', filters.due_date_to);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((t: any) => ({
        id: t.id,
        description: t.description,
        counterparty_name: t.counterparties?.name || null,
        document_number: t.document_number,
        due_date: t.due_date,
        original_amount: Number(t.original_amount),
        balance_amount: Number(t.balance_amount || t.total_amount),
        status: t.status,
        direction: t.direction,
      })) as OpenTitle[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para listar baixas
export function useSettlements(filters?: {
  title_type?: TitleType;
  date_from?: string;
  date_to?: string;
  status?: SettlementStatus;
}) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['settlements', currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from('settlements')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('settlement_date', { ascending: false });

      if (filters?.title_type) {
        query = query.eq('title_type', filters.title_type);
      }

      if (filters?.date_from) {
        query = query.gte('settlement_date', filters.date_from);
      }

      if (filters?.date_to) {
        query = query.lte('settlement_date', filters.date_to);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as Settlement[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para histórico de baixas por transação
export function useSettlementHistory(transactionId: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['settlement-history', currentCompany?.id, transactionId],
    queryFn: async () => {
      if (!currentCompany?.id || !transactionId) return [];

      const { data, error } = await supabase
        .from('v_settlement_history')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('transaction_id', transactionId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data as SettlementHistory[];
    },
    enabled: !!currentCompany?.id && !!transactionId,
  });
}

// Hook para processar baixa
export function useProcessSettlement() {
  const { currentCompany, user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: CreateSettlementParams) => {
      if (!currentCompany?.id || !user?.id) {
        throw new Error('Empresa ou usuário não identificado');
      }

      const { data, error } = await supabase.rpc('process_settlement', {
        p_company_id: currentCompany.id,
        p_settlement_type: params.settlement_type,
        p_origin: params.origin,
        p_title_type: params.title_type,
        p_settlement_date: params.settlement_date,
        p_bank_account_id: params.bank_account_id || null,
        p_user_id: user.id,
        p_notes: params.notes || null,
        p_items: JSON.parse(JSON.stringify(params.items)),
        p_source_file_id: params.source_file_id || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['open-titles'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      toast({ title: 'Baixa processada com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao processar baixa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Hook para estornar baixa
export function useReverseSettlement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ settlementId, notes }: { settlementId: string; notes?: string }) => {
      if (!user?.id) {
        throw new Error('Usuário não identificado');
      }

      const { data, error } = await supabase.rpc('reverse_settlement', {
        p_settlement_id: settlementId,
        p_user_id: user.id,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['open-titles'] });
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      queryClient.invalidateQueries({ queryKey: ['settlement-history'] });
      toast({ title: 'Estorno processado com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao estornar baixa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

// Constantes para labels
export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  PAGAMENTO: 'Pagamento',
  RECEBIMENTO: 'Recebimento',
  CANCELAMENTO: 'Cancelamento',
  ABATIMENTO: 'Abatimento',
  LUCRO_PERDA: 'Lucro/Perda',
  COMPENSACAO: 'Compensação',
};

export const SETTLEMENT_ORIGIN_LABELS: Record<SettlementOrigin, string> = {
  MANUAL: 'Manual',
  CNAB: 'CNAB Retorno',
  CSV: 'Arquivo CSV',
  BORDERO: 'Borderô',
  IMPORTACAO: 'Importação',
  COMPENSACAO: 'Compensação',
};

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  OK: 'Encontrado',
  NOT_FOUND: 'Não encontrado',
  VALUE_MISMATCH: 'Valor divergente',
  ALREADY_SETTLED: 'Já baixado',
  AMBIGUOUS: 'Ambíguo',
};
