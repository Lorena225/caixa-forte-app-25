import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PurchaseOrder {
  id: string;
  company_id: string;
  order_number: string;
  order_date: string;
  supplier_id: string | null;
  status: 'aberto' | 'parcial' | 'recebido' | 'cancelado';
  payment_condition: string | null;
  expected_delivery: string | null;
  subtotal: number;
  freight: number;
  discount: number;
  total: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  counterparties?: {
    id: string;
    name: string;
  };
}

export interface PurchaseOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  quantity: number;
  received_qty: number;
  unit_price: number;
  discount_percent: number;
  total: number;
  products?: {
    id: string;
    name: string;
    code: string;
  };
}

export function usePurchaseOrders() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['purchase_orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          counterparties (id, name)
        `)
        .eq('company_id', companyId)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!companyId,
  });

  const createOrder = useMutation({
    mutationFn: async ({
      order,
      items,
    }: {
      order: Partial<PurchaseOrder>;
      items: { product_id: string; quantity: number; unit_price: number; total: number; discount_percent?: number }[];
    }) => {
      if (!companyId) throw new Error('Company ID required');

      // Generate order number
      const { data: lastOrder } = await supabase
        .from('purchase_orders')
        .select('order_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastOrder?.order_number) {
        const match = lastOrder.order_number.match(/PC-\d{4}-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }

      const orderNumber = `PC-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      const { data: newOrder, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({
          company_id: companyId,
          order_number: orderNumber,
          status: 'aberto',
          subtotal: order.subtotal || 0,
          freight: order.freight || 0,
          discount: order.discount || 0,
          total: order.total || 0,
          supplier_id: order.supplier_id,
          payment_condition: order.payment_condition,
          expected_delivery: order.expected_delivery,
          notes: order.notes,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert items
      if (items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          discount_percent: item.discount_percent || 0,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_order_items')
          .insert(orderItems);

        if (itemsError) throw itemsError;
      }

      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      toast.success('Pedido de compra criado com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar pedido');
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PurchaseOrder> & { id: string }) => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      toast.success('Pedido atualizado!');
    },
    onError: (error) => {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar pedido');
    },
  });

  return {
    orders,
    isLoading,
    createOrder,
    updateOrder,
  };
}

export function usePurchaseOrderItems(orderId: string | null) {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['purchase_order_items', orderId],
    queryFn: async () => {
      if (!orderId) return [];
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          *,
          products (id, name, code)
        `)
        .eq('order_id', orderId);

      if (error) throw error;
      return data as PurchaseOrderItem[];
    },
    enabled: !!orderId,
  });

  return { items, isLoading };
}
