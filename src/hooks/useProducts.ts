import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Product {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description: string | null;
  unit: string;
  category: string | null;
  brand: string | null;
  ncm: string | null;
  barcode: string | null;
  cost_price: number;
  sale_price: number;
  min_stock: number;
  max_stock: number | null;
  current_stock: number;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useProducts() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', companyId)
        .order('name');

      if (error) throw error;
      return data as Product[];
    },
    enabled: !!companyId,
  });

  const createProduct = useMutation({
    mutationFn: async (product: { code: string; name: string } & Partial<Omit<Product, 'code' | 'name'>>) => {
      if (!companyId) throw new Error('Company ID required');

      const { data, error } = await supabase
        .from('products')
        .insert({
          company_id: companyId,
          code: product.code,
          name: product.name,
          description: product.description,
          unit: product.unit || 'UN',
          category: product.category,
          brand: product.brand,
          ncm: product.ncm,
          barcode: product.barcode,
          cost_price: product.cost_price || 0,
          sale_price: product.sale_price || 0,
          min_stock: product.min_stock || 0,
          max_stock: product.max_stock,
          current_stock: product.current_stock || 0,
          location: product.location,
          is_active: product.is_active ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating product:', error);
      toast.error('Erro ao criar produto');
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado!');
    },
    onError: (error) => {
      console.error('Error updating product:', error);
      toast.error('Erro ao atualizar produto');
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto excluído!');
    },
    onError: (error) => {
      console.error('Error deleting product:', error);
      toast.error('Erro ao excluir produto');
    },
  });

  // Derived data
  const lowStockProducts = products.filter(p => p.current_stock <= p.min_stock && p.is_active);
  const totalStockValue = products.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0);
  const activeProducts = products.filter(p => p.is_active);

  return {
    products,
    activeProducts,
    lowStockProducts,
    totalStockValue,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}
