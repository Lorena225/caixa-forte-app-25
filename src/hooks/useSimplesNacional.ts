import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SimplesNacionalDAS {
  id: string;
  company_id: string;
  periodo_mes: number;
  periodo_ano: number;
  receita_bruta_mes: number;
  receita_bruta_12_meses: number;
  anexo: 'I' | 'II' | 'III' | 'IV' | 'V';
  faixa: number | null;
  aliquota_nominal: number | null;
  parcela_deduzir: number | null;
  aliquota_efetiva: number | null;
  valor_devido: number | null;
  valor_pago: number;
  data_vencimento: string;
  data_pagamento: string | null;
  codigo_barras: string | null;
  numero_das: string | null;
  status: 'aberto' | 'pago' | 'atrasado';
  created_at: string;
  updated_at: string;
}

// Tabelas do Simples Nacional 2024
export const TABELAS_SIMPLES = {
  I: [ // Comércio
    { faixa: 1, ate: 180000, aliquota: 4.0, deduzir: 0 },
    { faixa: 2, ate: 360000, aliquota: 7.3, deduzir: 5940 },
    { faixa: 3, ate: 720000, aliquota: 9.5, deduzir: 13860 },
    { faixa: 4, ate: 1800000, aliquota: 10.7, deduzir: 22500 },
    { faixa: 5, ate: 3600000, aliquota: 14.3, deduzir: 87300 },
    { faixa: 6, ate: 4800000, aliquota: 19.0, deduzir: 378000 },
  ],
  II: [ // Indústria
    { faixa: 1, ate: 180000, aliquota: 4.5, deduzir: 0 },
    { faixa: 2, ate: 360000, aliquota: 7.8, deduzir: 5940 },
    { faixa: 3, ate: 720000, aliquota: 10.0, deduzir: 13860 },
    { faixa: 4, ate: 1800000, aliquota: 11.2, deduzir: 22500 },
    { faixa: 5, ate: 3600000, aliquota: 14.7, deduzir: 85500 },
    { faixa: 6, ate: 4800000, aliquota: 30.0, deduzir: 720000 },
  ],
  III: [ // Serviços
    { faixa: 1, ate: 180000, aliquota: 6.0, deduzir: 0 },
    { faixa: 2, ate: 360000, aliquota: 11.2, deduzir: 9360 },
    { faixa: 3, ate: 720000, aliquota: 13.5, deduzir: 17640 },
    { faixa: 4, ate: 1800000, aliquota: 16.0, deduzir: 35640 },
    { faixa: 5, ate: 3600000, aliquota: 21.0, deduzir: 125640 },
    { faixa: 6, ate: 4800000, aliquota: 33.0, deduzir: 648000 },
  ],
  IV: [ // Serviços especiais
    { faixa: 1, ate: 180000, aliquota: 4.5, deduzir: 0 },
    { faixa: 2, ate: 360000, aliquota: 9.0, deduzir: 8100 },
    { faixa: 3, ate: 720000, aliquota: 10.2, deduzir: 12420 },
    { faixa: 4, ate: 1800000, aliquota: 14.0, deduzir: 39780 },
    { faixa: 5, ate: 3600000, aliquota: 22.0, deduzir: 183780 },
    { faixa: 6, ate: 4800000, aliquota: 33.0, deduzir: 828000 },
  ],
  V: [ // Serviços profissionais
    { faixa: 1, ate: 180000, aliquota: 15.5, deduzir: 0 },
    { faixa: 2, ate: 360000, aliquota: 18.0, deduzir: 4500 },
    { faixa: 3, ate: 720000, aliquota: 19.5, deduzir: 9900 },
    { faixa: 4, ate: 1800000, aliquota: 20.5, deduzir: 17100 },
    { faixa: 5, ate: 3600000, aliquota: 23.0, deduzir: 62100 },
    { faixa: 6, ate: 4800000, aliquota: 30.5, deduzir: 540000 },
  ],
};

export function calcularDAS(
  receitaBrutaMes: number,
  receitaBruta12Meses: number,
  anexo: keyof typeof TABELAS_SIMPLES
) {
  const tabela = TABELAS_SIMPLES[anexo];
  
  // Encontrar a faixa
  const faixaEncontrada = tabela.find(f => receitaBruta12Meses <= f.ate);
  
  if (!faixaEncontrada) {
    throw new Error('Receita bruta excede o limite do Simples Nacional');
  }
  
  // Calcular alíquota efetiva
  const aliquotaEfetiva = 
    ((receitaBruta12Meses * faixaEncontrada.aliquota / 100) - faixaEncontrada.deduzir) / receitaBruta12Meses * 100;
  
  // Calcular valor devido
  const valorDevido = receitaBrutaMes * (aliquotaEfetiva / 100);
  
  return {
    faixa: faixaEncontrada.faixa,
    aliquotaNominal: faixaEncontrada.aliquota,
    parcelaDeduzir: faixaEncontrada.deduzir,
    aliquotaEfetiva: Math.max(0, aliquotaEfetiva),
    valorDevido: Math.max(0, valorDevido),
  };
}

export function useSimplesNacionalDAS(ano?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['simples-nacional-das', currentCompany?.id, ano],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('simples_nacional_das')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('periodo_ano', { ascending: false })
        .order('periodo_mes', { ascending: false });
      
      if (ano) {
        query = query.eq('periodo_ano', ano);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as SimplesNacionalDAS[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSimplesNacionalResumo(ano: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['simples-nacional-resumo', currentCompany?.id, ano],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('simples_nacional_das')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('periodo_ano', ano);
      
      if (error) throw error;
      
      const resumo = {
        totalReceitaAno: data?.reduce((sum, d) => sum + (d.receita_bruta_mes || 0), 0) || 0,
        totalDevido: data?.reduce((sum, d) => sum + (d.valor_devido || 0), 0) || 0,
        totalPago: data?.reduce((sum, d) => sum + (d.valor_pago || 0), 0) || 0,
        totalAberto: 0,
        mesesApurados: data?.length || 0,
        abertos: data?.filter(d => d.status === 'aberto').length || 0,
        atrasados: data?.filter(d => d.status === 'atrasado').length || 0,
      };
      
      resumo.totalAberto = resumo.totalDevido - resumo.totalPago;
      
      return resumo;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateDAS() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: {
      periodo_mes: number;
      periodo_ano: number;
      receita_bruta_mes: number;
      receita_bruta_12_meses: number;
      anexo: keyof typeof TABELAS_SIMPLES;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Calcular DAS
      const calculo = calcularDAS(
        data.receita_bruta_mes,
        data.receita_bruta_12_meses,
        data.anexo
      );
      
      // Data de vencimento: dia 20 do mês seguinte
      const mesVencimento = data.periodo_mes === 12 ? 1 : data.periodo_mes + 1;
      const anoVencimento = data.periodo_mes === 12 ? data.periodo_ano + 1 : data.periodo_ano;
      const dataVencimento = new Date(anoVencimento, mesVencimento - 1, 20);
      
      // Ajustar para dia útil
      if (dataVencimento.getDay() === 0) dataVencimento.setDate(dataVencimento.getDate() + 1);
      if (dataVencimento.getDay() === 6) dataVencimento.setDate(dataVencimento.getDate() + 2);
      
      const { data: result, error } = await supabase
        .from('simples_nacional_das')
        .insert({
          company_id: currentCompany.id,
          ...data,
          faixa: calculo.faixa,
          aliquota_nominal: calculo.aliquotaNominal,
          parcela_deduzir: calculo.parcelaDeduzir,
          aliquota_efetiva: calculo.aliquotaEfetiva,
          valor_devido: calculo.valorDevido,
          valor_pago: 0,
          data_vencimento: dataVencimento.toISOString().split('T')[0],
          status: 'aberto',
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simples-nacional-das'] });
      queryClient.invalidateQueries({ queryKey: ['simples-nacional-resumo'] });
      toast.success('DAS calculado e gerado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar DAS: ' + error.message);
    },
  });
}

export function usePayDAS() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, valorPago, dataPagamento }: {
      id: string;
      valorPago: number;
      dataPagamento: string;
    }) => {
      const { error } = await supabase
        .from('simples_nacional_das')
        .update({
          valor_pago: valorPago,
          data_pagamento: dataPagamento,
          status: 'pago',
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simples-nacional-das'] });
      queryClient.invalidateQueries({ queryKey: ['simples-nacional-resumo'] });
      toast.success('Pagamento registrado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao registrar pagamento: ' + error.message);
    },
  });
}

export function useGenerateCodigoBarrasDAS() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      // Simulação de geração de código de barras
      // Na prática, isso seria integrado com a API do PGDAS-D
      const codigoBarras = `85890${Date.now()}${Math.random().toString().slice(2, 10)}`;
      const numeroDAS = `DAS${new Date().getFullYear()}${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
      
      const { error } = await supabase
        .from('simples_nacional_das')
        .update({
          codigo_barras: codigoBarras,
          numero_das: numeroDAS,
        })
        .eq('id', id);
      
      if (error) throw error;
      
      return { codigoBarras, numeroDAS };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simples-nacional-das'] });
      toast.success('Código de barras gerado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar código: ' + error.message);
    },
  });
}
