import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

export function useEmployees() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

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
      const { cargo, departamento, cost_center, manager, ...insertData } = data as EmployeeProfile;
      const { data: result, error } = await supabase
        .from('employees_profiles')
        .insert({ ...insertData, company_id: companyId })
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
      const { cargo, departamento, cost_center, manager, ...updateData } = data as EmployeeProfile;
      const { error } = await supabase
        .from('employees_profiles')
        .update(updateData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees_profiles'] });
      toast.success('Colaborador atualizado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return {
    employees: employeesQuery.data || [],
    employeesLoading: employeesQuery.isLoading,
    createEmployee,
    updateEmployee,
  };
}
