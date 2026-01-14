import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Lista de notas fiscais
export function useNotasFiscais(filters?: { tipo_nota?: string; situacao?: string; dateFrom?: string; dateTo?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["notas-fiscais", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from("notas_fiscais")
        .select("*")
        .eq("empresa_id", currentCompany.id)
        .order("data_emissao", { ascending: false });

      if (filters?.tipo_nota) query = query.eq("tipo_nota", filters.tipo_nota);
      if (filters?.situacao) query = query.eq("situacao", filters.situacao);
      if (filters?.dateFrom) query = query.gte("data_emissao", filters.dateFrom);
      if (filters?.dateTo) query = query.lte("data_emissao", filters.dateTo);

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

// Nota fiscal por ID
export function useNotaFiscal(notaId: string | null) {
  return useQuery({
    queryKey: ["nota-fiscal", notaId],
    queryFn: async () => {
      if (!notaId) return null;
      const { data, error } = await supabase.from("notas_fiscais").select("*").eq("id", notaId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!notaId,
  });
}

// Itens da nota fiscal
export function useNotaFiscalItens(notaId: string | null) {
  return useQuery({
    queryKey: ["nota-fiscal-itens", notaId],
    queryFn: async () => {
      if (!notaId) return [];
      const { data, error } = await supabase.from("notas_fiscais_itens").select("*").eq("nota_fiscal_id", notaId).order("ordem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!notaId,
  });
}

// Eventos da nota fiscal
export function useNotaFiscalEventos(notaId: string | null) {
  return useQuery({
    queryKey: ["nota-fiscal-eventos", notaId],
    queryFn: async () => {
      if (!notaId) return [];
      const { data, error } = await supabase.from("notas_fiscais_eventos").select("*").eq("nota_fiscal_id", notaId).order("data_evento", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!notaId,
  });
}

// Estatísticas
export function useNotasFiscaisStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["notas-fiscais-stats", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase.from("notas_fiscais").select("situacao, tipo_nota, valor_total").eq("empresa_id", currentCompany.id);
      if (error) throw error;
      const notas = data || [];
      return {
        total: notas.length,
        autorizadas: notas.filter((n: Record<string, unknown>) => n.situacao === 'autorizada').length,
        pendentes: notas.filter((n: Record<string, unknown>) => n.situacao === 'digitacao' || n.situacao === 'transmitida').length,
        valorTotal: notas.filter((n: Record<string, unknown>) => n.situacao === 'autorizada').reduce((sum: number, n: Record<string, unknown>) => sum + Number(n.valor_total || 0), 0),
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Emitir nota fiscal
export function useEmitirNotaFiscal() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (notaId: string) => {
      const { data, error } = await supabase.functions.invoke("fiscal-emit", {
        body: { company_id: currentCompany?.id, invoice_id: notaId, action: "emit" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal enviada para autorização");
    },
    onError: (error: Error) => toast.error(`Erro: ${error.message}`),
  });
}

// Labels
export const TIPO_NOTA_LABELS: Record<string, string> = { NFE: 'NF-e', NFSE: 'NFS-e', NFCE: 'NFC-e' };
export const SITUACAO_LABELS: Record<string, string> = { digitacao: 'Digitação', transmitida: 'Transmitida', autorizada: 'Autorizada', cancelada: 'Cancelada', denegada: 'Denegada', rejeitada: 'Rejeitada' };
