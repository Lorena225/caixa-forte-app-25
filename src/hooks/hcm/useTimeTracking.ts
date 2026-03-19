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

  return {
    integrations: integrationsQuery.data || [],
    integrationsLoading: integrationsQuery.isLoading,
    createIntegration,
    timeSummary: timeSummaryQuery.data || [],
    timeSummaryLoading: timeSummaryQuery.isLoading,
    hourBank: hourBankQuery.data || [],
    hourBankLoading: hourBankQuery.isLoading,
  };
}
