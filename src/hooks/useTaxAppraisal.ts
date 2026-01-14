import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ApuracaoImposto {
  id: string;
  company_id: string;
  periodo_mes: number;
  periodo_ano: number;
  tipo_imposto: 'icms' | 'ipi' | 'pis' | 'cofins';
  debitos: number;
  creditos: number;
  saldo_anterior: number;
  saldo_apurado: number | null;
  status: 'em_apuracao' | 'apurado' | 'transmitido';
  data_transmissao: string | null;
  recibo_transmissao: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export const TAX_TYPES = [
  { code: 'icms', name: 'ICMS', color: 'bg-blue-500' },
  { code: 'ipi', name: 'IPI', color: 'bg-purple-500' },
  { code: 'pis', name: 'PIS', color: 'bg-green-500' },
  { code: 'cofins', name: 'COFINS', color: 'bg-orange-500' },
];

export function useApuracoesImpostos(ano?: number, mes?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['apuracoes-impostos', currentCompany?.id, ano, mes],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('apuracoes_impostos')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('periodo_ano', { ascending: false })
        .order('periodo_mes', { ascending: false });
      
      if (ano) query = query.eq('periodo_ano', ano);
      if (mes) query = query.eq('periodo_mes', mes);
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ApuracaoImposto[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useApuracaoResumo(ano: number, mes: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['apuracao-resumo', currentCompany?.id, ano, mes],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('apuracoes_impostos')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('periodo_ano', ano)
        .eq('periodo_mes', mes);
      
      if (error) throw error;
      
      const resumo = {
        icms: data?.find(d => d.tipo_imposto === 'icms'),
        ipi: data?.find(d => d.tipo_imposto === 'ipi'),
        pis: data?.find(d => d.tipo_imposto === 'pis'),
        cofins: data?.find(d => d.tipo_imposto === 'cofins'),
        totalDebitos: data?.reduce((sum, d) => sum + (d.debitos || 0), 0) || 0,
        totalCreditos: data?.reduce((sum, d) => sum + (d.creditos || 0), 0) || 0,
        totalAPagar: data?.reduce((sum, d) => {
          const saldo = (d.debitos || 0) - (d.creditos || 0) + (d.saldo_anterior || 0);
          return sum + (saldo > 0 ? saldo : 0);
        }, 0) || 0,
      };
      
      return resumo;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateApuracao() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<ApuracaoImposto>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const saldoApurado = (data.debitos || 0) - (data.creditos || 0) + (data.saldo_anterior || 0);
      
      const { data: result, error } = await supabase
        .from('apuracoes_impostos')
        .insert({
          ...data,
          company_id: currentCompany.id,
          saldo_apurado: saldoApurado,
          status: 'apurado',
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-impostos'] });
      queryClient.invalidateQueries({ queryKey: ['apuracao-resumo'] });
      toast.success('Apuração criada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar apuração: ' + error.message);
    },
  });
}

export function useUpdateApuracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<ApuracaoImposto> & { id: string }) => {
      const saldoApurado = (data.debitos || 0) - (data.creditos || 0) + (data.saldo_anterior || 0);
      
      const { error } = await supabase
        .from('apuracoes_impostos')
        .update({ ...data, saldo_apurado: saldoApurado })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-impostos'] });
      queryClient.invalidateQueries({ queryKey: ['apuracao-resumo'] });
      toast.success('Apuração atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useTransmitApuracao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, recibo }: { id: string; recibo?: string }) => {
      const { error } = await supabase
        .from('apuracoes_impostos')
        .update({
          status: 'transmitido',
          data_transmissao: new Date().toISOString(),
          recibo_transmissao: recibo || null,
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-impostos'] });
      toast.success('Apuração marcada como transmitida');
    },
    onError: (error: Error) => {
      toast.error('Erro: ' + error.message);
    },
  });
}

export function useCalculateApuracaoAutomatica() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async ({ ano, mes }: { ano: number; mes: number }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Buscar notas fiscais do período para calcular débitos e créditos
      const periodoInicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
      const periodoFim = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
      
      const { data: notas, error: notasError } = await supabase
        .from('notas_fiscais')
        .select('*')
        .eq('empresa_id', currentCompany.id)
        .gte('data_emissao', periodoInicio)
        .lte('data_emissao', periodoFim)
        .eq('situacao', 'autorizada');
      
      if (notasError) throw notasError;
      
      // Calcular débitos (saídas) e créditos (entradas) por imposto
      const calculos: Record<string, { debitos: number; creditos: number }> = {
        icms: { debitos: 0, creditos: 0 },
        ipi: { debitos: 0, creditos: 0 },
        pis: { debitos: 0, creditos: 0 },
        cofins: { debitos: 0, creditos: 0 },
      };
      
      const tipoOperacaoSaida = 'saida';
      
      (notas || []).forEach((nota: any) => {
        if (nota.tipo_operacao === tipoOperacaoSaida) {
          calculos.icms.debitos += nota.valor_icms || 0;
          calculos.ipi.debitos += nota.valor_ipi || 0;
          calculos.pis.debitos += nota.valor_pis || 0;
          calculos.cofins.debitos += nota.valor_cofins || 0;
        } else {
          calculos.icms.creditos += nota.valor_icms || 0;
          calculos.ipi.creditos += nota.valor_ipi || 0;
          calculos.pis.creditos += nota.valor_pis || 0;
          calculos.cofins.creditos += nota.valor_cofins || 0;
        }
      });
      
      // Inserir ou atualizar apurações
      for (const [tipo, valores] of Object.entries(calculos)) {
        const saldoApurado = valores.debitos - valores.creditos;
        
        const { data: existing } = await supabase
          .from('apuracoes_impostos')
          .select('id')
          .eq('company_id', currentCompany.id)
          .eq('periodo_ano', ano)
          .eq('periodo_mes', mes)
          .eq('tipo_imposto', tipo)
          .single();
        
        if (existing) {
          await supabase
            .from('apuracoes_impostos')
            .update({
              debitos: valores.debitos,
              creditos: valores.creditos,
              saldo_apurado: saldoApurado,
              status: 'apurado',
            })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('apuracoes_impostos')
            .insert({
              company_id: currentCompany.id,
              periodo_ano: ano,
              periodo_mes: mes,
              tipo_imposto: tipo,
              debitos: valores.debitos,
              creditos: valores.creditos,
              saldo_anterior: 0,
              saldo_apurado: saldoApurado,
              status: 'apurado',
            } as never);
        }
      }
      
      return calculos;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apuracoes-impostos'] });
      queryClient.invalidateQueries({ queryKey: ['apuracao-resumo'] });
      toast.success('Apuração automática realizada com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro na apuração automática: ' + error.message);
    },
  });
}
