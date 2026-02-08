import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface EmployeeProfile {
  id: string;
  company_id: string;
  counterparty_id: string | null;
  user_id: string | null;
  registration_number: string | null;
  full_name: string;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  gender: string | null;
  marital_status: string | null;
  education_level: string | null;
  personal_email: string | null;
  corporate_email: string | null;
  phone: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  contract_type: 'clt' | 'pj' | 'estagio' | 'temporario' | 'intermitente';
  journey_type: '44h' | '36h' | '12x36' | 'flexivel' | 'parcial';
  weekly_hours: number;
  hire_date: string;
  termination_date: string | null;
  experience_end_date: string | null;
  status: 'ativo' | 'ferias' | 'afastado' | 'desligado' | 'experiencia';
  position_id: string | null;
  department_id: string | null;
  cost_center_id: string | null;
  manager_id: string | null;
  work_location: string | null;
  base_salary: number;
  salary_type: string;
  hourly_rate: number | null;
  pj_hourly_rate: number | null;
  has_vt: boolean;
  vt_daily_value: number;
  has_vr: boolean;
  vr_daily_value: number;
  has_health_plan: boolean;
  health_plan_value: number;
  health_plan_dependents: number;
  bank_code: string | null;
  bank_agency: string | null;
  bank_account: string | null;
  bank_account_type: string | null;
  pix_key: string | null;
  ctps_number: string | null;
  ctps_series: string | null;
  pis_pasep: string | null;
  commission_rate: number;
  commission_base: string;
  bonus_eligible: boolean;
  photo_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  cargo?: { id: string; nome: string };
  departamento?: { id: string; nome: string };
  cost_center?: { id: string; name: string };
  manager?: { id: string; full_name: string };
}

export interface TimeTrackingIntegration {
  id: string;
  company_id: string;
  provider: string;
  provider_name: string;
  api_url: string | null;
  company_code: string | null;
  sync_enabled: boolean;
  sync_frequency: string;
  last_sync_at: string | null;
  last_sync_status: string | null;
  last_sync_error: string | null;
  is_active: boolean;
  created_at: string;
}

export interface TimeDailySummary {
  id: string;
  company_id: string;
  employee_id: string;
  work_date: string;
  entry_1: string | null;
  exit_1: string | null;
  entry_2: string | null;
  exit_2: string | null;
  expected_hours: number;
  worked_hours: number;
  break_hours: number;
  overtime_50: number;
  overtime_100: number;
  night_hours: number;
  bank_hours: number;
  is_holiday: boolean;
  is_weekend: boolean;
  absence_type: string | null;
  approved_at: string | null;
  employee?: { id: string; full_name: string; registration_number: string | null };
}

export interface HourBank {
  id: string;
  company_id: string;
  employee_id: string;
  reference_date: string;
  transaction_type: string;
  hours: number;
  balance_after: number;
  description: string | null;
  expires_at: string | null;
  employee?: { id: string; full_name: string };
}

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

export interface PeopleAnalyticsSnapshot {
  id: string;
  company_id: string;
  snapshot_date: string;
  total_employees: number;
  active_employees: number;
  on_vacation: number;
  on_leave: number;
  terminated_mtd: number;
  hired_mtd: number;
  total_payroll_cost: number;
  total_benefits_cost: number;
  total_overtime_cost: number;
  turnover_rate: number;
  absenteeism_rate: number;
  avg_salary: number;
  headcount_cost_ratio: number | null;
}

// Hook principal
export function useHCM() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  // ========== EMPLOYEES ==========
  const employeesQuery = useQuery({
    queryKey: ['employees_profiles', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('employees_profiles')
        .select(`
          *,
          cargo:cargos(id, nome),
          departamento:departamentos(id, nome),
          cost_center:cost_centers(id, name)
        `)
        .eq('company_id', companyId)
        .order('full_name');
      if (error) throw error;
      return data as EmployeeProfile[];
    },
    enabled: !!companyId,
  });

  const createEmployee = useMutation({
    mutationFn: async (data: Partial<EmployeeProfile>) => {
      if (!companyId) throw new Error('Company required');
      const { data: result, error } = await supabase
        .from('employees_profiles')
        .insert({ ...data, company_id: companyId } as never)
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_profiles'] });
      toast.success('Colaborador cadastrado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateEmployee = useMutation({
    mutationFn: async ({ id, ...data }: Partial<EmployeeProfile> & { id: string }) => {
      const { error } = await supabase
        .from('employees_profiles')
        .update(data as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_profiles'] });
      toast.success('Colaborador atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== TIME TRACKING INTEGRATIONS ==========
  const integrationsQuery = useQuery({
    queryKey: ['time_tracking_integrations', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('time_tracking_integrations')
        .select('*')
        .eq('company_id', companyId)
        .order('provider_name');
      if (error) throw error;
      return data as TimeTrackingIntegration[];
    },
    enabled: !!companyId,
  });

  const createIntegration = useMutation({
    mutationFn: async (data: Partial<TimeTrackingIntegration>) => {
      if (!companyId) throw new Error('Company required');
      const { error } = await supabase
        .from('time_tracking_integrations')
        .insert({ ...data, company_id: companyId } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_tracking_integrations'] });
      toast.success('Integração configurada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== TIME DAILY SUMMARY ==========
  const timeSummaryQuery = useQuery({
    queryKey: ['time_daily_summary', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('time_daily_summary')
        .select(`
          *,
          employee:employees_profiles(id, full_name, registration_number)
        `)
        .eq('company_id', companyId)
        .order('work_date', { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as TimeDailySummary[];
    },
    enabled: !!companyId,
  });

  // ========== HOUR BANK ==========
  const hourBankQuery = useQuery({
    queryKey: ['hour_bank', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('hour_bank')
        .select(`
          *,
          employee:employees_profiles(id, full_name)
        `)
        .eq('company_id', companyId)
        .order('reference_date', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as HourBank[];
    },
    enabled: !!companyId,
  });

  // ========== PAYROLL PERIODS ==========
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
      const { data: result, error } = await supabase
        .from('payroll_periods')
        .insert({ ...data, company_id: companyId } as never)
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

  // ========== PAYROLL ENTRIES ==========
  const getPayrollEntries = (periodId: string) => {
    return useQuery({
      queryKey: ['payroll_entries', periodId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('payroll_entries')
          .select(`
            *,
            employee:employees_profiles(id, full_name, registration_number)
          `)
          .eq('period_id', periodId)
          .order('employee(full_name)');
        if (error) throw error;
        return data as PayrollEntry[];
      },
      enabled: !!periodId,
    });
  };

  // ========== COMMISSION CALCULATIONS ==========
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

  // ========== EMPLOYEE BENEFITS ==========
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

  // ========== EMPLOYEE REQUESTS ==========
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

  // ========== PAYSLIPS ==========
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

  // ========== PEOPLE ANALYTICS ==========
  const analyticsQuery = useQuery({
    queryKey: ['people_analytics_snapshots', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('people_analytics_snapshots')
        .select('*')
        .eq('company_id', companyId)
        .order('snapshot_date', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as PeopleAnalyticsSnapshot[];
    },
    enabled: !!companyId,
  });

  // ========== HCM KPIs ==========
  const hcmKpisQuery = useQuery({
    queryKey: ['hcm_kpis', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      // Contagem de colaboradores por status
      const { data: employees } = await supabase
        .from('employees_profiles')
        .select('id, status, hire_date, termination_date, base_salary, birth_date')
        .eq('company_id', companyId);

      const totalColaboradores = employees?.length || 0;
      const ativos = employees?.filter(e => e.status === 'ativo').length || 0;
      const emFerias = employees?.filter(e => e.status === 'ferias').length || 0;
      const afastados = employees?.filter(e => e.status === 'afastado').length || 0;
      const emExperiencia = employees?.filter(e => e.status === 'experiencia').length || 0;

      // Aniversariantes do mês
      const aniversariantes = employees?.filter(e => {
        if (!e.birth_date) return false;
        return new Date(e.birth_date).getMonth() + 1 === currentMonth;
      }).length || 0;

      // Contratações e desligamentos do mês
      const contratacoesMes = employees?.filter(e => {
        if (!e.hire_date) return false;
        const d = new Date(e.hire_date);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
      }).length || 0;

      const desligamentosMes = employees?.filter(e => {
        if (!e.termination_date) return false;
        const d = new Date(e.termination_date);
        return d.getMonth() + 1 === currentMonth && d.getFullYear() === currentYear;
      }).length || 0;

      // Turnover
      const turnoverRate = totalColaboradores > 0
        ? ((desligamentosMes / totalColaboradores) * 100).toFixed(1)
        : '0';

      // Folha de salários (base apenas, sem encargos)
      const totalFolhaBase = employees?.reduce((sum, e) => sum + (e.base_salary || 0), 0) || 0;

      // Última folha processada
      const { data: ultimaFolha } = await supabase
        .from('payroll_periods')
        .select('total_net, reference_month, reference_year, status')
        .eq('company_id', companyId)
        .eq('status', 'pago')
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Horas extras do mês
      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const { data: horasExtras } = await supabase
        .from('time_daily_summary')
        .select('overtime_50, overtime_100')
        .eq('company_id', companyId)
        .gte('work_date', startOfMonth);

      const totalHorasExtras = horasExtras?.reduce(
        (sum, h) => sum + (h.overtime_50 || 0) + (h.overtime_100 || 0), 0
      ) || 0;

      // Solicitações pendentes
      const { count: solicitacoesPendentes } = await supabase
        .from('employee_requests')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('status', 'pendente');

      return {
        totalColaboradores,
        ativos,
        emFerias,
        afastados,
        emExperiencia,
        aniversariantes,
        contratacoesMes,
        desligamentosMes,
        turnoverRate: parseFloat(turnoverRate as string),
        totalFolhaBase,
        ultimaFolhaPaga: ultimaFolha?.total_net || 0,
        mesUltimaFolha: ultimaFolha 
          ? `${ultimaFolha.reference_month}/${ultimaFolha.reference_year}` 
          : '-',
        totalHorasExtras,
        solicitacoesPendentes: solicitacoesPendentes || 0,
      };
    },
    enabled: !!companyId,
  });

  return {
    // Employees
    employees: employeesQuery.data || [],
    employeesLoading: employeesQuery.isLoading,
    createEmployee,
    updateEmployee,

    // Time Tracking Integrations
    integrations: integrationsQuery.data || [],
    integrationsLoading: integrationsQuery.isLoading,
    createIntegration,

    // Time Summary
    timeSummary: timeSummaryQuery.data || [],
    timeSummaryLoading: timeSummaryQuery.isLoading,

    // Hour Bank
    hourBank: hourBankQuery.data || [],
    hourBankLoading: hourBankQuery.isLoading,

    // Payroll
    payrollPeriods: payrollPeriodsQuery.data || [],
    payrollPeriodsLoading: payrollPeriodsQuery.isLoading,
    createPayrollPeriod,
    getPayrollEntries,

    // Commissions
    commissions: commissionsQuery.data || [],
    commissionsLoading: commissionsQuery.isLoading,

    // Benefits
    employeeBenefits: employeeBenefitsQuery.data || [],
    employeeBenefitsLoading: employeeBenefitsQuery.isLoading,

    // Requests
    requests: requestsQuery.data || [],
    requestsLoading: requestsQuery.isLoading,
    approveRequest,
    rejectRequest,

    // Payslips
    payslips: payslipsQuery.data || [],
    payslipsLoading: payslipsQuery.isLoading,

    // Analytics
    analytics: analyticsQuery.data || [],
    analyticsLoading: analyticsQuery.isLoading,

    // KPIs
    hcmKpis: hcmKpisQuery.data,
    hcmKpisLoading: hcmKpisQuery.isLoading,
  };
}
