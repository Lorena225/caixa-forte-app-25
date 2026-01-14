import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface RegraTributacao {
  id: string;
  company_id: string;
  nome: string;
  produto_id: string | null;
  ncm: string | null;
  uf_origem: string | null;
  uf_destino: string | null;
  cfop: string | null;
  cst_icms: string | null;
  csosn: string | null;
  aliquota_icms: number | null;
  aliquota_ipi: number | null;
  aliquota_pis: number | null;
  aliquota_cofins: number | null;
  reducao_base_calc: number;
  mva: number;
  fcp: number;
  difal: number;
  is_active: boolean;
  prioridade: number;
  created_at: string;
  updated_at: string;
}

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export function useRegrasTributacao(isActive?: boolean) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['regras-tributacao', currentCompany?.id, isActive],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('regras_tributacao')
        .select('*, products(name, sku)')
        .eq('company_id', currentCompany.id)
        .order('prioridade', { ascending: true });
      
      if (isActive !== undefined) {
        query = query.eq('is_active', isActive);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useRegraTributacaoById(id: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['regra-tributacao', id],
    queryFn: async () => {
      if (!currentCompany?.id || !id) return null;
      
      const { data, error } = await supabase
        .from('regras_tributacao')
        .select('*, products(name, sku)')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as any;
    },
    enabled: !!currentCompany?.id && !!id,
  });
}

export function useCreateRegraTributacao() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<RegraTributacao>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('regras_tributacao')
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
      queryClient.invalidateQueries({ queryKey: ['regras-tributacao'] });
      toast.success('Regra de tributação criada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar regra: ' + error.message);
    },
  });
}

export function useUpdateRegraTributacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<RegraTributacao> & { id: string }) => {
      const { error } = await supabase
        .from('regras_tributacao')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-tributacao'] });
      toast.success('Regra atualizada');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar: ' + error.message);
    },
  });
}

export function useDeleteRegraTributacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('regras_tributacao')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['regras-tributacao'] });
      toast.success('Regra excluída');
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir: ' + error.message);
    },
  });
}

export function useSimulateTax() {
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      produtoId,
      ufOrigem,
      ufDestino,
      valorBase,
    }: {
      produtoId?: string;
      ufOrigem: string;
      ufDestino: string;
      valorBase: number;
    }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Buscar regra aplicável
      let query = supabase
        .from('regras_tributacao')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('prioridade', { ascending: true });
      
      if (produtoId) {
        query = query.eq('produto_id', produtoId);
      }
      if (ufOrigem) {
        query = query.or(`uf_origem.is.null,uf_origem.eq.${ufOrigem}`);
      }
      if (ufDestino) {
        query = query.or(`uf_destino.is.null,uf_destino.eq.${ufDestino}`);
      }
      
      const { data: regras, error } = await query.limit(1);
      if (error) throw error;
      
      const regra = regras?.[0] || null;
      
      // Calcular impostos
      const baseCalculo = valorBase * (1 - (regra?.reducao_base_calc || 0) / 100);
      const icms = baseCalculo * ((regra?.aliquota_icms || 0) / 100);
      const ipi = valorBase * ((regra?.aliquota_ipi || 0) / 100);
      const pis = valorBase * ((regra?.aliquota_pis || 1.65) / 100);
      const cofins = valorBase * ((regra?.aliquota_cofins || 7.6) / 100);
      const fcp = baseCalculo * ((regra?.fcp || 0) / 100);
      
      // DIFAL se aplicável
      let difal = 0;
      if (ufOrigem !== ufDestino && regra?.difal) {
        difal = baseCalculo * (regra.difal / 100);
      }
      
      const totalImpostos = icms + ipi + pis + cofins + fcp + difal;
      const cargaTributaria = (totalImpostos / valorBase) * 100;
      
      return {
        regraAplicada: regra,
        valorBase,
        baseCalculoICMS: baseCalculo,
        icms,
        ipi,
        pis,
        cofins,
        fcp,
        difal,
        totalImpostos,
        cargaTributaria,
        valorFinal: valorBase + ipi, // IPI por fora
      };
    },
  });
}

export function useImportRegrasTributacao() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (regras: Partial<RegraTributacao>[]) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const regrasComEmpresa = regras.map(r => ({
        ...r,
        company_id: currentCompany.id,
      }));
      
      const { error } = await supabase
        .from('regras_tributacao')
        .insert(regrasComEmpresa as never[]);
      
      if (error) throw error;
      return regras.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['regras-tributacao'] });
      toast.success(`${count} regras importadas com sucesso`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao importar: ' + error.message);
    },
  });
}
