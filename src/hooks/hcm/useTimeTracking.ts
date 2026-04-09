import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export function useTimeTracking() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

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
      const { id, ...rest } = data as TimeTrackingIntegration;
      const { error } = await supabase
        .from('time_tracking_integrations')
        .insert({ ...rest, company_id: companyId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_tracking_integrations'] });
      toast.success('Integração configurada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

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

  const saveTimeSummary = useMutation({
    mutationFn: async (data: {
      employee_id: string;
      work_date: string;
      entry_1?: string | null;
      exit_1?: string | null;
      entry_2?: string | null;
      exit_2?: string | null;
    }) => {
      if (!companyId) throw new Error('Empresa não encontrada');

      // Calcula horas trabalhadas
      const toMinutes = (t?: string | null) => {
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
      };
      const e1 = toMinutes(data.entry_1);
      const s1 = toMinutes(data.exit_1);
      const e2 = toMinutes(data.entry_2);
      const s2 = toMinutes(data.exit_2);

      let workedMinutes = 0;
      let breakMinutes = 0;
      if (e1 !== null && s1 !== null) workedMinutes += s1 - e1;
      if (e2 !== null && s2 !== null) workedMinutes += s2 - e2;
      if (s1 !== null && e2 !== null) breakMinutes = e2 - s1;

      const workedHours = workedMinutes / 60;
      const breakHours = breakMinutes / 60;
      const expectedHours = 8;
      const bankHours = workedHours - expectedHours;

      const payload = {
        company_id: companyId,
        employee_id: data.employee_id,
        work_date: data.work_date,
        entry_1: data.entry_1 || null,
        exit_1: data.exit_1 || null,
        entry_2: data.entry_2 || null,
        exit_2: data.exit_2 || null,
        worked_hours: Math.max(0, workedHours),
        break_hours: Math.max(0, breakHours),
        expected_hours: expectedHours,
        bank_hours: bankHours,
        overtime_50: bankHours > 0 && bankHours <= 2 ? bankHours : 0,
        overtime_100: bankHours > 2 ? bankHours - 2 : 0,
        night_hours: 0,
        is_holiday: false,
        is_weekend: [0, 6].includes(new Date(data.work_date + 'T12:00:00').getDay()),
      };

      const { data: existing } = await supabase
        .from('time_daily_summary')
        .select('id')
        .eq('company_id', companyId)
        .eq('employee_id', data.employee_id)
        .eq('work_date', data.work_date)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('time_daily_summary')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('time_daily_summary')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['time_daily_summary'] });
      queryClient.invalidateQueries({ queryKey: ['hour_bank'] });
      toast.success('Ponto registrado com sucesso!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    integrations: integrationsQuery.data || [],
    integrationsLoading: integrationsQuery.isLoading,
    createIntegration,
    timeSummary: timeSummaryQuery.data || [],
    timeSummaryLoading: timeSummaryQuery.isLoading,
    hourBank: hourBankQuery.data || [],
    hourBankLoading: hourBankQuery.isLoading,
    saveTimeSummary,
  };
}
