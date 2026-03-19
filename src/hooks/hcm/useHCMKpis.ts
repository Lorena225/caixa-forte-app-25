import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export function useHCMKpis() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
    queryKey: ['hcm_kpis', companyId],
    queryFn: async () => {
      if (!companyId) return null;

      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      const { data: employees } = await supabase
        .from('employees_profiles')
        .select('id, status, hire_date, termination_date, base_salary, birth_date')
        .eq('company_id', companyId);

      const totalColaboradores = employees?.length || 0;
      const ativos = employees?.filter(e => e.status === 'ativo').length || 0;
      const emFerias = employees?.filter(e => e.status === 'ferias').length || 0;
      const afastados = employees?.filter(e => e.status === 'afastado').length || 0;
      const emExperiencia = employees?.filter(e => e.status === 'experiencia').length || 0;

      const aniversariantes = employees?.filter(e => {
        if (!e.birth_date) return false;
        return new Date(e.birth_date).getMonth() + 1 === currentMonth;
      }).length || 0;

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

      const turnoverRate = totalColaboradores > 0
        ? ((desligamentosMes / totalColaboradores) * 100)
        : 0;

      const totalFolhaBase = employees?.reduce((sum, e) => sum + (e.base_salary || 0), 0) || 0;

      const { data: ultimaFolha } = await supabase
        .from('payroll_periods')
        .select('total_net, reference_month, reference_year, status')
        .eq('company_id', companyId)
        .eq('status', 'pago')
        .order('reference_year', { ascending: false })
        .order('reference_month', { ascending: false })
        .limit(1)
        .maybeSingle();

      const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0];
      const { data: horasExtras } = await supabase
        .from('time_daily_summary')
        .select('overtime_50, overtime_100')
        .eq('company_id', companyId)
        .gte('work_date', startOfMonth);

      const totalHorasExtras = horasExtras?.reduce(
        (sum, h) => sum + (h.overtime_50 || 0) + (h.overtime_100 || 0), 0
      ) || 0;

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
        turnoverRate: parseFloat(turnoverRate.toFixed(1)),
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
}

export function usePeopleAnalytics() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;

  return useQuery({
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
}
