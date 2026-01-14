import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TABELAS_SIMPLES, calcularDAS } from './useSimplesNacional';

export interface AnaliseTributaria {
  id: string;
  company_id: string;
  periodo_mes: number;
  periodo_ano: number;
  receita_bruta: number;
  custos_dedutiveis: number;
  folha_pagamento: number;
  lucro_estimado: number | null;
  simples_aliquota: number | null;
  simples_valor: number | null;
  presumido_irpj: number | null;
  presumido_csll: number | null;
  presumido_pis: number | null;
  presumido_cofins: number | null;
  presumido_total: number | null;
  real_irpj: number | null;
  real_csll: number | null;
  real_pis: number | null;
  real_cofins: number | null;
  real_total: number | null;
  regime_recomendado: string | null;
  economia_potencial: number | null;
  observacoes: string | null;
  created_at: string;
}

// Alíquotas para cálculo
const ALIQUOTAS = {
  presumido: {
    irpj: {
      base_servicos: 32, // 32% da receita
      base_comercio: 8, // 8% da receita
      aliquota: 15, // 15% sobre a base
      adicional_limite: 60000, // R$ 60.000/trimestre = R$ 20.000/mês
      adicional_aliquota: 10,
    },
    csll: {
      base_servicos: 32,
      base_comercio: 12,
      aliquota: 9,
    },
    pis: 0.65,
    cofins: 3,
  },
  real: {
    irpj: 15,
    irpj_adicional: 10, // sobre lucro > R$ 20.000/mês
    csll: 9,
    pis: 1.65,
    cofins: 7.6,
  },
};

export function calcularLucroPresumido(
  receitaBruta: number,
  tipo: 'comercio' | 'servicos' = 'servicos'
) {
  const baseIRPJ = tipo === 'servicos' 
    ? receitaBruta * (ALIQUOTAS.presumido.irpj.base_servicos / 100)
    : receitaBruta * (ALIQUOTAS.presumido.irpj.base_comercio / 100);
  
  const baseCSLL = tipo === 'servicos'
    ? receitaBruta * (ALIQUOTAS.presumido.csll.base_servicos / 100)
    : receitaBruta * (ALIQUOTAS.presumido.csll.base_comercio / 100);
  
  let irpj = baseIRPJ * (ALIQUOTAS.presumido.irpj.aliquota / 100);
  
  // Adicional de IRPJ
  const limiteAdicional = ALIQUOTAS.presumido.irpj.adicional_limite / 3; // Mensal
  if (baseIRPJ > limiteAdicional) {
    irpj += (baseIRPJ - limiteAdicional) * (ALIQUOTAS.presumido.irpj.adicional_aliquota / 100);
  }
  
  const csll = baseCSLL * (ALIQUOTAS.presumido.csll.aliquota / 100);
  const pis = receitaBruta * (ALIQUOTAS.presumido.pis / 100);
  const cofins = receitaBruta * (ALIQUOTAS.presumido.cofins / 100);
  
  return {
    irpj,
    csll,
    pis,
    cofins,
    total: irpj + csll + pis + cofins,
    cargaTributaria: ((irpj + csll + pis + cofins) / receitaBruta) * 100,
  };
}

export function calcularLucroReal(
  receitaBruta: number,
  custosDedutiveis: number,
  folhaPagamento: number
) {
  const lucroLiquido = receitaBruta - custosDedutiveis - folhaPagamento;
  
  let irpj = 0;
  let csll = 0;
  
  if (lucroLiquido > 0) {
    irpj = lucroLiquido * (ALIQUOTAS.real.irpj / 100);
    
    // Adicional de IRPJ sobre lucro > R$ 20.000/mês
    const limiteAdicional = 20000;
    if (lucroLiquido > limiteAdicional) {
      irpj += (lucroLiquido - limiteAdicional) * (ALIQUOTAS.real.irpj_adicional / 100);
    }
    
    csll = lucroLiquido * (ALIQUOTAS.real.csll / 100);
  }
  
  const pis = receitaBruta * (ALIQUOTAS.real.pis / 100);
  const cofins = receitaBruta * (ALIQUOTAS.real.cofins / 100);
  
  return {
    lucroLiquido,
    irpj,
    csll,
    pis,
    cofins,
    total: irpj + csll + pis + cofins,
    cargaTributaria: ((irpj + csll + pis + cofins) / receitaBruta) * 100,
  };
}

export function useAnalisesTributarias(ano?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['analises-tributarias', currentCompany?.id, ano],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('analise_tributaria')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('periodo_ano', { ascending: false })
        .order('periodo_mes', { ascending: false });
      
      if (ano) {
        query = query.eq('periodo_ano', ano);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as AnaliseTributaria[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCompararRegimes() {
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      receitaBrutaMensal,
      receitaBruta12Meses,
      custosDedutiveis,
      folhaPagamento,
      anexoSimples,
      tipoAtividade,
    }: {
      receitaBrutaMensal: number;
      receitaBruta12Meses: number;
      custosDedutiveis: number;
      folhaPagamento: number;
      anexoSimples: keyof typeof TABELAS_SIMPLES;
      tipoAtividade: 'comercio' | 'servicos';
    }) => {
      // Calcular Simples Nacional
      let simplesValor = 0;
      let simplesAliquota = 0;
      let simplesDisponivel = true;
      
      try {
        const simples = calcularDAS(receitaBrutaMensal, receitaBruta12Meses, anexoSimples);
        simplesValor = simples.valorDevido;
        simplesAliquota = simples.aliquotaEfetiva;
      } catch {
        simplesDisponivel = false;
      }
      
      // Calcular Lucro Presumido
      const presumido = calcularLucroPresumido(receitaBrutaMensal, tipoAtividade);
      
      // Calcular Lucro Real
      const real = calcularLucroReal(receitaBrutaMensal, custosDedutiveis, folhaPagamento);
      
      // Determinar melhor opção
      const opcoes = [
        { regime: 'simples', valor: simplesValor, disponivel: simplesDisponivel },
        { regime: 'presumido', valor: presumido.total, disponivel: true },
        { regime: 'real', valor: real.total, disponivel: true },
      ].filter(o => o.disponivel);
      
      const melhorOpcao = opcoes.reduce((min, opt) => 
        opt.valor < min.valor ? opt : min
      );
      
      // Calcular economia potencial
      const maiorValor = Math.max(...opcoes.map(o => o.valor));
      const economia = maiorValor - melhorOpcao.valor;
      
      return {
        simples: {
          disponivel: simplesDisponivel,
          aliquota: simplesAliquota,
          valor: simplesValor,
          cargaTributaria: simplesAliquota,
        },
        presumido: {
          irpj: presumido.irpj,
          csll: presumido.csll,
          pis: presumido.pis,
          cofins: presumido.cofins,
          total: presumido.total,
          cargaTributaria: presumido.cargaTributaria,
        },
        real: {
          lucroLiquido: real.lucroLiquido,
          irpj: real.irpj,
          csll: real.csll,
          pis: real.pis,
          cofins: real.cofins,
          total: real.total,
          cargaTributaria: real.cargaTributaria,
        },
        melhorOpcao: melhorOpcao.regime,
        economia,
        economiaPercentual: (economia / maiorValor) * 100,
      };
    },
  });
}

export function useSalvarAnalise() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<AnaliseTributaria>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('analise_tributaria')
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
      queryClient.invalidateQueries({ queryKey: ['analises-tributarias'] });
      toast.success('Análise salva com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar análise: ' + error.message);
    },
  });
}

export function useProjecaoAnual() {
  return useMutation({
    mutationFn: async ({
      receitaMensalMedia,
      crescimentoMensal,
      anexoSimples,
      tipoAtividade,
      custosMensais,
      folhaMensal,
    }: {
      receitaMensalMedia: number;
      crescimentoMensal: number;
      anexoSimples: keyof typeof TABELAS_SIMPLES;
      tipoAtividade: 'comercio' | 'servicos';
      custosMensais: number;
      folhaMensal: number;
    }) => {
      const projecao = [];
      let receitaAcumulada = 0;
      let receitaMes = receitaMensalMedia;
      
      for (let mes = 1; mes <= 12; mes++) {
        receitaMes *= (1 + crescimentoMensal / 100);
        receitaAcumulada += receitaMes;
        
        // Simples
        let simples = null;
        try {
          const calc = calcularDAS(receitaMes, receitaAcumulada, anexoSimples);
          simples = calc.valorDevido;
        } catch {
          simples = null;
        }
        
        // Presumido
        const presumido = calcularLucroPresumido(receitaMes, tipoAtividade);
        
        // Real
        const real = calcularLucroReal(receitaMes, custosMensais, folhaMensal);
        
        projecao.push({
          mes,
          receita: receitaMes,
          receitaAcumulada,
          simples,
          presumido: presumido.total,
          real: real.total,
          melhor: simples !== null && simples < presumido.total && simples < real.total
            ? 'simples'
            : presumido.total < real.total
              ? 'presumido'
              : 'real',
        });
      }
      
      // Totais anuais
      const totais = {
        receita: projecao.reduce((sum, p) => sum + p.receita, 0),
        simples: projecao.reduce((sum, p) => sum + (p.simples || 0), 0),
        presumido: projecao.reduce((sum, p) => sum + p.presumido, 0),
        real: projecao.reduce((sum, p) => sum + p.real, 0),
      };
      
      return { projecao, totais };
    },
  });
}
