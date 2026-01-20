import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  serie: string;
  sales_order_id: string | null;
  counterparty_id: string | null;
  data_emissao: string;
  data_saida: string | null;
  status: 'pendente' | 'emitida' | 'cancelada' | 'inutilizada';
  chave_nfe: string | null;
  protocolo_autorizacao: string | null;
  valor_produtos: number;
  valor_desconto: number;
  valor_frete: number;
  valor_icms: number;
  valor_ipi: number;
  valor_pis: number;
  valor_cofins: number;
  valor_total: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  counterparty?: {
    name: string;
    document: string;
  };
  sales_order?: {
    order_number: string;
  };
}

export function useInvoices(filters?: { status?: string; from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['invoices', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          counterparty:counterparties(name, document),
          sales_order:sales_orders(order_number)
        `)
        .eq('company_id', currentCompany!.id)
        .order('data_emissao', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.from) query = query.gte('data_emissao', filters.from);
      if (filters?.to) query = query.lte('data_emissao', filters.to);

      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: ['invoice', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          counterparty:counterparties(name, document),
          sales_order:sales_orders(order_number)
        `)
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as Invoice;
    },
    enabled: !!id,
  });
}

export function useCreateInvoiceFromOrder() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // Get order
      const { data: order, error: orderError } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;

      // Generate invoice number
      const { data: lastInvoice } = await supabase
        .from('invoices')
        .select('invoice_number')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      let nextNumber = 1;
      if (lastInvoice?.invoice_number) {
        const num = parseInt(lastInvoice.invoice_number);
        if (!isNaN(num)) nextNumber = num + 1;
      }

      const invoice_number = String(nextNumber).padStart(9, '0');

      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert([{
          company_id: currentCompany!.id,
          invoice_number,
          serie: '1',
          sales_order_id: orderId,
          counterparty_id: order.counterparty_id,
          data_emissao: new Date().toISOString().split('T')[0],
          status: 'pendente',
          valor_produtos: order.valor_produtos,
          valor_desconto: order.valor_desconto,
          valor_frete: order.valor_frete,
          valor_total: order.valor_total,
        }])
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Update order status
      await supabase
        .from('sales_orders')
        .update({ status: 'faturado' })
        .eq('id', orderId);

      return invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['sales-orders'] });
      toast.success('Fatura gerada com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useInvoicesStats(filters?: { from?: string; to?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['invoices-stats', currentCompany?.id, filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select('status, valor_total')
        .eq('company_id', currentCompany!.id);

      if (filters?.from) query = query.gte('data_emissao', filters.from);
      if (filters?.to) query = query.lte('data_emissao', filters.to);

      const { data, error } = await query;
      if (error) throw error;

      const total = data.length;
      const emitidas = data.filter(i => i.status === 'emitida').length;
      const pendentes = data.filter(i => i.status === 'pendente').length;
      const valorTotal = data.reduce((sum, i) => sum + (Number(i.valor_total) || 0), 0);

      return { total, emitidas, pendentes, valorTotal };
    },
    enabled: !!currentCompany?.id,
  });
}
