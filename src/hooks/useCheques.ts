import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type ChequeStatus = 'em_carteira' | 'depositado' | 'compensado' | 'devolvido' | 'sustado' | 'cancelado';
export type ChequeType = 'emitido' | 'recebido';

export interface Cheque {
  id: string;
  company_id: string;
  bank_account_id: string | null;
  cheque_number: string;
  bank_code: string;
  agency: string | null;
  account: string | null;
  issue_date: string;
  due_date: string | null;
  amount: number;
  beneficiary_name: string | null;
  beneficiary_document: string | null;
  cheque_type: ChequeType;
  status: ChequeStatus;
  deposit_date: string | null;
  compensation_date: string | null;
  return_reason: string | null;
  transaction_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  bank_account?: {
    bank_name: string | null;
  };
}

export function useCheques(filters?: { type?: ChequeType; status?: ChequeStatus }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["cheques", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      let query = supabase
        .from("cheques")
        .select(`
          *,
          bank_account:bank_accounts(bank_name)
        `)
        .eq("company_id", currentCompany.id)
        .order("due_date", { ascending: true });

      if (filters?.type) {
        query = query.eq("cheque_type", filters.type);
      }
      if (filters?.status) {
        query = query.eq("status", filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Cheque[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateCheque() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      bank_account_id?: string;
      cheque_number: string;
      bank_code: string;
      agency?: string;
      account?: string;
      issue_date: string;
      due_date?: string;
      amount: number;
      beneficiary_name?: string;
      beneficiary_document?: string;
      cheque_type: ChequeType;
      notes?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");

      const { error } = await supabase.from("cheques").insert({
        company_id: currentCompany.id,
        bank_account_id: data.bank_account_id || null,
        cheque_number: data.cheque_number,
        bank_code: data.bank_code,
        agency: data.agency || null,
        account: data.account || null,
        issue_date: data.issue_date,
        due_date: data.due_date || null,
        amount: data.amount,
        beneficiary_name: data.beneficiary_name || null,
        beneficiary_document: data.beneficiary_document || null,
        cheque_type: data.cheque_type,
        status: 'em_carteira',
        notes: data.notes || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque cadastrado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<Cheque> & { id: string }) => {
      const { error } = await supabase
        .from("cheques")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useUpdateChequeStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, return_reason }: { 
      id: string; 
      status: ChequeStatus;
      return_reason?: string;
    }) => {
      const updateData: Record<string, unknown> = { status };
      
      if (status === 'depositado') {
        updateData.deposit_date = new Date().toISOString().split('T')[0];
      } else if (status === 'compensado') {
        updateData.compensation_date = new Date().toISOString().split('T')[0];
      } else if (status === 'devolvido' && return_reason) {
        updateData.return_reason = return_reason;
      }

      const { error } = await supabase
        .from("cheques")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Status atualizado");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

export function useDeleteCheque() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("cheques")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cheques"] });
      toast.success("Cheque excluído");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}
