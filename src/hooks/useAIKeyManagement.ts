import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface KeyStatus {
  configured: boolean;
  key_last4: string | null;
  provider: string;
  updated_at: string | null;
  using_global_fallback: boolean;
  ai_available: boolean;
}

export function useAIKeyStatus() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ai-key-status', currentCompany?.id],
    queryFn: async (): Promise<KeyStatus> => {
      if (!currentCompany?.id) {
        return {
          configured: false,
          key_last4: null,
          provider: 'openai',
          updated_at: null,
          using_global_fallback: false,
          ai_available: false
        };
      }
      
      const { data, error } = await supabase.functions.invoke('ai-key-status', {
        body: { company_id: currentCompany.id }
      });
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id
  });
}

export function useTestAIKey() {
  const [isLoading, setIsLoading] = useState(false);
  
  const testKey = async (apiKey: string): Promise<{ valid: boolean; error?: string }> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-key-test', {
        body: { api_key: apiKey }
      });
      
      if (error) throw error;
      return data;
    } catch (e) {
      return { valid: false, error: e instanceof Error ? e.message : 'Erro ao testar chave' };
    } finally {
      setIsLoading(false);
    }
  };
  
  return { testKey, isLoading };
}

export function useSetAIKey() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();
  
  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('ai-key-set', {
        body: { 
          company_id: currentCompany.id,
          api_key: apiKey,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-key-status'] });
      queryClient.invalidateQueries({ queryKey: ['ai-company-settings'] });
      toast.success('Chave OpenAI configurada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao salvar chave: ${error.message}`);
    }
  });
}

export function useRotateAIKey() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();
  
  return useMutation({
    mutationFn: async (apiKey: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('ai-key-rotate', {
        body: { 
          company_id: currentCompany.id,
          api_key: apiKey,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-key-status'] });
      toast.success('Chave OpenAI rotacionada com sucesso!');
    },
    onError: (error) => {
      toast.error(`Erro ao rotacionar chave: ${error.message}`);
    }
  });
}

export function useRevokeAIKey() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();
  
  return useMutation({
    mutationFn: async () => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase.functions.invoke('ai-key-revoke', {
        body: { 
          company_id: currentCompany.id,
          user_id: user?.id
        }
      });
      
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-key-status'] });
      queryClient.invalidateQueries({ queryKey: ['ai-company-settings'] });
      toast.success('Chave OpenAI revogada. IA desativada.');
    },
    onError: (error) => {
      toast.error(`Erro ao revogar chave: ${error.message}`);
    }
  });
}

export function useAICompanySettings() {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['ai-company-settings', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('ai_company_settings')
        .select('*')
        .eq('company_id', currentCompany.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id
  });
}

export function useUpdateAISettings() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();
  
  return useMutation({
    mutationFn: async (settings: Partial<{
      enabled: boolean;
      autopilot_mode: 'safe' | 'balanced' | 'autopilot';
      high_risk_amount_limit: number;
      require_pin_for_high_risk: boolean;
      allow_auto_settle: boolean;
      allow_auto_create_and_settle: boolean;
      allow_auto_create_counterparty: boolean;
      thresholds_json: { settle: number; create: number };
    }>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { error } = await supabase
        .from('ai_company_settings')
        .upsert({
          company_id: currentCompany.id,
          ...settings,
          updated_by: user?.id,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-company-settings'] });
      toast.success('Configurações de IA atualizadas!');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar configurações: ${error.message}`);
    }
  });
}
