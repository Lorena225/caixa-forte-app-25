import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Lista de contratos recorrentes
export function useContratosRecorrentes(filters?: { cliente_id?: string; search?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["contratos-recorrentes", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from("contratos_recorrentes")
        .select("*")
        .eq("empresa_id", currentCompany.id)
        .order("data_inicio", { ascending: false });

      if (filters?.cliente_id) {
        query = query.eq("cliente_id", filters.cliente_id);
      }
      if (filters?.search) {
        query = query.ilike("descricao", `%${filters.search}%`);
      }

      const { data, error } = await query.limit(200);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

// Contrato por ID
export function useContratoRecorrente(contratoId: string | null) {
  return useQuery({
    queryKey: ["contrato-recorrente", contratoId],
    queryFn: async () => {
      if (!contratoId) return null;
      
      const { data, error } = await supabase
        .from("contratos_recorrentes")
        .select("*")
        .eq("id", contratoId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!contratoId,
  });
}

// Estatísticas de contratos
export function useContratosStats() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["contratos-stats", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from("contratos_recorrentes")
        .select("*")
        .eq("empresa_id", currentCompany.id);
      
      if (error) throw error;

      const contratos = data || [];
      const ativos = contratos.filter((c: Record<string, unknown>) => c.gerar_automatico !== false);

      return {
        total: contratos.length,
        ativos: ativos.length,
        inativos: contratos.length - ativos.length,
      };
    },
    enabled: !!currentCompany?.id,
  });
}

// Criar contrato recorrente
export function useCreateContratoRecorrente() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (contrato: { cliente_id: string; descricao: string; data_inicio: string; dia_vencimento?: number; data_fim?: string }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      
      const { data, error } = await supabase
        .from("contratos_recorrentes")
        .insert({
          empresa_id: currentCompany.id,
          cliente_id: contrato.cliente_id,
          descricao: contrato.descricao,
          data_inicio: contrato.data_inicio,
          dia_vencimento: contrato.dia_vencimento || 1,
          data_fim: contrato.data_fim,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos-recorrentes"] });
      toast.success("Contrato criado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao criar contrato: ${error.message}`);
    },
  });
}

// Excluir contrato
export function useDeleteContratoRecorrente() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("contratos_recorrentes")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contratos-recorrentes"] });
      toast.success("Contrato excluído");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });
}
