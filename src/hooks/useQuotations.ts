import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Quotation {
  id: string;
  company_id: string;
  quote_number: string;
  quote_date: string;
  supplier_id: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'convertido';
  validity_date: string | null;
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

export interface QuotationItem {
  id: string;
  quotation_id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  total: number;
  products?: {
    id: string;
    name: string;
    code: string;
  };
}

export function useQuotations() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('quotations')
        .select(`
          *,
          counterparties (id, name)
        `)
        .eq('company_id', companyId)
        .order('quote_date', { ascending: false });

      if (error) throw error;
      return data as Quotation[];
    },
    enabled: !!companyId,
  });

  const createQuotation = useMutation({
    mutationFn: async ({
      quotation,
      items,
    }: {
      quotation: Partial<Quotation>;
      items: { product_id: string; quantity: number; unit_price: number; total: number; discount_percent?: number }[];
    }) => {
      if (!companyId) throw new Error('Company ID required');

      // Generate quote number
      const { data: lastQuote } = await supabase
        .from('quotations')
        .select('quote_number')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastQuote?.quote_number) {
        const match = lastQuote.quote_number.match(/COT-\d{4}-(\d+)/);
        if (match) nextNumber = parseInt(match[1]) + 1;
      }

      const quoteNumber = `COT-${new Date().getFullYear()}-${String(nextNumber).padStart(4, '0')}`;

      const { data: newQuote, error: quoteError } = await supabase
        .from('quotations')
        .insert({
          company_id: companyId,
          quote_number: quoteNumber,
          status: 'pendente',
          subtotal: quotation.subtotal || 0,
          freight: quotation.freight || 0,
          discount: quotation.discount || 0,
          total: quotation.total || 0,
          supplier_id: quotation.supplier_id,
          validity_date: quotation.validity_date,
          notes: quotation.notes,
        })
        .select()
        .single();

      if (quoteError) throw quoteError;

      // Insert items
      if (items.length > 0) {
        const quoteItems = items.map(item => ({
          quotation_id: newQuote.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          discount_percent: item.discount_percent || 0,
        }));

        const { error: itemsError } = await supabase
          .from('quotation_items')
          .insert(quoteItems);

        if (itemsError) throw itemsError;
      }

      return newQuote;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Cotação criada com sucesso!');
    },
    onError: (error) => {
      console.error('Error creating quotation:', error);
      toast.error('Erro ao criar cotação');
    },
  });

  const updateQuotation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Quotation> & { id: string }) => {
      const { data, error } = await supabase
        .from('quotations')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Cotação atualizada!');
    },
    onError: (error) => {
      console.error('Error updating quotation:', error);
      toast.error('Erro ao atualizar cotação');
    },
  });

  const convertToPurchaseOrder = useMutation({
    mutationFn: async (quotationId: string) => {
      // Get quotation with items
      const { data: quotation, error: quotationError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

      if (quotationError) throw quotationError;

      const { data: items, error: itemsError } = await supabase
        .from('quotation_items')
        .select('*')
        .eq('quotation_id', quotationId);

      if (itemsError) throw itemsError;

      // Create purchase order
      const { data: lastOrder } = await supabase
        .from('purchase_orders')
        .select('order_number')
        .eq('company_id', quotation.company_id)
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
          company_id: quotation.company_id,
          order_number: orderNumber,
          supplier_id: quotation.supplier_id,
          status: 'aberto',
          subtotal: quotation.subtotal,
          freight: quotation.freight,
          discount: quotation.discount,
          total: quotation.total,
          notes: `Convertido da cotação ${quotation.quote_number}`,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      if (items && items.length > 0) {
        const orderItems = items.map(item => ({
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          discount_percent: item.discount_percent,
          total: item.total,
        }));

        await supabase.from('purchase_order_items').insert(orderItems);
      }

      // Update quotation status
      await supabase
        .from('quotations')
        .update({ status: 'convertido' })
        .eq('id', quotationId);

      return newOrder;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['purchase_orders'] });
      toast.success('Cotação convertida em pedido de compra!');
    },
    onError: (error) => {
      console.error('Error converting quotation:', error);
      toast.error('Erro ao converter cotação');
    },
  });

  return {
    quotations,
    isLoading,
    createQuotation,
    updateQuotation,
    convertToPurchaseOrder,
  };
}
