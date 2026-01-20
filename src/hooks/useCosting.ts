import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CostingActivity {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  cost_pool: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CostDriver {
  id: string;
  company_id: string;
  activity_id: string | null;
  code: string;
  name: string;
  unit: string;
  total_quantity: number;
  rate_per_unit: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  activity?: CostingActivity;
}

export interface BreakevenParam {
  id: string;
  company_id: string;
  product_id: string | null;
  periodo_ref: string;
  custos_fixos: number;
  custos_variaveis_unitario: number;
  preco_venda_unitario: number;
  margem_contribuicao_unitaria: number;
  margem_contribuicao_percentual: number;
  ponto_equilibrio_qtd: number;
  ponto_equilibrio_valor: number;
  created_at: string;
  updated_at: string;
  product?: {
    name: string;
  } | null;
}

export interface OperatingLeverage {
  id: string;
  company_id: string;
  periodo_ref: string;
  receita_total: number;
  custos_variaveis_total: number;
  margem_contribuicao_total: number;
  custos_fixos_total: number;
  lucro_operacional: number;
  grau_alavancagem_operacional: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

// Costing Activities
export function useCostingActivities() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['costing-activities', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('costing_activities')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('code');
      if (error) throw error;
      return data as CostingActivity[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCostingActivity() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<CostingActivity, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('costing_activities')
        .insert([{ ...input, company_id: currentCompany!.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['costing-activities'] });
      toast.success('Atividade criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Cost Drivers
export function useCostDrivers() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['cost-drivers', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cost_drivers')
        .select(`
          *,
          activity:costing_activities(name, code)
        `)
        .eq('company_id', currentCompany!.id)
        .order('code');
      if (error) throw error;
      return data as CostDriver[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCostDriver() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<CostDriver, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'activity'>) => {
      const { data, error } = await supabase
        .from('cost_drivers')
        .insert([{ ...input, company_id: currentCompany!.id }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost-drivers'] });
      toast.success('Direcionador criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Breakeven Params
export function useBreakevenParams() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['breakeven-params', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('breakeven_params')
        .select(`
          *,
          product:products(name)
        `)
        .eq('company_id', currentCompany!.id)
        .order('periodo_ref', { ascending: false });
      if (error) throw error;
      return data as BreakevenParam[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateBreakevenParam() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<BreakevenParam, 'id' | 'company_id' | 'created_at' | 'updated_at' | 'product'>) => {
      // Calculate derived fields
      const margem_contribuicao_unitaria = input.preco_venda_unitario - input.custos_variaveis_unitario;
      const margem_contribuicao_percentual = input.preco_venda_unitario > 0 
        ? (margem_contribuicao_unitaria / input.preco_venda_unitario) * 100 
        : 0;
      const ponto_equilibrio_qtd = margem_contribuicao_unitaria > 0 
        ? input.custos_fixos / margem_contribuicao_unitaria 
        : 0;
      const ponto_equilibrio_valor = ponto_equilibrio_qtd * input.preco_venda_unitario;

      const { data, error } = await supabase
        .from('breakeven_params')
        .insert([{ 
          ...input, 
          company_id: currentCompany!.id,
          margem_contribuicao_unitaria,
          margem_contribuicao_percentual,
          ponto_equilibrio_qtd,
          ponto_equilibrio_valor
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['breakeven-params'] });
      toast.success('Parâmetro criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Operating Leverage
export function useOperatingLeverage() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['operating-leverage', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('operating_leverage')
        .select('*')
        .eq('company_id', currentCompany!.id)
        .order('periodo_ref', { ascending: false });
      if (error) throw error;
      return data as OperatingLeverage[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateOperatingLeverage() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: Omit<OperatingLeverage, 'id' | 'company_id' | 'created_at' | 'updated_at'>) => {
      // Calculate derived fields
      const margem_contribuicao_total = input.receita_total - input.custos_variaveis_total;
      const lucro_operacional = margem_contribuicao_total - input.custos_fixos_total;
      const grau_alavancagem_operacional = lucro_operacional !== 0 
        ? margem_contribuicao_total / lucro_operacional 
        : 0;

      const { data, error } = await supabase
        .from('operating_leverage')
        .insert([{ 
          ...input, 
          company_id: currentCompany!.id,
          margem_contribuicao_total,
          lucro_operacional,
          grau_alavancagem_operacional
        }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operating-leverage'] });
      toast.success('Análise criada!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
