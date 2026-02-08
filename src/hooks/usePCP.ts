import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types - Simplificados para evitar erros de tipagem estrita
export interface WorkCenter {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  work_center_type: string;
  capacity_hours_day: number;
  efficiency_rate: number;
  hourly_cost: number;
  setup_time_minutes: number;
  cost_center_id?: string;
  is_active: boolean;
  created_at?: string;
}

export interface IndustrialBOM {
  id: string;
  company_id: string;
  product_id: string;
  version: string;
  description?: string;
  status: string;
  effective_date?: string;
  standard_batch_size: number;
  standard_lead_time_days: number;
  notes?: string;
  created_at?: string;
  products?: { name: string; code?: string };
}

export interface BOMComponent {
  id: string;
  bom_id: string;
  component_product_id: string;
  quantity: number;
  scrap_rate: number;
  is_phantom: boolean;
  position: number;
  notes?: string;
  products?: { name: string; code?: string };
}

export interface IndustrialRouting {
  id: string;
  company_id: string;
  product_id: string;
  bom_id?: string;
  version: string;
  description?: string;
  status: string;
  total_lead_time_hours: number;
  created_at?: string;
  products?: { name: string; code?: string };
}

export interface RoutingOperation {
  id: string;
  routing_id: string;
  operation_number: number;
  operation_name: string;
  work_center_id: string;
  setup_time_minutes: number;
  run_time_minutes: number;
  wait_time_minutes: number;
  move_time_minutes: number;
  overlap_percent: number;
  description?: string;
  is_outsourced: boolean;
  outsource_cost?: number;
  work_centers?: { name: string; code: string; hourly_cost: number };
}

export interface ProductionOrder {
  id: string;
  company_id: string;
  order_number: string;
  product_id: string;
  bom_id?: string;
  routing_id?: string;
  sales_order_id?: string;
  quantity_planned: number;
  quantity_completed: number;
  quantity_scrapped: number;
  status: string;
  priority: number;
  planned_start_date?: string;
  planned_end_date?: string;
  actual_start_date?: string;
  actual_end_date?: string;
  standard_material_cost: number;
  standard_labor_cost: number;
  actual_material_cost: number;
  actual_labor_cost: number;
  variance_amount: number;
  notes?: string;
  created_at?: string;
  products?: { name: string; code?: string };
  operations?: ProductionOrderOperation[];
  materials?: MaterialConsumption[];
}

export interface ProductionOrderOperation {
  id: string;
  production_order_id: string;
  operation_number: number;
  operation_name: string;
  work_center_id: string;
  planned_setup_time: number;
  planned_run_time: number;
  actual_setup_time: number;
  actual_run_time: number;
  quantity_completed: number;
  quantity_scrapped: number;
  status: string;
  started_at?: string;
  completed_at?: string;
  work_centers?: { name: string; code: string; hourly_cost: number };
}

export interface MaterialConsumption {
  id: string;
  production_order_id: string;
  product_id: string;
  planned_quantity: number;
  consumed_quantity: number;
  unit_cost: number;
  total_cost: number;
  consumed_at?: string;
  products?: { name: string; code?: string; current_stock?: number };
}

export interface ProductionAppointment {
  id: string;
  company_id: string;
  production_order_id: string;
  operation_id?: string;
  work_center_id?: string;
  operator_id?: string;
  appointment_type: string;
  quantity_produced: number;
  quantity_scrapped: number;
  scrap_reason?: string;
  pause_reason?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  notes?: string;
  created_at?: string;
}

export interface MRPRequirement {
  id: string;
  company_id: string;
  calculation_run_id: string;
  product_id: string;
  requirement_type: string;
  source_type?: string;
  required_date: string;
  gross_requirement: number;
  available_stock: number;
  reserved_stock: number;
  net_requirement: number;
  suggested_order_qty: number;
  suggested_order_date?: string;
  status: string;
  products?: { name: string; code?: string };
}

export interface PurchaseRequisition {
  id: string;
  company_id: string;
  requisition_number: string;
  product_id: string;
  quantity: number;
  required_date: string;
  estimated_unit_cost?: number;
  estimated_total?: number;
  preferred_supplier_id?: string;
  status: string;
  created_at?: string;
  products?: { name: string; code?: string };
  counterparties?: { name: string };
}

// Hook principal
export function usePCP() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const companyId = currentCompany?.id;

  // Work Centers
  const workCentersQuery = useQuery({
    queryKey: ['work-centers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('work_centers')
        .select('*')
        .eq('company_id', companyId)
        .order('code');
      if (error) throw error;
      return (data || []) as unknown as WorkCenter[];
    },
    enabled: !!companyId,
  });

  // BOMs
  const bomsQuery = useQuery({
    queryKey: ['industrial-boms', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('industrial_boms')
        .select(`*, products:product_id (name, code)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IndustrialBOM[];
    },
    enabled: !!companyId,
  });

  // Routings
  const routingsQuery = useQuery({
    queryKey: ['industrial-routings', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('industrial_routings')
        .select(`*, products:product_id (name, code)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as IndustrialRouting[];
    },
    enabled: !!companyId,
  });

  // Production Orders
  const productionOrdersQuery = useQuery({
    queryKey: ['production-orders', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('production_orders')
        .select(`*, products:product_id (name, code)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProductionOrder[];
    },
    enabled: !!companyId,
  });

  // Purchase Requisitions
  const purchaseRequisitionsQuery = useQuery({
    queryKey: ['purchase-requisitions', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('purchase_requisitions')
        .select(`*, products:product_id (name, code), counterparties:preferred_supplier_id (name)`)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PurchaseRequisition[];
    },
    enabled: !!companyId,
  });

  // Mutations
  const createWorkCenter = useMutation({
    mutationFn: async (data: Partial<WorkCenter>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const insertData = { ...data, company_id: companyId };
      const { error } = await supabase
        .from('work_centers')
        .insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-centers'] });
      toast.success('Centro de trabalho criado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createBOM = useMutation({
    mutationFn: async (data: { bom: Partial<IndustrialBOM>; components: Partial<BOMComponent>[] }) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const bomInsert = { ...data.bom, company_id: companyId };
      const { data: bomData, error: bomError } = await supabase
        .from('industrial_boms')
        .insert(bomInsert as any)
        .select()
        .single();
      if (bomError) throw bomError;

      if (data.components.length > 0) {
        const componentsInsert = data.components.map(c => ({
          bom_id: bomData.id,
          component_product_id: c.component_product_id,
          quantity: c.quantity || 1,
          scrap_rate: c.scrap_rate || 0,
          is_phantom: c.is_phantom || false,
          position: c.position || 0,
          notes: c.notes || null,
        }));
        const { error: compError } = await supabase
          .from('bom_components')
          .insert(componentsInsert as any);
        if (compError) throw compError;
      }

      return bomData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['industrial-boms'] });
      toast.success('BOM criada com sucesso');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createProductionOrder = useMutation({
    mutationFn: async (data: Partial<ProductionOrder>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      
      const { data: countData } = await supabase
        .from('production_orders')
        .select('id', { count: 'exact' })
        .eq('company_id', companyId);
      
      const orderNumber = `OP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String((countData?.length || 0) + 1).padStart(4, '0')}`;

      const insertData = { ...data, company_id: companyId, order_number: orderNumber };
      const { error } = await supabase
        .from('production_orders')
        .insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Ordem de produção criada');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateProductionOrderStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'in_progress') {
        updates.actual_start_date = new Date().toISOString();
      }
      
      const { error } = await supabase
        .from('production_orders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Status atualizado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const createAppointment = useMutation({
    mutationFn: async (data: Partial<ProductionAppointment>) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const insertData = { ...data, company_id: companyId };
      const { error } = await supabase
        .from('production_appointments')
        .insert(insertData as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-appointments'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Apontamento registrado');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const runMRP = useMutation({
    mutationFn: async (horizonDays: number = 30) => {
      if (!companyId) throw new Error('Empresa não selecionada');
      const { data, error } = await supabase
        .rpc('run_mrp_calculation', { p_company_id: companyId, p_horizon_days: horizonDays });
      if (error) throw error;
      return data;
    },
    onSuccess: (runId) => {
      queryClient.invalidateQueries({ queryKey: ['mrp-requirements'] });
      toast.success(`MRP executado com sucesso!`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const closeProductionOrder = useMutation({
    mutationFn: async ({ orderId, quantityCompleted }: { orderId: string; quantityCompleted: number }) => {
      const { data, error } = await supabase
        .rpc('close_production_order', { 
          p_production_order_id: orderId, 
          p_quantity_completed: quantityCompleted 
        });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('OP fechada com sucesso! Estoque atualizado.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return {
    workCenters: workCentersQuery.data || [],
    workCentersLoading: workCentersQuery.isLoading,
    boms: bomsQuery.data || [],
    bomsLoading: bomsQuery.isLoading,
    routings: routingsQuery.data || [],
    routingsLoading: routingsQuery.isLoading,
    productionOrders: productionOrdersQuery.data || [],
    productionOrdersLoading: productionOrdersQuery.isLoading,
    purchaseRequisitions: purchaseRequisitionsQuery.data || [],
    purchaseRequisitionsLoading: purchaseRequisitionsQuery.isLoading,
    createWorkCenter,
    createBOM,
    createProductionOrder,
    updateProductionOrderStatus,
    createAppointment,
    runMRP,
    closeProductionOrder,
  };
}

// Hook para detalhes de uma OP
export function useProductionOrderDetails(orderId: string | undefined) {
  return useQuery({
    queryKey: ['production-order-details', orderId],
    queryFn: async () => {
      if (!orderId) return null;
      
      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .select(`*, products:product_id (name, code)`)
        .eq('id', orderId)
        .single();
      if (orderError) throw orderError;

      const { data: operations } = await supabase
        .from('production_order_operations')
        .select(`*, work_centers:work_center_id (name, code, hourly_cost)`)
        .eq('production_order_id', orderId)
        .order('operation_number');

      const { data: materials } = await supabase
        .from('production_material_consumption')
        .select(`*, products:product_id (name, code, current_stock)`)
        .eq('production_order_id', orderId);

      const { data: appointments } = await supabase
        .from('production_appointments')
        .select('*')
        .eq('production_order_id', orderId)
        .order('created_at', { ascending: false });

      return {
        ...order,
        operations: operations || [],
        materials: materials || [],
        appointments: appointments || [],
      } as unknown as ProductionOrder & { appointments: ProductionAppointment[] };
    },
    enabled: !!orderId,
  });
}

// Hook para resultados MRP
export function useMRPResults(runId: string | undefined) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['mrp-requirements', runId],
    queryFn: async () => {
      if (!runId || !currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('mrp_requirements')
        .select(`*, products:product_id (name, code)`)
        .eq('calculation_run_id', runId)
        .order('required_date');
      
      if (error) throw error;
      return (data || []) as unknown as MRPRequirement[];
    },
    enabled: !!runId && !!currentCompany?.id,
  });
}
