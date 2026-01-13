import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type SystemTier = 'FINANCEIRO_ESSENCIAL' | 'FINANCEIRO_CONTABIL' | 'FINANCEIRO_CONTABIL_FISCAL';

export interface CompanyTierSettings {
  company_id: string;
  system_tier: SystemTier;
  accounting_enabled: boolean;
  fiscal_enabled: boolean;
  accounting_start_date: string | null;
  fiscal_start_date: string | null;
  tier_changed_at: string | null;
  tier_changed_by: string | null;
  previous_tier: SystemTier | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: string;
  company_id: string;
  feature_key: string;
  enabled: boolean;
  config_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ModuleTemplate {
  id: string;
  template_key: SystemTier;
  template_version: number;
  flags_json: Record<string, { enabled: boolean; config?: Record<string, unknown> }>;
  nav_profile_key: string | null;
  description: string | null;
  created_at: string;
}

export interface TierHistory {
  id: string;
  company_id: string;
  from_tier: SystemTier | null;
  to_tier: SystemTier;
  changed_by: string | null;
  change_reason: string | null;
  accounting_start_date: string | null;
  fiscal_start_date: string | null;
  retroactive_processing: boolean;
  job_id: string | null;
  created_at: string;
}

// Hook para obter configurações de tier da empresa
export function useCompanyTierSettings() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["company-tier-settings", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data, error } = await supabase
        .from("company_tier_settings")
        .select("*")
        .eq("company_id", currentCompany.id)
        .maybeSingle();
      if (error) throw error;
      return data as CompanyTierSettings | null;
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para obter feature flags da empresa
export function useFeatureFlags() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["feature-flags", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("company_feature_flags")
        .select("*")
        .eq("company_id", currentCompany.id);
      if (error) throw error;
      return data as FeatureFlag[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para verificar se uma feature está habilitada
export function useIsFeatureEnabled(featureKey: string): boolean {
  const { data: flags } = useFeatureFlags();
  const flag = flags?.find(f => f.feature_key === featureKey);
  return flag?.enabled ?? false;
}

// Hook para obter templates disponíveis
export function useModuleTemplates() {
  return useQuery({
    queryKey: ["module-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_module_templates")
        .select("*")
        .order("template_key", { ascending: true });
      if (error) throw error;
      return data as ModuleTemplate[];
    },
  });
}

// Hook para obter histórico de tiers
export function useTierHistory() {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ["tier-history", currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from("company_tier_history")
        .select("*")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as TierHistory[];
    },
    enabled: !!currentCompany?.id,
  });
}

// Hook para aplicar um template de tier
export function useApplyTierTemplate() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({
      tier,
      accountingStartDate,
      fiscalStartDate,
    }: {
      tier: SystemTier;
      accountingStartDate?: string;
      fiscalStartDate?: string;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      
      const { error } = await supabase.rpc("apply_tier_template", {
        p_company_id: currentCompany.id,
        p_tier: tier,
        p_accounting_start_date: accountingStartDate || null,
        p_fiscal_start_date: fiscalStartDate || null,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-tier-settings"] });
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      queryClient.invalidateQueries({ queryKey: ["tier-history"] });
      toast.success("Nível do sistema atualizado com sucesso");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar nível: ${error.message}`);
    },
  });
}

// Hook para atualizar uma feature flag individual
export function useUpdateFeatureFlag() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  return useMutation({
    mutationFn: async ({
      featureKey,
      enabled,
      configJson,
    }: {
      featureKey: string;
      enabled: boolean;
      configJson?: Record<string, unknown>;
    }) => {
      if (!currentCompany?.id) throw new Error("Empresa não selecionada");
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("company_feature_flags") as any).upsert({
        company_id: currentCompany.id,
        feature_key: featureKey,
        enabled,
        config_json: configJson || {},
      }, { onConflict: "company_id,feature_key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-flags"] });
      toast.success("Configuração atualizada");
    },
    onError: (error: Error) => {
      toast.error(`Erro: ${error.message}`);
    },
  });
}

// Utilitário para verificar tier
export function getTierLabel(tier: SystemTier): string {
  switch (tier) {
    case 'FINANCEIRO_ESSENCIAL':
      return 'Financeiro Essencial';
    case 'FINANCEIRO_CONTABIL':
      return 'Financeiro + Contábil';
    case 'FINANCEIRO_CONTABIL_FISCAL':
      return 'Financeiro + Contábil + Fiscal';
    default:
      return tier;
  }
}

export function getTierDescription(tier: SystemTier): string {
  switch (tier) {
    case 'FINANCEIRO_ESSENCIAL':
      return 'Gestão financeira completa: AP/AR, Tesouraria, Conciliação, CNAB, PIX. Ideal para empresas que não precisam de contabilidade integrada.';
    case 'FINANCEIRO_CONTABIL':
      return 'Financeiro + Contabilidade: GL, Posting Rules, Fechamento, Razão, Diário, Balancete, BP, DRE Contábil. Para empresas que querem contabilidade automatizada.';
    case 'FINANCEIRO_CONTABIL_FISCAL':
      return 'Solução completa: Financeiro + Contabilidade + Fiscal (NF-e, NFS-e, SPED, cadastros fiscais). Para operação enterprise integrada.';
    default:
      return '';
  }
}

// Mapa de features por categoria para UI
export const FEATURE_CATEGORIES = {
  'Financeiro': ['finance.core', 'finance.ap', 'finance.ar'],
  'Tesouraria': ['treasury.core', 'treasury.reconciliation', 'treasury.cashflow'],
  'Integrações': ['integrations.cnab', 'integrations.pix', 'integrations.boleto'],
  'Cadastros': ['cadastros.counterparties', 'cadastros.categories', 'cadastros.wallets', 'cadastros.cost_centers', 'cadastros.chart_of_accounts'],
  'Contabilidade': ['gl.enabled', 'gl.posting_rules', 'gl.period_close', 'gl.journal_entries'],
  'Relatórios Financeiros': ['reports.financial', 'reports.aging', 'reports.dre_financial'],
  'Relatórios Contábeis': ['reports.accounting', 'reports.trial_balance', 'reports.balance_sheet', 'reports.dre_accounting'],
  'Fiscal': ['fiscal.masterdata', 'fiscal.nfe', 'fiscal.nfse', 'fiscal.sped'],
  'IA e Automação': ['ai.autopilot'],
} as const;

export const FEATURE_LABELS: Record<string, string> = {
  'finance.core': 'Financeiro Core',
  'finance.ap': 'Contas a Pagar',
  'finance.ar': 'Contas a Receber',
  'treasury.core': 'Tesouraria',
  'treasury.reconciliation': 'Conciliação Bancária',
  'treasury.cashflow': 'Fluxo de Caixa',
  'integrations.cnab': 'CNAB (Remessa/Retorno)',
  'integrations.pix': 'PIX',
  'integrations.boleto': 'Boletos',
  'cadastros.counterparties': 'Clientes/Fornecedores',
  'cadastros.categories': 'Categorias',
  'cadastros.wallets': 'Carteiras/Contas',
  'cadastros.cost_centers': 'Centros de Custo',
  'cadastros.chart_of_accounts': 'Plano de Contas',
  'gl.enabled': 'Contabilidade (GL)',
  'gl.posting_rules': 'Regras de Contabilização',
  'gl.period_close': 'Fechamento de Período',
  'gl.journal_entries': 'Lançamentos Contábeis',
  'reports.financial': 'Relatórios Financeiros',
  'reports.aging': 'Aging (Vencimentos)',
  'reports.dre_financial': 'DRE Financeira',
  'reports.accounting': 'Relatórios Contábeis',
  'reports.trial_balance': 'Balancete',
  'reports.balance_sheet': 'Balanço Patrimonial',
  'reports.dre_accounting': 'DRE Contábil',
  'fiscal.masterdata': 'Cadastros Fiscais (NCM/CFOP/CST)',
  'fiscal.nfe': 'NF-e',
  'fiscal.nfse': 'NFS-e',
  'fiscal.sped': 'SPED',
  'ai.autopilot': 'IA Autopilot',
};
