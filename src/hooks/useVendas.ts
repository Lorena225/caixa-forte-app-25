import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Lista de vendas
export function useVendas(filters?: { tipo?: string; situacao?: string; dateFrom?: string; dateTo?: string; search?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["vendas", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase.from("vendas").select("*").eq("empresa_id", currentCompany.id).order("data_venda", { ascending: false });
      if (filters?.tipo) query = query.eq("tipo", filters.tipo);
      if (filters?.situacao) query = query.eq("situacao", filters.situacao);
      if (filters?.dateFrom) query = query.gte("data_venda", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("data_venda", filters.dateTo);
      if (filters?.search) query = query.or(`numero.ilike.%${filters.search}%,cliente_nome.ilike.%${filters.search}%`);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

// Venda por ID
export function useVenda(vendaId: string | null) {
  return useQuery({
    queryKey: ["venda", vendaId],
    queryFn: async () => {
      if (!vendaId) return null;
      const { data, error } = await supabase.from("vendas").select("*").eq("id", vendaId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!vendaId,
  });
}

// Itens da venda
export function useVendaItens(vendaId: string | null) {
  return useQuery({
    queryKey: ["venda-itens", vendaId],
    queryFn: async () => {
      if (!vendaId) return [];
      const { data, error } = await supabase.from("vendas_itens").select("*").eq("venda_id", vendaId).order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendaId,
  });
}

// Parcelas da venda
export function useVendaParcelas(vendaId: string | null) {
  return useQuery({
    queryKey: ["venda-parcelas", vendaId],
    queryFn: async () => {
      if (!vendaId) return [];
      const { data, error } = await supabase.from("vendas_parcelas").select("*").eq("venda_id", vendaId).order("data_vencimento");
      if (error) throw error;
      return data || [];
    },
    enabled: !!vendaId,
  });
}

// Estatísticas de vendas
export function useVendasStats(periodo?: { from: string; to: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["vendas-stats", currentCompany?.id, periodo],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      let query = supabase.from("vendas").select("tipo, situacao, valor_total").eq("empresa_id", currentCompany.id);
      if (periodo?.from) query = query.gte("data_venda", periodo.from);
      if (periodo?.to) query = query.lte("data_venda", periodo.to);
      const { data, error } = await query;
      if (error) throw error;

      const vendas = (data || []).filter((v: Record<string, unknown>) => v.tipo === 'venda');
      const faturadas = vendas.filter((v: Record<string, unknown>) => v.situacao === 'faturado' || v.situacao === 'entregue');

      return {
        totalVendas: vendas.length,
        faturadas: faturadas.length,
        valorTotal: faturadas.reduce((sum: number, v: Record<string, unknown>) => sum + Number(v.valor_total || 0), 0),
        ticketMedio: faturadas.length > 0 ? faturadas.reduce((sum: number, v: Record<string, unknown>) => sum + Number(v.valor_total || 0), 0) / faturadas.length : 0,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Faturar venda
export function useFaturarVenda() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (vendaId: string) => {
      const { data, error } = await supabase.from("vendas").update({ situacao: 'faturado' }).eq("id", vendaId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendas"] });
      toast.success("Venda faturada com sucesso");
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// Labels
export const TIPO_VENDA_LABELS: Record<string, string> = { venda: 'Venda', orcamento: 'Orçamento', pedido: 'Pedido', consignacao: 'Consignação', devolucao: 'Devolução' };
export const SITUACAO_VENDA_LABELS: Record<string, string> = { rascunho: 'Rascunho', pendente: 'Pendente', aprovado: 'Aprovado', faturado: 'Faturado', entregue: 'Entregue', cancelado: 'Cancelado' };
