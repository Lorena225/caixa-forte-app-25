import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface ShopFloorAppointment {
  id: string;
  company_id: string;
  production_order_id: string;
  operation_id?: string;
  operator_id?: string;
  status: string;
  start_time: string;
  end_time?: string;
  pause_start?: string;
  pause_reason?: string;
  total_pause_minutes: number;
  quantity_produced: number;
  quantity_scrapped: number;
  scrap_reason?: string;
}

export function useShopFloorAppointment(orderId: string | undefined) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id;

  // Buscar apontamento ativo para a OP
  const activeAppointmentQuery = useQuery({
    queryKey: ['active-appointment', orderId],
    queryFn: async () => {
      if (!orderId || !companyId) return null;
      
      const { data, error } = await supabase
        .from('production_appointments')
        .select('*')
        .eq('production_order_id', orderId)
        .in('status', ['in_progress', 'paused'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data as ShopFloorAppointment | null;
    },
    enabled: !!orderId && !!companyId,
  });

  // Iniciar apontamento
  const startAppointment = useMutation({
    mutationFn: async ({ orderId, operationId }: { orderId: string; operationId?: string }) => {
      const { data, error } = await supabase
        .rpc('start_production_appointment', {
          p_order_id: orderId,
          p_operation_id: operationId || null,
          p_operator_id: null
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-appointment'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Produção iniciada!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Pausar apontamento
  const pauseAppointment = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason: string }) => {
      const { error } = await supabase
        .rpc('pause_production_appointment', {
          p_appointment_id: appointmentId,
          p_reason: reason
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-appointment'] });
      toast.info('Produção pausada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Retomar apontamento
  const resumeAppointment = useMutation({
    mutationFn: async ({ appointmentId }: { appointmentId: string }) => {
      const { error } = await supabase
        .rpc('resume_production_appointment', {
          p_appointment_id: appointmentId
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-appointment'] });
      toast.success('Produção retomada!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  // Finalizar apontamento
  const finishAppointment = useMutation({
    mutationFn: async ({ 
      appointmentId, 
      quantityProduced, 
      quantityRejected = 0, 
      rejectionReason 
    }: { 
      appointmentId: string; 
      quantityProduced: number;
      quantityRejected?: number;
      rejectionReason?: string;
    }) => {
      const { error } = await supabase
        .rpc('finish_production_appointment', {
          p_appointment_id: appointmentId,
          p_quantity_produced: quantityProduced,
          p_quantity_rejected: quantityRejected,
          p_rejection_reason: rejectionReason || null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-appointment'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Apontamento finalizado! Estoque atualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    activeAppointment: activeAppointmentQuery.data,
    isLoading: activeAppointmentQuery.isLoading,
    startAppointment,
    pauseAppointment,
    resumeAppointment,
    finishAppointment,
  };
}

// Hook para conversão de MRP
export function useMRPConversion() {
  const queryClient = useQueryClient();

  const convertToPurchase = useMutation({
    mutationFn: async (mrpId: string) => {
      const { data, error } = await supabase
        .rpc('convert_mrp_to_purchase_requisition', { p_mrp_id: mrpId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrp-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      toast.success('Requisição de Compra criada!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertToProduction = useMutation({
    mutationFn: async (mrpId: string) => {
      const { data, error } = await supabase
        .rpc('convert_mrp_to_production_order', { p_mrp_id: mrpId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mrp-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Ordem de Produção criada!');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const convertBatch = useMutation({
    mutationFn: async (mrpIds: string[]) => {
      const { data, error } = await supabase
        .rpc('convert_mrp_batch', { p_mrp_ids: mrpIds });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mrp-requirements'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-requisitions'] });
      const successCount = data?.filter((r: any) => r.success).length || 0;
      toast.success(`${successCount} itens convertidos com sucesso!`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    convertToPurchase,
    convertToProduction,
    convertBatch,
  };
}
