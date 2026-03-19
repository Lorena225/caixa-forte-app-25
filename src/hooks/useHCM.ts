// ============= HCM - BARREL EXPORT =============
// Re-exports from focused hooks for backward compatibility

export { useEmployees } from './hcm/useEmployees';
export type { EmployeeProfile } from './hcm/useEmployees';

export { useTimeTracking } from './hcm/useTimeTracking';
export type { TimeTrackingIntegration, TimeDailySummary, HourBank } from './hcm/useTimeTracking';

export { usePayroll, usePayrollEntries } from './hcm/usePayroll';
export type { PayrollPeriod, PayrollEntry, CommissionCalculation, Payslip } from './hcm/usePayroll';

export { useBenefitsAndRequests } from './hcm/useBenefitsAndRequests';
export type { EmployeeBenefit, EmployeeRequest } from './hcm/useBenefitsAndRequests';

export { useHCMKpis, usePeopleAnalytics } from './hcm/useHCMKpis';
export type { PeopleAnalyticsSnapshot } from './hcm/useHCMKpis';

// Legacy combined hook for pages that still import useHCM
import { useEmployees } from './hcm/useEmployees';
import { useTimeTracking } from './hcm/useTimeTracking';
import { usePayroll } from './hcm/usePayroll';
import { useBenefitsAndRequests } from './hcm/useBenefitsAndRequests';
import { useHCMKpis, usePeopleAnalytics } from './hcm/useHCMKpis';

export function useHCM() {
  const employees = useEmployees();
  const timeTracking = useTimeTracking();
  const payroll = usePayroll();
  const benefitsAndRequests = useBenefitsAndRequests();
  const hcmKpisQuery = useHCMKpis();
  const analyticsQuery = usePeopleAnalytics();

  return {
    ...employees,
    ...timeTracking,
    ...payroll,
    ...benefitsAndRequests,
    analytics: analyticsQuery.data || [],
    analyticsLoading: analyticsQuery.isLoading,
    hcmKpis: hcmKpisQuery.data,
    hcmKpisLoading: hcmKpisQuery.isLoading,
  };
}
