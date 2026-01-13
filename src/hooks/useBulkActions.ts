import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { exportToExcel } from '@/lib/excel/exporter';

export type BulkActionType = 
  // Transaction actions
  | 'change_due_date'
  | 'change_cost_center'
  | 'change_account'
  | 'change_payment_method'
  | 'add_notes'
  | 'cancel_titles'
  | 'delete_titles'
  | 'export_selected'
  // Counterparty actions
  | 'change_category'
  | 'toggle_active'
  | 'add_tag'
  // Account/Cost Center actions
  | 'change_type'
  | 'move_to_parent';

export interface BulkActionConfig {
  type: BulkActionType;
  label: string;
  icon: React.ReactNode;
  requiresInput?: boolean;
  inputType?: 'date' | 'select' | 'text' | 'confirm';
  inputLabel?: string;
  inputOptions?: { value: string; label: string }[];
  confirmMessage?: string;
  variant?: 'default' | 'destructive';
}

interface UseBulkActionsOptions {
  tableName: 'transactions' | 'counterparties' | 'accounts' | 'account_categories' | 'cost_centers';
  queryKey: string[];
  onSuccess?: () => void;
}

export function useBulkActions({ tableName, queryKey, onSuccess }: UseBulkActionsOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const updateMutation = useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Record<string, any> }) => {
      setIsProcessing(true);
      setProgress({ current: 0, total: ids.length });

      // Process in batches of 50 for large updates
      const batchSize = 50;
      let processed = 0;
      let errors: string[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(tableName)
          .update(updates)
          .in('id', batch);
        
        if (error) {
          errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          processed += batch.length;
        }
        
        setProgress({ current: processed, total: ids.length });
      }

      setIsProcessing(false);

      if (errors.length > 0) {
        throw new Error(`${processed} itens alterados, ${ids.length - processed} falharam`);
      }

      return { processed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: `${data.processed} itens alterados com sucesso` });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro parcial', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      setIsProcessing(true);
      setProgress({ current: 0, total: ids.length });

      const batchSize = 50;
      let processed = 0;
      let errors: string[] = [];

      for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        
        const { error } = await supabase
          .from(tableName)
          .delete()
          .in('id', batch);
        
        if (error) {
          errors.push(`Lote ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        } else {
          processed += batch.length;
        }
        
        setProgress({ current: processed, total: ids.length });
      }

      setIsProcessing(false);

      if (errors.length > 0) {
        throw new Error(`${processed} itens excluídos, ${ids.length - processed} falharam`);
      }

      return { processed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: `${data.processed} itens excluídos com sucesso` });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro parcial', description: error.message, variant: 'destructive' });
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const bulkUpdate = useCallback((ids: string[], updates: Record<string, any>) => {
    return updateMutation.mutateAsync({ ids, updates });
  }, [updateMutation]);

  const bulkDelete = useCallback((ids: string[]) => {
    return deleteMutation.mutateAsync(ids);
  }, [deleteMutation]);

  const bulkExport = useCallback(<T extends Record<string, unknown>>(
    items: T[],
    columns: { key: string; header: string; formatter?: (value: any) => string }[],
    filename: string
  ) => {
    try {
      const exportColumns = columns.map(col => ({
        header: col.header,
        key: col.key,
        formatter: col.formatter,
      }));

      exportToExcel({
        filename,
        sheetName: 'Dados Selecionados',
        columns: exportColumns,
        data: items,
        title: `Exportação - ${new Date().toLocaleDateString('pt-BR')}`,
      });

      toast({ title: `${items.length} itens exportados com sucesso` });
    } catch (error) {
      toast({ title: 'Erro ao exportar', variant: 'destructive' });
    }
  }, [toast]);

  return {
    bulkUpdate,
    bulkDelete,
    bulkExport,
    isProcessing,
    progress,
    isPending: updateMutation.isPending || deleteMutation.isPending,
  };
}
