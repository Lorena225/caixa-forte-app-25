import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Hook para sincronização em tempo real das transações.
 * Atualiza automaticamente o Dashboard e listas de transações
 * quando novos dados são inseridos, atualizados ou excluídos.
 */
export function useRealtimeTransactions() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();

  useEffect(() => {
    if (!currentCompany?.id) return;

    const channel = supabase
      .channel(`transactions-realtime-${currentCompany.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `company_id=eq.${currentCompany.id}`,
        },
        (payload) => {
          console.log('[Realtime] Transaction change:', payload.eventType);
          
          // Invalidate all transaction-related queries
          queryClient.invalidateQueries({ queryKey: ['transactions'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard-fluxo'] });
          queryClient.invalidateQueries({ queryKey: ['budget-vs-actual'] });
          
          // Show subtle notification for new transactions from other sources
          if (payload.eventType === 'INSERT' && payload.new) {
            const newTransaction = payload.new as { description?: string; direction?: string };
            toast.info('Nova transação registrada', {
              description: newTransaction.description || 'Dados atualizados automaticamente',
              duration: 3000,
              icon: newTransaction.direction === 'entrada' ? '💰' : '💸',
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to transactions channel');
        }
      });

    return () => {
      console.log('[Realtime] Unsubscribing from transactions channel');
      supabase.removeChannel(channel);
    };
  }, [currentCompany?.id, queryClient]);
}

/**
 * Hook para monitorar status de conexão com o banco
 */
export function useSupabaseConnectionStatus() {
  const { currentCompany } = useAuth();

  useEffect(() => {
    if (!currentCompany?.id) return;

    // Test connection periodically
    const checkConnection = async () => {
      try {
        const start = Date.now();
        await supabase.from('transactions').select('id').limit(1);
        const latency = Date.now() - start;
        
        if (latency > 3000) {
          toast.warning('Conexão lenta detectada', {
            description: 'Seus dados podem demorar para sincronizar',
            duration: 5000,
          });
        }
      } catch (error) {
        toast.error('Erro de conexão com o servidor', {
          description: 'Verifique sua internet e tente novamente',
          duration: 5000,
        });
      }
    };

    // Check on mount and every 5 minutes
    checkConnection();
    const interval = setInterval(checkConnection, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [currentCompany?.id]);
}
