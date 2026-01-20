import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface BankTransfer {
  id: string;
  company_id: string;
  origin_bank_account_id: string;
  destination_bank_account_id: string;
  transfer_date: string;
  scheduled_date: string | null;
  amount: number;
  description: string | null;
  reference_number: string | null;
  status: 'rascunho' | 'pendente' | 'concluido' | 'cancelado';
  executed_at: string | null;
  executed_by: string | null;
  transaction_origin_id: string | null;
  transaction_destination_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  origin_account?: {
    bank_name: string | null;
    bank_code: string;
    agency: string;
    account_number: string;
  };
  destination_account?: {
    bank_name: string | null;
    bank_code: string;
    agency: string;
    account_number: string;
  };
}

export function useBankTransfers(status?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["bank-transfers", currentCompany?.id, status],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("bank_transfers")
        .select(`
          *,
          origin_account:bank_accounts!origin_bank_account_id(bank_name, bank_code, agency, account_number),
          destination_account:bank_accounts!destination_bank_account_id(bank_name, bank_code, agency, account_number)
        `)
        .eq("company_id", currentCompany.id)
        .order("transfer_date", { ascending: false });

      if (status) {
        query = query.eq("status", status as 'rascunho' | 'pendente' | 'concluido' | 'cancelado');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as BankTransfer[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateBankTransfer() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      origin_bank_account_id: string;
      destination_bank_account_id: string;
      transfer_date: string;
      scheduled_date?: string;
      amount: number;
      description?: string;
      reference_number?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { error } = await supabase.from("bank_transfers").insert({
        company_id: currentCompany.id,
        origin_bank_account_id: data.origin_bank_account_id,
        destination_bank_account_id: data.destination_bank_account_id,
        transfer_date: data.transfer_date,
        scheduled_date: data.scheduled_date || null,
        amount: data.amount,
        description: data.description || null,
        reference_number: data.reference_number || null,
        status: 'rascunho',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transfers"] });
      toast.success("Transferência criada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateBankTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<BankTransfer> & { id: string }) => {
      const { error } = await supabase
        .from("bank_transfers")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transfers"] });
      toast.success("Transferência atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useExecuteBankTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_transfers")
        .update({
          status: 'concluido',
          executed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transfers"] });
      queryClient.invalidateQueries({ queryKey: ["cash-positions"] });
      toast.success("Transferência executada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useCancelBankTransfer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bank_transfers")
        .update({ status: 'cancelado' })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-transfers"] });
      toast.success("Transferência cancelada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
