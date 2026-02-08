import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ========================================
// Types
// ========================================

export interface Seller {
  id: string;
  company_id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  hire_date?: string;
  termination_date?: string;
  base_commission_percent: number;
  commission_type: string;
  team_id?: string;
  manager_id?: string;
  is_active: boolean;
  goal_monthly: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineStage {
  id: string;
  company_id?: string;
  pipeline_id?: string;
  name: string;
  color: string;
  position: number;
  sort_order?: number;
  probability: number;
  days_expected?: number;
  rotting_days?: number;
  stage_type?: string;
  is_won: boolean;
  is_lost: boolean;
  is_active: boolean;
  created_at: string;
}

// Alias for compatibility
export type Stage = PipelineStage;

export interface Pipeline {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  pipeline_type: string;
  is_default: boolean;
  is_active: boolean;
  won_action_type?: string;
  won_create_order?: boolean;
  won_create_cashflow?: boolean;
  won_create_stock_order?: boolean;
  won_create_project?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lead {
  id: string;
  company_id: string;
  code?: string;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  position?: string;
  source?: string;
  source_detail?: string;
  status: string;
  temperature: string;
  seller_id?: string;
  seller?: Seller;
  notes?: string;
  converted_at?: string;
  converted_to_opportunity_id?: string;
  tags?: string[];
  last_contact_at?: string;
  next_follow_up_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Counterparty {
  id: string;
  name: string;
  document?: string;
  type?: string;
}

export interface Opportunity {
  id: string;
  company_id: string;
  code?: string;
  title: string;
  description?: string;
  counterparty_id?: string;
  counterparty?: Counterparty;
  lead_id?: string;
  pipeline_id?: string;
  stage_id: string;
  stage?: PipelineStage;
  seller_id?: string;
  seller?: Seller;
  owner_id?: string;
  amount: number;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  status: string;
  loss_reason?: string;
  loss_notes?: string;
  won_venda_id?: string;
  source?: string;
  priority: string;
  tags?: string[];
  last_activity_at?: string;
  next_step?: string;
  next_step_date?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CRMActivity {
  id: string;
  company_id: string;
  opportunity_id?: string;
  lead_id?: string;
  counterparty_id?: string;
  seller_id?: string;
  owner_id?: string;
  activity_type: string;
  subject: string;
  description?: string;
  scheduled_at?: string;
  completed_at?: string;
  duration_minutes?: number;
  outcome?: string;
  next_action?: string;
  is_completed: boolean;
  created_at: string;
  owner?: { full_name?: string };
}

// Alias for compatibility
export type Activity = CRMActivity;

export interface Quote {
  id: string;
  company_id: string;
  opportunity_id?: string;
  quote_number: string;
  title?: string;
  total_amount: number;
  status: string;
  valid_until?: string;
  created_at: string;
}

export interface Commission {
  id: string;
  company_id: string;
  seller_id: string;
  seller?: Seller;
  venda_id?: string;
  opportunity_id?: string;
  rule_id?: string;
  reference_period?: string;
  sale_amount: number;
  commission_percent?: number;
  commission_amount: number;
  bonus_amount: number;
  total_amount: number;
  status: string;
  approved_at?: string;
  paid_at?: string;
  payment_reference?: string;
  notes?: string;
  created_at: string;
}

export interface SalesGoal {
  id: string;
  company_id: string;
  seller_id?: string;
  seller?: Seller;
  goal_type: string;
  period_type: string;
  period_year: number;
  period_month?: number;
  target_amount: number;
  achieved_amount: number;
  achievement_percent: number;
  status: string;
  notes?: string;
  created_at: string;
}

export interface Commission {
  id: string;
  company_id: string;
  seller_id: string;
  seller?: Seller;
  venda_id?: string;
  opportunity_id?: string;
  rule_id?: string;
  reference_period?: string;
  sale_amount: number;
  commission_percent?: number;
  commission_amount: number;
  bonus_amount: number;
  total_amount: number;
  status: string;
  approved_at?: string;
  paid_at?: string;
  notes?: string;
  created_at: string;
}

export interface SalesGoal {
  id: string;
  company_id: string;
  seller_id?: string;
  seller?: Seller;
  goal_type: string;
  period_type: string;
  period_year: number;
  period_month?: number;
  target_amount: number;
  achieved_amount: number;
  achievement_percent: number;
  status: string;
  notes?: string;
  created_at: string;
}

// ========================================
// Sellers Hook
// ========================================

export function useSellers() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sellers", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("name");
      if (error) throw error;
      return (data || []) as Seller[];
    },
    enabled: !!currentCompany?.id,
  });

  const createSeller = useMutation({
    mutationFn: async (seller: Partial<Seller>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("sellers")
        .insert({ ...seller, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      toast.success("Vendedor criado com sucesso");
    },
    onError: (error) => toast.error("Erro ao criar vendedor: " + error.message),
  });

  const updateSeller = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Seller> & { id: string }) => {
      const { error } = await supabase.from("sellers").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      toast.success("Vendedor atualizado");
    },
    onError: (error) => toast.error("Erro ao atualizar: " + error.message),
  });

  return { ...query, createSeller, updateSeller };
}

// ========================================
// Pipeline Stages Hook
// ========================================

export function usePipelineStages() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["pipeline_stages", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("position");
      if (error) throw error;
      return (data || []) as PipelineStage[];
    },
    enabled: !!currentCompany?.id,
  });

  const createStage = useMutation({
    mutationFn: async (stage: Partial<PipelineStage>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({ ...stage, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast.success("Estágio criado");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<PipelineStage> & { id: string }) => {
      const { error } = await supabase.from("pipeline_stages").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline_stages"] });
      toast.success("Estágio atualizado");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  return { ...query, createStage, updateStage };
}

// ========================================
// Leads Hook
// ========================================

export function useLeads(filters?: { status?: string; seller_id?: string; search?: string }) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leads", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase
        .from("leads")
        .select("*, seller:sellers(*)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.seller_id) q = q.eq("seller_id", filters.seller_id);
      if (filters?.search) q = q.or(`name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,company_name.ilike.%${filters.search}%`);

      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!currentCompany?.id,
  });

  const createLead = useMutation({
    mutationFn: async (lead: Partial<Lead>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("leads")
        .insert({ ...lead, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead criado com sucesso");
    },
    onError: (error) => toast.error("Erro ao criar lead: " + error.message),
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead atualizado");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const convertToOpportunity = useMutation({
    mutationFn: async ({ leadId, opportunityData }: { leadId: string; opportunityData: Partial<Opportunity> }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      
      // Create opportunity
      const { data: opp, error: oppError } = await supabase
        .from("opportunities")
        .insert({ ...opportunityData, lead_id: leadId, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (oppError) throw oppError;

      // Update lead
      const { error: leadError } = await supabase
        .from("leads")
        .update({ status: "converted", converted_at: new Date().toISOString(), converted_to_opportunity_id: opp.id })
        .eq("id", leadId);
      if (leadError) throw leadError;

      return opp;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Lead convertido em oportunidade");
    },
    onError: (error) => toast.error("Erro ao converter: " + error.message),
  });

  return { ...query, createLead, updateLead, convertToOpportunity };
}

// ========================================
// Opportunities Hook
// ========================================

export function useOpportunities(filters?: { status?: string; stage_id?: string; seller_id?: string }) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["opportunities", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase
        .from("opportunities")
        .select("*, stage:pipeline_stages(*), seller:sellers(*)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.stage_id) q = q.eq("stage_id", filters.stage_id);
      if (filters?.seller_id) q = q.eq("seller_id", filters.seller_id);

      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data || []) as Opportunity[];
    },
    enabled: !!currentCompany?.id,
  });

  const createOpportunity = useMutation({
    mutationFn: async (opp: Partial<Opportunity>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("opportunities")
        .insert({ ...opp, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade criada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const updateOpportunity = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Opportunity> & { id: string }) => {
      const { error } = await supabase.from("opportunities").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade atualizada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const moveOpportunity = useMutation({
    mutationFn: async ({ id, stage_id, probability }: { id: string; stage_id: string; probability?: number }) => {
      const updates: Record<string, unknown> = { stage_id, last_activity_at: new Date().toISOString() };
      if (probability !== undefined) updates.probability = probability;
      const { error } = await supabase.from("opportunities").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });

  const winOpportunity = useMutation({
    mutationFn: async ({ id, venda_id }: { id: string; venda_id?: string }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ 
          status: "won", 
          actual_close_date: new Date().toISOString().split("T")[0],
          won_venda_id: venda_id 
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade marcada como ganha!");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const loseOpportunity = useMutation({
    mutationFn: async ({ id, reason, notes }: { id: string; reason: string; notes?: string }) => {
      const { error } = await supabase
        .from("opportunities")
        .update({ 
          status: "lost", 
          actual_close_date: new Date().toISOString().split("T")[0],
          loss_reason: reason,
          loss_notes: notes
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade marcada como perdida");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  return { ...query, createOpportunity, updateOpportunity, moveOpportunity, winOpportunity, loseOpportunity };
}

// ========================================
// CRM Activities Hook
// ========================================

export function useCRMActivities(filters?: { opportunity_id?: string; lead_id?: string }) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crm_activities", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase
        .from("crm_activities")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.opportunity_id) q = q.eq("opportunity_id", filters.opportunity_id);
      if (filters?.lead_id) q = q.eq("lead_id", filters.lead_id);

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return (data || []) as CRMActivity[];
    },
    enabled: !!currentCompany?.id,
  });

  const createActivity = useMutation({
    mutationFn: async (activity: Partial<CRMActivity>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("crm_activities")
        .insert({ ...activity, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_activities"] });
      toast.success("Atividade registrada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  return { ...query, createActivity };
}

// ========================================
// Commissions Hook
// ========================================

export function useCommissions(filters?: { seller_id?: string; status?: string; period?: string }) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["commissions", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase
        .from("commissions")
        .select("*, seller:sellers(*)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (filters?.seller_id) q = q.eq("seller_id", filters.seller_id);
      if (filters?.status) q = q.eq("status", filters.status);
      if (filters?.period) q = q.eq("reference_period", filters.period);

      const { data, error } = await q.limit(500);
      if (error) throw error;
      return (data || []) as Commission[];
    },
    enabled: !!currentCompany?.id,
  });

  const approveCommission = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("commissions")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Comissão aprovada");
    },
  });

  const payCommission = useMutation({
    mutationFn: async ({ id, reference }: { id: string; reference?: string }) => {
      const { error } = await supabase
        .from("commissions")
        .update({ status: "paid", paid_at: new Date().toISOString(), payment_reference: reference })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commissions"] });
      toast.success("Comissão marcada como paga");
    },
  });

  return { ...query, approveCommission, payCommission };
}

// ========================================
// Sales Goals Hook
// ========================================

export function useSalesGoals(filters?: { seller_id?: string; year?: number; month?: number }) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["sales_goals", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase
        .from("sales_goals")
        .select("*, seller:sellers(*)")
        .eq("company_id", currentCompany.id)
        .order("period_year", { ascending: false });

      if (filters?.seller_id) q = q.eq("seller_id", filters.seller_id);
      if (filters?.year) q = q.eq("period_year", filters.year);
      if (filters?.month) q = q.eq("period_month", filters.month);

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return (data || []) as SalesGoal[];
    },
    enabled: !!currentCompany?.id,
  });

  const createGoal = useMutation({
    mutationFn: async (goal: Partial<SalesGoal>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("sales_goals")
        .insert({ ...goal, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_goals"] });
      toast.success("Meta criada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const updateGoal = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesGoal> & { id: string }) => {
      const { error } = await supabase.from("sales_goals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales_goals"] });
      toast.success("Meta atualizada");
    },
  });

  return { ...query, createGoal, updateGoal };
}

// ========================================
// Pipelines Hook
// ========================================

export function usePipelines() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crm_pipelines", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("crm_pipelines")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_active", true)
        .order("created_at");
      if (error) throw error;
      return (data || []) as Pipeline[];
    },
    enabled: !!currentCompany?.id,
  });

  const createPipeline = useMutation({
    mutationFn: async (pipeline: Partial<Pipeline>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("crm_pipelines")
        .insert({ ...pipeline, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_pipelines"] });
      toast.success("Pipeline criado");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  return { ...query, createPipeline };
}

// ========================================
// Stages Hook (for CRM Pipelines)
// ========================================

export function useStages(pipelineId?: string) {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["crm_stages", currentCompany?.id, pipelineId],
    queryFn: async (): Promise<Stage[]> => {
      if (!currentCompany?.id) return [];
      
      // Get all stages for the pipeline
      let stagesQuery = supabase
        .from("crm_stages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order");
      
      if (pipelineId) {
        stagesQuery = stagesQuery.eq("pipeline_id", pipelineId);
      }

      const { data, error } = await stagesQuery;
      if (error) throw error;
      
      return (data || []).map((s): Stage => ({
        id: s.id,
        pipeline_id: s.pipeline_id,
        name: s.name,
        color: s.color || '#3B82F6',
        position: s.sort_order || 0,
        sort_order: s.sort_order || 0,
        probability: s.probability || 50,
        days_expected: s.rotting_days || 7,
        rotting_days: s.rotting_days || 7,
        stage_type: s.stage_type || 'open',
        is_won: s.stage_type === 'won',
        is_lost: s.stage_type === 'lost',
        is_active: s.is_active ?? true,
        created_at: s.created_at || new Date().toISOString(),
      }));
    },
    enabled: !!currentCompany?.id,
  });

  const createStage = useMutation({
    mutationFn: async (stage: { 
      pipeline_id: string; 
      name?: string;
      stage_type?: string; 
      probability?: number;
      rotting_days?: number; 
      sort_order?: number;
      color?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("crm_stages")
        .insert({
          pipeline_id: stage.pipeline_id,
          name: stage.name || 'Nova Etapa',
          stage_type: stage.stage_type || 'open',
          probability: stage.probability || 50,
          rotting_days: stage.rotting_days || 7,
          color: stage.color || '#3B82F6',
          sort_order: stage.sort_order || 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_stages"] });
      toast.success("Etapa criada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  return { ...query, createStage };
}

// ========================================
// Quotes Hook
// ========================================

export function useQuotes(opportunityId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["quotes", currentCompany?.id, opportunityId],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let q = supabase
        .from("quotes")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });

      if (opportunityId) {
        q = q.eq("opportunity_id", opportunityId);
      }

      const { data, error } = await q.limit(100);
      if (error) throw error;
      return (data || []) as Quote[];
    },
    enabled: !!currentCompany?.id,
  });
}

// ========================================
// Activities Hook (alternate with opportunity_id param)
// ========================================

export function useActivities(opportunityId?: string) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["crm_activities", currentCompany?.id, opportunityId],
    queryFn: async () => {
      if (!currentCompany?.id || !opportunityId) return [];
      const { data, error } = await supabase
        .from("crm_activities")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data || []) as Activity[];
    },
    enabled: !!currentCompany?.id && !!opportunityId,
  });
}

// ========================================
// Aggregated useCRM Hook
// ========================================

export function useCRM() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  
  // Opportunities
  const createOpportunity = useMutation({
    mutationFn: async (opp: Partial<Opportunity>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("opportunities")
        .insert({ ...opp, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade criada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  const updateOpportunity = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Opportunity> & { id: string }) => {
      const { error } = await supabase.from("opportunities").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Oportunidade atualizada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  // Activities
  const createActivity = useMutation({
    mutationFn: async (activity: Partial<Activity>) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("crm_activities")
        .insert({ ...activity, company_id: currentCompany.id } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm_activities"] });
      toast.success("Atividade registrada");
    },
    onError: (error) => toast.error("Erro: " + error.message),
  });

  return {
    createOpportunity,
    updateOpportunity,
    createActivity,
    useActivities,
    useQuotes,
    usePipelines,
    useStages,
  };
}
