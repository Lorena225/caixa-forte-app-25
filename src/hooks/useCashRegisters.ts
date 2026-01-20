import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MovementType = 'abertura' | 'entrada' | 'saida' | 'sangria' | 'suprimento' | 'fechamento';

export interface CashRegister {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  responsible_id: string | null;
  opening_balance: number;
  current_balance: number;
  opening_date: string;
  location: string | null;
  is_active: boolean;
  wallet_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashRegisterMovement {
  id: string;
  company_id: string;
  cash_register_id: string;
  movement_date: string;
  movement_time: string;
  movement_type: MovementType;
  amount: number;
  balance_before: number | null;
  balance_after: number | null;
  description: string | null;
  payment_method: string | null;
  reference_document: string | null;
  transaction_id: string | null;
  performed_by: string | null;
  created_at: string;
  cash_register?: {
    name: string;
  };
}

export function useCashRegisters(activeOnly = true) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["cash-registers", currentCompany?.id, activeOnly],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("cash_registers")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CashRegister[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCashRegisterMovements(cashRegisterId?: string, date?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["cash-register-movements", currentCompany?.id, cashRegisterId, date],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("cash_register_movements")
        .select(`
          *,
          cash_register:cash_registers(name)
        `)
        .eq("company_id", currentCompany.id)
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false })
        .limit(100);

      if (cashRegisterId) {
        query = query.eq("cash_register_id", cashRegisterId);
      }
      if (date) {
        query = query.eq("movement_date", date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CashRegisterMovement[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      code?: string;
      responsible_id?: string;
      opening_balance?: number;
      opening_date?: string;
      location?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { error } = await supabase.from("cash_registers").insert({
        company_id: currentCompany.id,
        name: data.name,
        code: data.code || null,
        responsible_id: data.responsible_id || null,
        opening_balance: data.opening_balance || 0,
        current_balance: data.opening_balance || 0,
        opening_date: data.opening_date || new Date().toISOString().split('T')[0],
        location: data.location || null,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      toast.success("Caixa cadastrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateCashRegister() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<CashRegister> & { id: string }) => {
      const { error } = await supabase
        .from("cash_registers")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      toast.success("Caixa atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCreateCashMovement() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      cash_register_id: string;
      movement_type: MovementType;
      amount: number;
      description?: string;
      payment_method?: string;
      reference_document?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      // Get current balance
      const { data: register } = await supabase
        .from("cash_registers")
        .select("current_balance")
        .eq("id", data.cash_register_id)
        .single();

      const balanceBefore = register?.current_balance || 0;
      const isInflow = ['abertura', 'entrada', 'suprimento'].includes(data.movement_type);
      const balanceAfter = isInflow 
        ? balanceBefore + data.amount 
        : balanceBefore - data.amount;

      const { error } = await supabase.from("cash_register_movements").insert({
        company_id: currentCompany.id,
        cash_register_id: data.cash_register_id,
        movement_date: new Date().toISOString().split('T')[0],
        movement_time: new Date().toTimeString().split(' ')[0],
        movement_type: data.movement_type,
        amount: data.amount,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        description: data.description || null,
        payment_method: data.payment_method || null,
        reference_document: data.reference_document || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash-register-movements"] });
      queryClient.invalidateQueries({ queryKey: ["cash-registers"] });
      toast.success("Movimento registrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
