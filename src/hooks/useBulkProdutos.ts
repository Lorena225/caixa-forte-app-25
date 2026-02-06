import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useBulkDeleteProdutos() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .in('id', ids);
      
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success(`${count} produto(s) excluído(s) com sucesso!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir produtos: ${error.message}`);
    },
  });
}

export function useBulkUpdateProdutosCategoria() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, categoriaId }: { ids: string[]; categoriaId: string | null }) => {
      const { error } = await supabase
        .from('produtos')
        .update({ categoria_id: categoriaId })
        .in('id', ids);
      
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success(`Categoria alterada para ${count} produto(s)!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar categoria: ${error.message}`);
    },
  });
}

export function useBulkUpdateProdutosSituacao() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ids, situacao }: { ids: string[]; situacao: 'A' | 'I' }) => {
      const { error } = await supabase
        .from('produtos')
        .update({ situacao })
        .in('id', ids);
      
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count, { situacao }) => {
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success(`${count} produto(s) ${situacao === 'A' ? 'ativado(s)' : 'inativado(s)'}!`);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao alterar situação: ${error.message}`);
    },
  });
}
