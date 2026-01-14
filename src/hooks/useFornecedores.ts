import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Fornecedor {
  id: string;
  empresa_id: string;
  codigo: string;
  tipo_pessoa: 'F' | 'J';
  cpf_cnpj: string | null;
  nome_razao: string;
  nome_fantasia: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  whatsapp: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigo_municipio: string | null;
  condicao_pagamento_id: string | null;
  prazo_entrega_dias: number | null;
  banco: string | null;
  agencia: string | null;
  conta: string | null;
  pix_chave: string | null;
  pix_tipo: string | null;
  regime_tributario: number | null;
  contribuinte_icms: boolean | null;
  indicador_ie: number | null;
  situacao: 'A' | 'I';
  observacoes: string | null;
  observacoes_internas: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export type FornecedorInput = Omit<Fornecedor, 'id' | 'codigo' | 'created_at' | 'updated_at'>;

export function useFornecedores(empresaId?: string) {
  return useQuery({
    queryKey: ['fornecedores', empresaId],
    queryFn: async () => {
      let query = supabase
        .from('fornecedores')
        .select('*')
        .order('nome_razao');
      
      if (empresaId) {
        query = query.eq('empresa_id', empresaId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as Fornecedor[];
    },
    enabled: !!empresaId,
  });
}

export function useFornecedor(id: string) {
  return useQuery({
    queryKey: ['fornecedor', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as Fornecedor;
    },
    enabled: !!id,
  });
}

export function useCreateFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (fornecedor: FornecedorInput) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .insert([fornecedor])
        .select()
        .single();
      
      if (error) throw error;
      return data as Fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar fornecedor: ${error.message}`);
    },
  });
}

export function useUpdateFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...fornecedor }: Partial<Fornecedor> & { id: string }) => {
      const { data, error } = await supabase
        .from('fornecedores')
        .update(fornecedor)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Fornecedor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar fornecedor: ${error.message}`);
    },
  });
}

export function useDeleteFornecedor() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fornecedores'] });
      toast.success('Fornecedor excluído com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir fornecedor: ${error.message}`);
    },
  });
}
