import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ObrigacaoFiscal {
  id: string;
  company_id: string;
  nome: string;
  codigo: string | null;
  tipo: 'mensal' | 'trimestral' | 'anual' | 'eventual';
  orgao: string;
  prazo_dia: number | null;
  prazo_regra: string | null;
  descricao: string | null;
  multa_atraso: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CalendarioObrigacao {
  id: string;
  company_id: string;
  obrigacao_id: string;
  periodo_referencia: string;
  data_vencimento: string;
  status: 'pendente' | 'em_andamento' | 'cumprida' | 'atrasada';
  responsavel_id: string | null;
  observacoes: string | null;
  arquivo_comprovante: string | null;
  data_cumprimento: string | null;
  created_at: string;
  updated_at: string;
  obrigacoes_fiscais?: ObrigacaoFiscal;
}

export const OBRIGACOES_PADRAO = [
  { nome: 'SPED Fiscal', codigo: 'EFD-ICMS/IPI', tipo: 'mensal', orgao: 'Receita Federal', prazo_dia: 25 },
  { nome: 'SPED Contribuições', codigo: 'EFD-Contrib', tipo: 'mensal', orgao: 'Receita Federal', prazo_dia: 15 },
  { nome: 'DCTF', codigo: 'DCTF', tipo: 'mensal', orgao: 'Receita Federal', prazo_dia: 15 },
  { nome: 'GIA', codigo: 'GIA', tipo: 'mensal', orgao: 'SEFAZ', prazo_dia: 15 },
  { nome: 'DAS Simples Nacional', codigo: 'PGDAS-D', tipo: 'mensal', orgao: 'Receita Federal', prazo_dia: 20 },
  { nome: 'DIRF', codigo: 'DIRF', tipo: 'anual', orgao: 'Receita Federal', prazo_dia: 28 },
  { nome: 'ECF', codigo: 'ECF', tipo: 'anual', orgao: 'Receita Federal', prazo_dia: 31 },
];

export function useObrigacoesFiscais(isActive?: boolean) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['obrigacoes-fiscais', currentCompany?.id, isActive],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('obrigacoes_fiscais')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('nome');
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ObrigacaoFiscal[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCalendarioObrigacoes(ano: number, mes?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['calendario-obrigacoes', currentCompany?.id, ano, mes],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('calendario_obrigacoes')
        .select('*, obrigacoes_fiscais(*)')
        .eq('company_id', currentCompany.id)
        .gte('data_vencimento', `${ano}-01-01`)
        .lte('data_vencimento', `${ano}-12-31`)
        .order('data_vencimento');
      
      if (mes) {
        query = query
          .gte('data_vencimento', `${ano}-${String(mes).padStart(2, '0')}-01`)
          .lte('data_vencimento', `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as CalendarioObrigacao[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useProximasObrigacoes(dias: number = 30) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['proximas-obrigacoes', currentCompany?.id, dias],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const hoje = new Date().toISOString().split('T')[0];
      const limite = new Date();
      limite.setDate(limite.getDate() + dias);
      
      const { data, error } = await supabase
        .from('calendario_obrigacoes')
        .select('*, obrigacoes_fiscais(*)')
        .eq('company_id', currentCompany.id)
        .gte('data_vencimento', hoje)
        .lte('data_vencimento', limite.toISOString().split('T')[0])
        .in('status', ['pendente', 'em_andamento'])
        .order('data_vencimento');
      
      if (error) throw error;
      return data as CalendarioObrigacao[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useObrigacoesAtrasadas() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['obrigacoes-atrasadas', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const hoje = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('calendario_obrigacoes')
        .select('*, obrigacoes_fiscais(*)')
        .eq('company_id', currentCompany.id)
        .lt('data_vencimento', hoje)
        .in('status', ['pendente', 'em_andamento'])
        .order('data_vencimento');
      
      if (error) throw error;
      return data as CalendarioObrigacao[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateObrigacaoFiscal() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<ObrigacaoFiscal>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('obrigacoes_fiscais')
        .insert({
          ...data,
          company_id: currentCompany.id,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['obrigacoes-fiscais'] });
      toast.success('Obrigação fiscal criada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar obrigação: ' + error.message);
    },
  });
}

export function useCreateCalendarioObrigacao() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<CalendarioObrigacao>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('calendario_obrigacoes')
        .insert({
          ...data,
          company_id: currentCompany.id,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario-obrigacoes'] });
      queryClient.invalidateQueries({ queryKey: ['proximas-obrigacoes'] });
      toast.success('Agenda criada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar agenda: ' + error.message);
    },
  });
}

export function useUpdateCalendarioStatus() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      id,
      status,
      observacoes,
      arquivoComprovante,
    }: {
      id: string;
      status: CalendarioObrigacao['status'];
      observacoes?: string;
      arquivoComprovante?: string;
    }) => {
      const updateData: any = { status };
      
      if (status === 'cumprida') {
        updateData.data_cumprimento = new Date().toISOString();
      }
      if (observacoes !== undefined) {
        updateData.observacoes = observacoes;
      }
      if (arquivoComprovante !== undefined) {
        updateData.arquivo_comprovante = arquivoComprovante;
      }
      
      const { error } = await supabase
        .from('calendario_obrigacoes')
        .update(updateData)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendario-obrigacoes'] });
      queryClient.invalidateQueries({ queryKey: ['proximas-obrigacoes'] });
      queryClient.invalidateQueries({ queryKey: ['obrigacoes-atrasadas'] });
      toast.success('Status atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useGerarCalendarioAnual() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (ano: number) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Buscar obrigações ativas
      const { data: obrigacoes, error: obrigError } = await supabase
        .from('obrigacoes_fiscais')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true);
      
      if (obrigError) throw obrigError;
      
      const calendarioEntries: any[] = [];
      
      (obrigacoes || []).forEach(obrigacao => {
        const meses = obrigacao.tipo === 'mensal' ? 12 : 
                      obrigacao.tipo === 'trimestral' ? 4 : 1;
        
        for (let i = 1; i <= meses; i++) {
          const mes = obrigacao.tipo === 'mensal' ? i : 
                      obrigacao.tipo === 'trimestral' ? i * 3 : 12;
          
          const diaVencimento = obrigacao.prazo_dia || 15;
          const dataVencimento = new Date(ano, mes - 1, diaVencimento);
          
          // Ajustar para dia útil se cair em fim de semana
          if (dataVencimento.getDay() === 0) dataVencimento.setDate(dataVencimento.getDate() + 1);
          if (dataVencimento.getDay() === 6) dataVencimento.setDate(dataVencimento.getDate() + 2);
          
          const periodoRef = obrigacao.tipo === 'mensal' 
            ? `${ano}-${String(mes).padStart(2, '0')}-01`
            : `${ano}-01-01`;
          
          calendarioEntries.push({
            company_id: currentCompany.id,
            obrigacao_id: obrigacao.id,
            periodo_referencia: periodoRef,
            data_vencimento: dataVencimento.toISOString().split('T')[0],
            status: 'pendente',
          });
        }
      });
      
      if (calendarioEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('calendario_obrigacoes')
          .insert(calendarioEntries as never[]);
        
        if (insertError) throw insertError;
      }
      
      return calendarioEntries.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['calendario-obrigacoes'] });
      queryClient.invalidateQueries({ queryKey: ['proximas-obrigacoes'] });
      toast.success(`${count} datas geradas no calendário fiscal`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar calendário: ' + error.message);
    },
  });
}
