import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SalesOrder {
  id: string;
  company_id: string;
  order_number: string;
  quotation_id: string | null;
  counterparty_id: string | null;
  seller_id: string | null;
  data_pedido: string;
  data_entrega_prevista: string | null;
  status: 'rascunho' | 'confirmado' | 'em_separacao' | 'faturado' | 'entregue' | 'cancelado';
  condicao_pagamento: string | null;
  valor_produtos: number;
  valor_desconto: number;
  valor_frete: number;
  valor_total: number;
  observacoes: string | null;
  observacoes_internas: string | null;
  created_at: string;
  updated_at: string;
  counterparty?: {
    name: string;
  };
}

export interface SalesOrderItem {
  id: string;
  sales_order_id: string;
  product_id: string | null;
  descricao: string;
  quantidade: number;
  quantidade_entregue: number;
  valor_unitario: number;
  percentual_desconto: number;
  valor_desconto: number;
  valor_total: number;
  ordem: number;
}

export function useSalesOrders(filters?: { status?: string; search?: string; from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['sales-orders', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select(`
          *,
          counterparty:counterparties(name)
        `)
        .eq('company_id', currentCompany!.id)
        .order('data_pedido', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.from) query = query.gte('data_pedido', filters.from);
      if (filters?.to) query = query.lte('data_pedido', filters.to);
      if (filters?.search) {
        query = query.or(`order_number.ilike.%${filters.search}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SalesOrder[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSalesOrder(id: string | null) {
  return useQuery({
    queryKey: ['sales-order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          *,
          counterparty:counterparties(name, document)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as SalesOrder;
    },
    enabled: !!id,
  });
}

export function useSalesOrderItems(orderId: string | null) {
  return useQuery({
    queryKey: ['sales-order-items', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_order_items')
        .select(`
          *,
          product:products(name, sku)
        `)
        .eq('sales_order_id', orderId!)
        .order('ordem');
      if (error) throw error;
      return data;
    },
    enabled: !!orderId,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (input: { 
      order: Omit<SalesOrder, 'id' | 'company_id' | 'order_number' | 'created_at' | 'updated_at' | 'counterparty'>;
      items: Omit<SalesOrderItem, 'id' | 'sales_order_id'>[];
    }) => {
      // Generate order number
      const { data: lastOrder } = await supabase
        .from('sales_orders')
        .select('order_number')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextNumber = 1;
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/\d+/);
        if (match) nextNumber = parseInt(match[0]) + 1;
      }

      const order_number = `PV-${String(nextNumber).padStart(6, '0')}`;

      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .insert([{ 
          ...input.order, 
          company_id: currentCompany!.id,
          order_number 
        }])
        .select()
        .single();

      if (orderError) throw orderError;

      if (input.items.length > 0) {
        const itemsToInsert = input.items.map((item, index) => ({
          ...item,
          sales_order_id: order.id,
          ordem: index + 1,
        }));

        const { error: itemsError } = await supabase
          .from('sales_order_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Pedido de venda criado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateSalesOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<SalesOrder> & { id: string }) => {
      const { error } = await supabase
        .from('sales_orders')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Pedido atualizado!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useSalesOrdersStats(filters?: { from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['sales-orders-stats', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select('status, valor_total')
        .eq('company_id', currentCompany!.id);

      if (filters?.from) query = query.gte('data_pedido', filters.from);
      if (filters?.to) query = query.lte('data_pedido', filters.to);

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const confirmados = data.filter(o => o.status === 'confirmado').length;
      const faturados = data.filter(o => o.status === 'faturado').length;
      const valorTotal = data.reduce((sum, o) => sum + (Number(o.valor_total) || 0), 0);

      return { total, confirmados, faturados, valorTotal };
    },
    enabled: !!currentCompany?.id,
  });
}
