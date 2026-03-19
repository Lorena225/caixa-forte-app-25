import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PayrollPeriod {
  id: string;
  company_id: string;
  reference_month: number;
  reference_year: number;
  period_type: string;
  start_date: string;
  end_date: string;
  payment_date: string | null;
  status: 'rascunho' | 'calculando' | 'preview' | 'aprovado' | 'pago' | 'cancelado';
  total_employees: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  total_employer_cost: number;
  calculated_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface PayrollEntry {
  id: string;
  company_id: string;
  period_id: string;
  employee_id: string;
  base_salary: number;
  worked_days: number;
  salary_amount: number;
  overtime_50_hours: number;
  overtime_50_amount: number;
  overtime_100_hours: number;
  overtime_100_amount: number;
  night_hours: number;
  night_amount: number;
  commission_amount: number;
  bonus_amount: number;
  total_earnings: number;
  total_deductions: number;
  net_salary: number;
  inss_amount: number;
  irrf_amount: number;
  fgts_amount: number;
  status: string;
  employee?: { id: string; full_name: string; registration_number: string | null };
}

export interface CommissionCalculation {
  id: string;
  company_id: string;
  employee_id: string;
  reference_month: number;
  reference_year: number;
  sale_date: string;
  sale_value: number;
  commission_rate: number;
  commission_amount: number;
  status: string;
  employee?: { id: string; full_name: string };
}

export interface Payslip {
  id: string;
  company_id: string;
  employee_id: string;
  period_id: string | null;
  reference_month: number;
  reference_year: number;
  document_type: string;
  pdf_url: string | null;
  is_available: boolean;
  employee?: { id: string; full_name: string };
}

export function usePayroll() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const payrollPeriodsQuery = useQuery({
    queryKey: ['payroll_periods', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('payroll_periods')
        .select('*')
        .eq('company_id', companyId)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });
      if (error) throw error;
      return data as PayrollPeriod[];
    },
    enabled: !!companyId,
  });

  const createPayrollPeriod = useMutation({
    mutationFn: async (data: Partial<PayrollPeriod>) => {
      if (!companyId) throw new Error('Company required');
      const insertData = { ...data, company_id: companyId };
      delete (insertData as Record<string, unknown>).id;
      const { data: result, error } = await supabase
        .from('payroll_periods')
        .insert(insertData as Database['public']['Tables']['payroll_periods']['Insert'])
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll_periods'] });
      toast.success('Período de folha criado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const commissionsQuery = useQuery({
    queryKey: ['commission_calculations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('commission_calculations')
        .select(`
          *,
          employee:employees_profiles(id, full_name)
        `)
        .eq('company_id', companyId)
        .order('sale_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as CommissionCalculation[];
    },
    enabled: !!companyId,
  });

  const payslipsQuery = useQuery({
    queryKey: ['payslips', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('payslips')
        .select(`
          *,
          employee:employees_profiles(id, full_name)
        `)
        .eq('company_id', companyId)
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false });
      if (error) throw error;
      return data as Payslip[];
    },
    enabled: !!companyId,
  });

  return {
    payrollPeriods: payrollPeriodsQuery.data || [],
    payrollPeriodsLoading: payrollPeriodsQuery.isLoading,
    createPayrollPeriod,
    commissions: commissionsQuery.data || [],
    commissionsLoading: commissionsQuery.isLoading,
    payslips: payslipsQuery.data || [],
    payslipsLoading: payslipsQuery.isLoading,
  };
}

/** Standalone hook for payroll entries by period — avoids hook-in-hook violation */
export function usePayrollEntries(periodId: string | null) {
  return useQuery({
    queryKey: ['payroll_entries', periodId],
    queryFn: async () => {
      if (!periodId) return [];
      const { data, error } = await supabase
        .from('payroll_entries')
        .select(`
          *,
          employee:employees_profiles(id, full_name, registration_number)
        `)
        .eq('period_id', periodId);
      if (error) throw error;
      return data as PayrollEntry[];
    },
    enabled: !!periodId,
  });
}
