import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Camada de domínio das integrações de CRM/marketing/pagamento, complementar
// ao módulo de conciliação financeira já existente em useIntegrations.ts.

export interface IntegrationsHubOverview {
  integrations_total: number;
  integrations_active: number;
  webhooks_24h: number;
  errors_24h: number;
  leads_open: number;
  payments_unprocessed: number;
}

export const CONNECTOR_CATALOG = [
  { provider: 'kommo', name: 'Kommo CRM', category: 'Comercial', priority: 'Essencial',
    description: 'Leads, negócios, pipeline e origem. Negócio ganho cria cliente no ERP e dispara onboarding.',
    syncs: ['Leads & negócios', 'Pipeline & etapas', 'UTMs & origem', 'Cliente ao ganhar'] },
  { provider: 'pagarme', name: 'Pagar.me', category: 'Financeiro', priority: 'Essencial',
    description: 'Cobrança, recorrência, assinaturas e conciliação com contas a receber.',
    syncs: ['Cobranças & links', 'Assinaturas', 'Webhooks de status', 'Conciliação AR'] },
  { provider: 'meta', name: 'Meta Ads', category: 'Marketing', priority: 'Essencial',
    description: 'Contas de anúncio, campanhas e métricas por cliente para relatórios executivos.',
    syncs: ['Contas & campanhas', 'Métricas diárias', 'Leads de anúncio', 'Vínculo por conta'] },
  { provider: 'google_ads', name: 'Google Ads', category: 'Marketing', priority: 'Recomendada',
    description: 'Campanhas e performance de mídia paga no Google.',
    syncs: ['Campanhas', 'Métricas de performance'] },
  { provider: 'ga4', name: 'Google Analytics 4', category: 'Analytics', priority: 'Recomendada',
    description: 'Comportamento e conversões dos sites dos clientes.',
    syncs: ['Sessões & conversões', 'Origem de tráfego'] },
] as const;

export function useIntegrationsHubOverview() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['integrations-hub-overview', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('ai_integrations_overview', { p_company_id: currentCompany!.id });
      if (error) throw error;
      return data as IntegrationsHubOverview;
    },
    enabled: !!currentCompany?.id,
  });
}

export function useLeadSources() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['lead-sources', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lead_sources').select('*')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useConnectedProviders() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['connected-providers', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('integrations').select('provider, is_active, last_sync_at, last_sync_status')
        .eq('company_id', currentCompany!.id);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}

export function usePaymentEvents() {
  const { currentCompany } = useAuth();
  return useQuery({
    queryKey: ['payment-events', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_events')
        .select('id, provider, event_type, amount, processed, created_at, external_charge_id')
        .eq('company_id', currentCompany!.id)
        .order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!currentCompany?.id,
  });
}
