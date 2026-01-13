import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Use the database types directly
type FiscalNCMRow = Database['public']['Tables']['fiscal_ncm']['Row'];
type FiscalCFOPRow = Database['public']['Tables']['fiscal_cfop']['Row'];
type FiscalCSTRow = Database['public']['Tables']['fiscal_cst_csosn']['Row'];
type FiscalTaxRuleRow = Database['public']['Tables']['fiscal_tax_rules']['Row'];

export type FiscalNCM = FiscalNCMRow;
export type FiscalCFOP = FiscalCFOPRow;
export type FiscalCSTCSOSN = FiscalCSTRow;
export type FiscalTaxRule = FiscalTaxRuleRow;

// NCM Hooks
export function useFiscalNCM(search?: string) {
  return useQuery({
    queryKey: ["fiscal-ncm", search],
    queryFn: async () => {
      let query = supabase
        .from("fiscal_ncm")
        .select("*")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (search) {
        query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFiscalNCM() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { code: string; description: string; ipi_rate?: number; unit?: string }) => {
      const { error } = await supabase.from("fiscal_ncm").insert({
        ...data,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-ncm"] });
      toast.success("NCM cadastrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// CFOP Hooks
export function useFiscalCFOP(search?: string) {
  return useQuery({
    queryKey: ["fiscal-cfop", search],
    queryFn: async () => {
      let query = supabase
        .from("fiscal_cfop")
        .select("*")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (search) {
        query = query.or(`code.ilike.%${search}%,description.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateFiscalCFOP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      code: string; 
      description: string; 
      operation_type?: string; 
      is_interstate?: boolean;
      generates_credit?: boolean;
    }) => {
      const { error } = await supabase.from("fiscal_cfop").insert({
        ...data,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-cfop"] });
      toast.success("CFOP cadastrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// CST/CSOSN Hooks
export function useFiscalCSTCSOSN(taxType?: string) {
  return useQuery({
    queryKey: ["fiscal-cst-csosn", taxType],
    queryFn: async () => {
      let query = supabase
        .from("fiscal_cst_csosn")
        .select("*")
        .eq("is_active", true)
        .order("code", { ascending: true });

      if (taxType) {
        query = query.eq("tax_type", taxType);
      }

      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data;
    },
  });
}

// Tax Rules Hooks
export function useFiscalTaxRules() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["fiscal-tax-rules", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("fiscal_tax_rules")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("priority", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateFiscalTaxRule() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      priority?: number;
      tax_regime: string;
      origin_state?: string;
      destination_state?: string;
      cst_code?: string;
      tax_rate?: number;
      base_reduction_percent?: number;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("fiscal_tax_rules") as any).insert({
        name: data.name,
        priority: data.priority ?? 0,
        tax_regime: data.tax_regime,
        origin_state: data.origin_state,
        destination_state: data.destination_state,
        cst_code: data.cst_code,
        tax_rate: data.tax_rate,
        base_reduction_percent: data.base_reduction_percent,
        company_id: currentCompany.id,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-tax-rules"] });
      toast.success("Regra fiscal cadastrada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateFiscalTaxRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; is_active?: boolean; priority?: number }) => {
      const { error } = await supabase
        .from("fiscal_tax_rules")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-tax-rules"] });
      toast.success("Regra fiscal atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteFiscalTaxRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fiscal_tax_rules")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fiscal-tax-rules"] });
      toast.success("Regra fiscal removida");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
