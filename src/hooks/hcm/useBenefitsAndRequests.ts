import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface EmployeeBenefit {
  id: string;
  company_id: string;
  employee_id: string;
  benefit_type: string;
  benefit_name: string | null;
  provider: string | null;
  company_value: number;
  employee_discount: number;
  daily_value: number | null;
  is_active: boolean;
}

export interface EmployeeRequest {
  id: string;
  company_id: string;
  employee_id: string;
  request_type: 'ferias' | 'reembolso' | 'ajuste_ponto' | 'documento' | 'abono' | 'licenca';
  request_number: string | null;
  title: string;
  description: string | null;
  vacation_start_date: string | null;
  vacation_end_date: string | null;
  vacation_days: number | null;
  expense_date: string | null;
  expense_amount: number | null;
  receipt_url: string | null;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'cancelado';
  submitted_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
  employee?: { id: string; full_name: string };
}

export function useBenefitsAndRequests() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const employeeBenefitsQuery = useQuery({
    queryKey: ['employee_benefits', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('employee_benefits')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true);
      if (error) throw error;
      return data as EmployeeBenefit[];
    },
    enabled: !!companyId,
  });

  const requestsQuery = useQuery({
    queryKey: ['employee_requests', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('employee_requests')
        .select(`
          *,
          employee:employees_profiles!employee_requests_employee_id_fkey(id, full_name)
        `)
        .eq('company_id', companyId)
        .order('submitted_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as EmployeeRequest[];
    },
    enabled: !!companyId,
  });

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('employee_requests')
        .update({ status: 'aprovado', approved_at: new Date().toISOString() } as never)
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_requests'] });
      toast.success('Solicitação aprovada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('employee_requests')
        .update({ status: 'rejeitado', rejection_reason: reason } as never)
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee_requests'] });
      toast.success('Solicitação rejeitada');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    employeeBenefits: employeeBenefitsQuery.data || [],
    employeeBenefitsLoading: employeeBenefitsQuery.isLoading,
    requests: requestsQuery.data || [],
    requestsLoading: requestsQuery.isLoading,
    approveRequest,
    rejectRequest,
  };
}
