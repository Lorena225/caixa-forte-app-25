import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Types
export interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
  expires_at: string | null;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ApiLog {
  id: string;
  company_id: string;
  api_key_id: string | null;
  method: string;
  endpoint: string;
  status_code: number;
  latency_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  company_id: string;
  name: string;
  endpoint_url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  last_success_at: string | null;
  created_at: string;
}

export interface MarketplaceApp {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  long_description: string | null;
  category: string;
  icon_url: string | null;
  website_url: string | null;
  documentation_url: string | null;
  features: string[];
  pricing_type: 'free' | 'paid' | 'freemium';
  is_featured: boolean;
  is_active: boolean;
  setup_instructions: string | null;
}

export interface AppConnection {
  id: string;
  company_id: string;
  app_id: string;
  status: 'pending' | 'connected' | 'disconnected' | 'error';
  settings: Record<string, unknown>;
  last_sync_at: string | null;
  error_message: string | null;
  connected_at: string | null;
  created_at: string;
  app?: MarketplaceApp;
}

export function usePublicAPI() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  // ========== API KEYS ==========
  const apiKeysQuery = useQuery({
    queryKey: ['api_keys', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ApiKey[];
    },
    enabled: !!companyId,
  });

  const createApiKey = useMutation({
    mutationFn: async (data: { name: string; scopes: string[]; rate_limit_per_minute?: number }) => {
      if (!companyId) throw new Error('Company required');
      
      // Gerar key
      const key = 'cf_' + crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 32);
      const keyPrefix = key.slice(0, 12);
      
      // Hash simples para armazenar (em produção usar backend)
      const encoder = new TextEncoder();
      const keyData = encoder.encode(key);
      const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const keyHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      const { error } = await supabase
        .from('api_keys')
        .insert({
          company_id: companyId,
          name: data.name,
          key_prefix: keyPrefix,
          key_hash: keyHash,
          scopes: data.scopes,
          rate_limit_per_minute: data.rate_limit_per_minute || 60,
          rate_limit_per_day: 10000,
        });
      
      if (error) throw error;
      return { key, keyPrefix };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['api_keys'] });
      toast.success('API Key criada! Copie a chave, ela não será exibida novamente.');
      return result;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeApiKey = useMutation({
    mutationFn: async (keyId: string) => {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: false })
        .eq('id', keyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api_keys'] });
      toast.success('API Key revogada!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== API LOGS ==========
  const apiLogsQuery = useQuery({
    queryKey: ['api_logs', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('api_logs')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as ApiLog[];
    },
    enabled: !!companyId,
  });

  // ========== WEBHOOKS ==========
  const webhooksQuery = useQuery({
    queryKey: ['webhooks', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('webhooks' as never)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Webhook[];
    },
    enabled: !!companyId,
  });

  const createWebhook = useMutation({
    mutationFn: async (data: { name: string; endpoint_url: string; events: string[] }) => {
      if (!companyId) throw new Error('Company required');
      
      const secret = 'whsec_' + crypto.randomUUID().replace(/-/g, '');
      
      const { error } = await supabase
        .from('webhooks' as never)
        .insert({
          company_id: companyId,
          name: data.name,
          endpoint_url: data.endpoint_url,
          events: data.events,
          secret,
        } as never);
      if (error) throw error;
      return { secret };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook criado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleWebhook = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('webhooks' as never)
        .update({ is_active } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
  });

  const deleteWebhook = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('webhooks' as never)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      toast.success('Webhook removido!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== MARKETPLACE APPS ==========
  const marketplaceAppsQuery = useQuery({
    queryKey: ['marketplace_apps'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketplace_apps')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('name');
      if (error) throw error;
      return data as MarketplaceApp[];
    },
  });

  // ========== APP CONNECTIONS ==========
  const appConnectionsQuery = useQuery({
    queryKey: ['app_connections', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('app_connections')
        .select(`*, app:marketplace_apps(*)`)
        .eq('company_id', companyId);
      if (error) throw error;
      return data as AppConnection[];
    },
    enabled: !!companyId,
  });

  const connectApp = useMutation({
    mutationFn: async (appId: string) => {
      if (!companyId) throw new Error('Company required');
      
      const { error } = await supabase
        .from('app_connections')
        .upsert({
          company_id: companyId,
          app_id: appId,
          status: 'connected',
          connected_at: new Date().toISOString(),
        }, { onConflict: 'company_id,app_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_connections'] });
      toast.success('App conectado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnectApp = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase
        .from('app_connections')
        .update({ status: 'disconnected' })
        .eq('id', connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app_connections'] });
      toast.success('App desconectado!');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // ========== STATS ==========
  const apiStatsQuery = useQuery({
    queryKey: ['api_stats', companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      
      // Requests hoje
      const { count: todayCount } = await supabase
        .from('api_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', startOfDay);
      
      // Requests mês
      const { count: monthCount } = await supabase
        .from('api_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', startOfMonth);
      
      // Erros hoje
      const { count: errorCount } = await supabase
        .from('api_logs')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .gte('created_at', startOfDay)
        .gte('status_code', 400);
      
      // Keys ativas
      const { count: activeKeys } = await supabase
        .from('api_keys')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);
      
      return {
        requestsToday: todayCount || 0,
        requestsMonth: monthCount || 0,
        errorsToday: errorCount || 0,
        activeKeys: activeKeys || 0,
      };
    },
    enabled: !!companyId,
  });

  return {
    // API Keys
    apiKeys: apiKeysQuery.data || [],
    apiKeysLoading: apiKeysQuery.isLoading,
    createApiKey,
    revokeApiKey,
    
    // API Logs
    apiLogs: apiLogsQuery.data || [],
    apiLogsLoading: apiLogsQuery.isLoading,
    
    // Webhooks
    webhooks: webhooksQuery.data || [],
    webhooksLoading: webhooksQuery.isLoading,
    createWebhook,
    toggleWebhook,
    deleteWebhook,
    
    // Marketplace
    marketplaceApps: marketplaceAppsQuery.data || [],
    marketplaceAppsLoading: marketplaceAppsQuery.isLoading,
    
    // App Connections
    appConnections: appConnectionsQuery.data || [],
    appConnectionsLoading: appConnectionsQuery.isLoading,
    connectApp,
    disconnectApp,
    
    // Stats
    apiStats: apiStatsQuery.data,
    
    // Refetch
    refetchAll: () => {
      queryClient.invalidateQueries({ queryKey: ['api_keys'] });
      queryClient.invalidateQueries({ queryKey: ['api_logs'] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace_apps'] });
      queryClient.invalidateQueries({ queryKey: ['app_connections'] });
      queryClient.invalidateQueries({ queryKey: ['api_stats'] });
    },
  };
}

// Eventos disponíveis para webhooks
export const WEBHOOK_EVENTS = [
  { value: 'lead.criado', label: 'Lead criado', category: 'CRM' },
  { value: 'lead.atualizado', label: 'Lead atualizado', category: 'CRM' },
  { value: 'oportunidade.criada', label: 'Oportunidade criada', category: 'CRM' },
  { value: 'oportunidade.ganha', label: 'Oportunidade ganha', category: 'CRM' },
  { value: 'oportunidade.perdida', label: 'Oportunidade perdida', category: 'CRM' },
  { value: 'venda.criada', label: 'Venda criada', category: 'Vendas' },
  { value: 'venda.faturada', label: 'Venda faturada', category: 'Vendas' },
  { value: 'nota_fiscal.emitida', label: 'NF emitida', category: 'Fiscal' },
  { value: 'nota_fiscal.cancelada', label: 'NF cancelada', category: 'Fiscal' },
  { value: 'pagamento.recebido', label: 'Pagamento recebido', category: 'Financeiro' },
  { value: 'pagamento.efetuado', label: 'Pagamento efetuado', category: 'Financeiro' },
  { value: 'boleto.emitido', label: 'Boleto emitido', category: 'Financeiro' },
  { value: 'boleto.pago', label: 'Boleto pago', category: 'Financeiro' },
  { value: 'pix.recebido', label: 'PIX recebido', category: 'Financeiro' },
  { value: 'estoque.minimo', label: 'Estoque mínimo atingido', category: 'Estoque' },
  { value: 'estoque.entrada', label: 'Entrada de estoque', category: 'Estoque' },
  { value: 'estoque.saida', label: 'Saída de estoque', category: 'Estoque' },
  { value: 'pedido_compra.criado', label: 'Pedido de compra criado', category: 'Compras' },
  { value: 'pedido_compra.aprovado', label: 'Pedido de compra aprovado', category: 'Compras' },
];

// Escopos de API disponíveis
export const API_SCOPES = [
  { value: 'financeiro:read', label: 'Financeiro (leitura)', description: 'Ler transações, contas, fluxo de caixa' },
  { value: 'financeiro:write', label: 'Financeiro (escrita)', description: 'Criar e atualizar transações' },
  { value: 'crm:read', label: 'CRM (leitura)', description: 'Ler leads, oportunidades, vendedores' },
  { value: 'crm:write', label: 'CRM (escrita)', description: 'Criar e atualizar leads e oportunidades' },
  { value: 'fiscal:read', label: 'Fiscal (leitura)', description: 'Ler notas fiscais e apurações' },
  { value: 'fiscal:write', label: 'Fiscal (escrita)', description: 'Emitir notas fiscais' },
  { value: 'compras:read', label: 'Compras (leitura)', description: 'Ler pedidos e cotações' },
  { value: 'compras:write', label: 'Compras (escrita)', description: 'Criar pedidos de compra' },
  { value: 'estoque:read', label: 'Estoque (leitura)', description: 'Ler produtos e movimentações' },
  { value: 'estoque:write', label: 'Estoque (escrita)', description: 'Registrar movimentações' },
  { value: 'cadastros:read', label: 'Cadastros (leitura)', description: 'Ler clientes, fornecedores, produtos' },
  { value: 'cadastros:write', label: 'Cadastros (escrita)', description: 'Criar e atualizar cadastros' },
];
