import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Produto {
  id: string;
  empresa_id: string;
  codigo: string;
  ean: string | null;
  referencia: string | null;
  descricao: string;
  descricao_completa: string | null;
  tipo: 'P' | 'S'; // Produto ou Serviço
  unidade: string;
  preco_venda: number | null;
  preco_custo: number | null;
  markup_percentual: number | null;
  margem_lucro: number | null;
  controla_estoque: boolean | null;
  estoque_minimo: number | null;
  estoque_maximo: number | null;
  localizacao: string | null;
  peso_bruto: number | null;
  peso_liquido: number | null;
  ncm: string | null;
  cest: string | null;
  origem: number | null;
  cfop_padrao: string | null;
  aliquota_icms: number | null;
  aliquota_pis: number | null;
  aliquota_cofins: number | null;
  aliquota_ipi: number | null;
  aliquota_iss: number | null;
  cst_icms: string | null;
  cst_pis: string | null;
  cst_cofins: string | null;
  cst_ipi: string | null;
  codigo_servico: string | null;
  item_lista_servico: string | null;
  categoria_id: string | null;
  marca_id: string | null;
  fornecedor_padrao_id: string | null;
  imagem_url: string | null;
  situacao: 'A' | 'I';
  destaque: boolean | null;
  observacoes: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type ProdutoInput = Omit<Produto, 'id' | 'codigo' | 'created_at' | 'updated_at'>;

export function useProdutos(empresaId?: string, tipo?: 'P' | 'S') {
  return useQuery({
    queryKey: ['produtos', empresaId, tipo],
    queryFn: async () => {
      let query = supabase
        .from('produtos')
        .select('*')
        .order('descricao');
      
      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }
      
      if (tipo) {
        query = query.eq('tipo', tipo);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Produto[];
    },
    enabled: !!empresaId,
  });
}

export function useProduto(id: string) {
  return useQuery({
    queryKey: ['produto', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Produto;
    },
    enabled: !!id,
  });
}

export function useCreateProduto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (produto: ProdutoInput) => {
      const { data, error } = await supabase
        .from('produtos')
        .insert([produto])
        .select()
        .single();
      
      if (error) throw error;
      return data as Produto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar produto: ${error.message}`);
    },
  });
}

export function useUpdateProduto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...produto }: Partial<Produto> & { id: string }) => {
      const { data, error } = await supabase
        .from('produtos')
        .update(produto)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Produto;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar produto: ${error.message}`);
    },
  });
}

export function useDeleteProduto() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success('Produto excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir produto: ${error.message}`);
    },
  });
}
