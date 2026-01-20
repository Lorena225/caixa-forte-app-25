import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Json } from "@/integrations/supabase/types";

// =====================================================
// TYPES
// =====================================================

export interface FinancialScenario {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  scenario_type: 'what_if' | 'forecast' | 'stress_test' | 'custom';
  base_date: string;
  horizon_days: number;
  parameters_json: Json;
  results_json: Json | null;
  status: 'draft' | 'processing' | 'completed' | 'failed';
  ai_analysis: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnomalyDetection {
  id: string;
  company_id: string;
  detection_type: 'value' | 'pattern' | 'timing' | 'counterparty' | 'cost_center' | 'frequency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  entity_type: string;
  entity_id: string | null;
  title: string;
  description: string | null;
  ai_explanation: string | null;
  details_json: Json | null;
  status: 'pending' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface OpenFinanceConnection {
  id: string;
  company_id: string;
  institution_id: string;
  institution_name: string;
  institution_logo_url: string | null;
  connection_type: 'data' | 'payment' | 'both';
  consent_expires_at: string | null;
  status: 'pending' | 'connected' | 'expired' | 'revoked' | 'error';
  last_sync_at: string | null;
  accounts_linked: Json;
  created_at: string;
}

export interface PaymentInstruction {
  id: string;
  company_id: string;
  payment_type: 'pix' | 'ted' | 'boleto' | 'debito_automatico';
  amount: number;
  beneficiary_name: string;
  pix_key: string | null;
  pix_key_type: string | null;
  scheduled_date: string | null;
  status: 'draft' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  created_at: string;
}

export interface FinancialService {
  id: string;
  company_id: string;
  service_type: 'receivables_anticipation' | 'credit_line' | 'digital_wallet' | 'insurance' | 'investment';
  provider_name: string | null;
  status: 'inactive' | 'pending' | 'active' | 'suspended';
  limits_json: Json;
  created_at: string;
}

export interface AnticipationOperation {
  id: string;
  company_id: string;
  total_face_value: number;
  total_anticipation_value: number;
  discount_rate: number;
  fee_amount: number;
  net_amount: number;
  status: 'simulated' | 'requested' | 'approved' | 'disbursed' | 'completed' | 'cancelled';
  created_at: string;
}

export interface LiquidityAlert {
  id: string;
  company_id: string;
  alert_type: 'negative_balance' | 'low_balance' | 'high_concentration' | 'cash_burn' | 'payment_risk';
  severity: 'info' | 'warning' | 'critical';
  alert_date: string;
  projected_balance: number | null;
  days_until_negative: number | null;
  ai_summary: string | null;
  is_read: boolean;
  is_dismissed: boolean;
  created_at: string;
}

export interface CFOInsight {
  id: string;
  company_id: string;
  insight_type: 'risk' | 'opportunity' | 'recommendation' | 'alert' | 'trend';
  category: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  summary: string;
  detailed_analysis: string | null;
  data_json: Json | null;
  suggested_actions: Json;
  is_read: boolean;
  created_at: string;
}

export interface PurchaseRecommendation {
  id: string;
  product_code: string;
  product_name: string | null;
  current_stock: number;
  recommended_qty: number;
  recommended_order_date: string | null;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  ai_reasoning: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'ordered';
  created_at: string;
}

// =====================================================
// FINANCIAL SCENARIOS HOOKS
// =====================================================

export function useFinancialScenarios() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["financial-scenarios", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("financial_scenarios")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as FinancialScenario[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCreateScenario() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (scenario: { name: string; scenario_type?: string; horizon_days?: number; parameters_json?: Record<string, unknown> }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      const { data, error } = await supabase
        .from("financial_scenarios")
        .insert({
          company_id: currentCompany.id,
          created_by: user?.id,
          name: scenario.name,
          scenario_type: scenario.scenario_type || "what_if",
          horizon_days: scenario.horizon_days || 90,
          parameters_json: scenario.parameters_json || {},
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-scenarios"] });
    },
  });
}

// =====================================================
// ANOMALY DETECTION HOOKS
// =====================================================

export function useAnomalyDetections(filters?: { severity?: string; status?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["anomaly-detections", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("anomaly_detections")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.severity) query = query.eq("severity", filters.severity);
      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as AnomalyDetection[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpdateAnomalyStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("anomaly_detections")
        .update({
          status,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["anomaly-detections"] });
    },
  });
}

// =====================================================
// OPEN FINANCE HOOKS
// =====================================================

export function useOpenFinanceConnections() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["open-finance-connections", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("open_finance_connections")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OpenFinanceConnection[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePaymentInstructions(filters?: { status?: string }) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["payment-instructions", currentCompany?.id, filters],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      let query = supabase
        .from("payment_instructions")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.status) query = query.eq("status", filters.status);

      const { data, error } = await query;
      if (error) throw error;
      return data as PaymentInstruction[];
    },
    enabled: !!currentCompany?.id,
  });
}

// =====================================================
// EMBEDDED FINANCE HOOKS
// =====================================================

export function useFinancialServices() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["financial-services", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("financial_services")
        .select("*")
        .eq("company_id", currentCompany.id);
      if (error) throw error;
      return data as FinancialService[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useAnticipationOperations() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["anticipation-operations", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("anticipation_operations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AnticipationOperation[];
    },
    enabled: !!currentCompany?.id,
  });
}

// =====================================================
// LIQUIDITY & CFO INSIGHTS HOOKS
// =====================================================

export function useLiquidityAlerts() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["liquidity-alerts", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("liquidity_alerts")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_dismissed", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as LiquidityAlert[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useCFOInsights() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["cfo-insights", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("cfo_insights")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as CFOInsight[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useMarkInsightRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from("cfo_insights")
        .update({ is_read: true })
        .eq("id", insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cfo-insights"] });
    },
  });
}

// =====================================================
// SUPPLY CHAIN HOOKS
// =====================================================

export function usePurchaseRecommendations() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["purchase-recommendations", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("purchase_recommendations")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as PurchaseRecommendation[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useUpdateRecommendationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("purchase_recommendations")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-recommendations"] });
    },
  });
}

// =====================================================
// DASHBOARD PERSONA HOOKS
// =====================================================

export function useUserDashboardPreferences() {
  const { currentCompany, user } = useAuth();

  return useQuery({
    queryKey: ["user-dashboard-preferences", currentCompany?.id, user?.id],
    queryFn: async () => {
      if (!currentCompany?.id || !user?.id) return null;
      const { data, error } = await supabase
        .from("user_dashboard_preferences")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id && !!user?.id,
  });
}

export function useUpdateDashboardPreferences() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();

  return useMutation({
    mutationFn: async (preferences: { persona?: string; widgets_config?: Json; kpis_priority?: Json }) => {
      if (!currentCompany?.id || !user?.id) throw new Error("Sessão inválida");
      const { error } = await supabase
        .from("user_dashboard_preferences")
        .upsert({
          company_id: currentCompany.id,
          user_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-dashboard-preferences"] });
    },
  });
}
