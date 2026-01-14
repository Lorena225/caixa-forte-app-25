import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Parâmetros fiscais da empresa
export function useParametrosFiscais() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["parametros-fiscais", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase.from("parametros_fiscais").select("*").eq("empresa_id", currentCompany.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

// Certificados digitais
export function useCertificadosDigitais() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["certificados-digitais", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase.from("certificados_digitais").select("*").eq("empresa_id", currentCompany.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

// Configurações de impostos
export function useImpostosConfiguracao() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["impostos-configuracao", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase.from("impostos_configuracao").select("*").eq("empresa_id", currentCompany.id).order("uf_origem");
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });
}

// Labels
export const AMBIENTE_LABELS: Record<number, string> = { 1: 'Produção', 2: 'Homologação' };
export const REGIME_TRIBUTARIO_LABELS: Record<number, string> = { 1: 'Simples Nacional', 2: 'Simples Nacional (Excesso)', 3: 'Lucro Presumido', 4: 'Lucro Real' };
export const UF_LIST = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
