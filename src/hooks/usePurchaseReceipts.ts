import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PurchaseReceipt {
  id: string;
  company_id: string;
  receipt_number: string;
  receipt_date: string;
  order_id: string | null;
  supplier_id: string | null;
  invoice_number: string | null;
  total_items: number;
  total_value: number;
  notes: string | null;
  received_by: string | null;
  created_at: string;
  purchase_orders?: {
    id: string;
    order_number: string;
  };
  counterparties?: {
    id: string;
    name: string;
  };
}

export interface PurchaseReceiptItem {
  id: string;
  receipt_id: string;
  order_item_id: string | null;
  product_id: string | null;
  quantity_received: number;
  unit_cost: number;
  total_cost: number;
  products?: {
    id: string;
    name: string;
    code: string;
  };
}

export function usePurchaseReceipts() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['purchase_receipts', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('purchase_receipts')
        .select(`
          *,
          purchase_orders (id, order_number),
          counterparties (id, name)
        `)
        .eq('company_id', companyId)
        .order('receipt_date', { ascending: false });

      if (error) throw error;
      return data as PurchaseReceipt[];
    },
    enabled: !!companyId,
  });

  const createReceipt = useMutation({
    mutationFn: async ({
      receipt,
      items,
    }: {
      receipt: Partial<PurchaseReceipt>;
      items: { product_id: string; quantity_received: number; unit_cost: number; total_cost: number; order_item_id?: string }[];
    }) => {
      if (!companyId) throw new Error('Company ID required');

      // Generate receipt number
      const { data: lastReceipt } = await supabase
        .from('purchase_receipts')
        .select('receipt_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastReceipt?.receipt_number) {
        const match = lastReceipt.receipt_number.match(/ENT-\d{4}-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }

      const receiptNumber = `ENT-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      const { data: newReceipt, error: receiptError } = await supabase
        .from('purchase_receipts')
        .insert({
          company_id: companyId,
          receipt_number: receiptNumber,
          total_items: items.length,
          total_value: items.reduce((sum, i) => sum + i.total_cost, 0),
          order_id: receipt.order_id,
          supplier_id: receipt.supplier_id,
          invoice_number: receipt.invoice_number,
          notes: receipt.notes,
        })
        .select()
        .single();

      if (receiptError) throw receiptError;

      // Insert items
      if (items.length > 0) {
        const receiptItems = items.map(item => ({
          receipt_id: newReceipt.id,
          product_id: item.product_id,
          quantity_received: item.quantity_received,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
          order_item_id: item.order_item_id,
        }));

        const { error: itemsError } = await supabase
          .from('purchase_receipt_items')
          .insert(receiptItems);

        if (itemsError) throw itemsError;

        // Create stock movements for each item
        for (const item of items) {
          if (item.product_id) {
            await supabase.from('stock_movements').insert({
              company_id: companyId,
              movement_type: 'entrada',
              product_id: item.product_id,
              quantity: item.quantity_received || 0,
              unit_cost: item.unit_cost || 0,
              total_cost: item.total_cost || 0,
              source_destination: 'Compra',
              reference_type: 'purchase_receipt',
              reference_id: newReceipt.id,
              notes: `Entrada ref. ${receiptNumber}`,
            });

            // Update product stock and cost
            const { data: product } = await supabase
              .from('products')
              .select('current_stock, cost_price')
              .eq('id', item.product_id)
              .single();

            if (product) {
              const newStock = (product.current_stock || 0) + (item.quantity_received || 0);
              // Calculate weighted average cost
              const oldValue = (product.current_stock || 0) * (product.cost_price || 0);
              const newValue = (item.quantity_received || 0) * (item.unit_cost || 0);
              const newAvgCost = newStock > 0 ? (oldValue + newValue) / newStock : item.unit_cost || 0;

              await supabase
                .from('products')
                .update({
                  current_stock: newStock,
                  cost_price: newAvgCost,
                })
                .eq('id', item.product_id);
            }
          }
        }

        // Update order items received qty if linked to order
        if (receipt.order_id) {
          for (const item of items) {
            if (item.order_item_id) {
              const { data: orderItem } = await supabase
                .from('purchase_order_items')
                .select('received_qty')
                .eq('id', item.order_item_id)
                .single();

              if (orderItem) {
                await supabase
                  .from('purchase_order_items')
                  .update({
                    received_qty: (orderItem.received_qty || 0) + (item.quantity_received || 0),
                  })
                  .eq('id', item.order_item_id);
              }
            }
          }

          // Check if order is fully received
          const { data: orderItems } = await supabase
            .from('purchase_order_items')
            .select('quantity, received_qty')
            .eq('order_id', receipt.order_id);

          if (orderItems) {
            const allReceived = orderItems.every(i => (i.received_qty || 0) >= i.quantity);
            const partialReceived = orderItems.some(i => (i.received_qty || 0) > 0);

            await supabase
              .from('purchase_orders')
              .update({
                status: allReceived ? 'recebido' : partialReceived ? 'parcial' : 'aberto',
              })
              .eq('id', receipt.order_id);
          }
        }
      }

      return newReceipt;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase_receipts'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      queryClient.invalidateQueries({ queryKey: ['stock_movements'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Entrada registrada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating receipt:', error);
      toast.error('Erro ao registrar entrada');
    },
  });

  return {
    receipts,
    isLoading,
    createReceipt,
  };
}
