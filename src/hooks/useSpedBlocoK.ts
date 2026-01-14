import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface SpedBlocoK {
  id: string;
  company_id: string;
  periodo_referencia: string;
  produto_id: string | null;
  tipo_movimento: 'entrada' | 'saida' | 'producao' | 'perda';
  quantidade: number;
  valor_unitario: number | null;
  saldo_inicial: number | null;
  saldo_final: number | null;
  registro_tipo: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

export function useSpedBlocoK(periodoReferencia?: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['sped-bloco-k', currentCompany?.id, periodoReferencia],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('sped_bloco_k')
        .select('*, products(name, sku)')
        .eq('company_id', currentCompany.id)
        .order('periodo_referencia', { ascending: false });
      
      if (periodoReferencia) {
        query = query.eq('periodo_referencia', periodoReferencia);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as any[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useSpedBlocoKStats(periodoReferencia: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['sped-bloco-k-stats', currentCompany?.id, periodoReferencia],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      
      const { data, error } = await supabase
        .from('sped_bloco_k')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('periodo_referencia', periodoReferencia);
      
      if (error) throw error;
      
      const stats = {
        totalMovimentos: data?.length || 0,
        entradas: data?.filter(d => d.tipo_movimento === 'entrada').length || 0,
        saidas: data?.filter(d => d.tipo_movimento === 'saida').length || 0,
        producoes: data?.filter(d => d.tipo_movimento === 'producao').length || 0,
        perdas: data?.filter(d => d.tipo_movimento === 'perda').length || 0,
        valorTotalEntradas: data?.filter(d => d.tipo_movimento === 'entrada')
          .reduce((sum, d) => sum + (d.quantidade * (d.valor_unitario || 0)), 0) || 0,
        valorTotalSaidas: data?.filter(d => d.tipo_movimento === 'saida')
          .reduce((sum, d) => sum + (d.quantidade * (d.valor_unitario || 0)), 0) || 0,
      };
      
      return stats;
    },
    enabled: !!currentCompany?.id && !!periodoReferencia,
  });
}

export function useCreateSpedBlocoK() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (data: Partial<SpedBlocoK>) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data: result, error } = await supabase
        .from('sped_bloco_k')
        .insert({
          ...data,
          company_id: currentCompany.id,
        } as never)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sped-bloco-k'] });
      toast.success('Movimento SPED Bloco K criado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar movimento: ' + error.message);
    },
  });
}

export function useGenerateSpedBlocoKFromStock() {
  const queryClient = useQueryClient();
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async ({ periodoInicio, periodoFim }: { periodoInicio: string; periodoFim: string }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Buscar movimentações de estoque do período
      const { data: movimentos, error: movError } = await supabase
        .from('stock_movements')
        .select('*')
        .eq('company_id', currentCompany.id)
        .gte('movement_date', periodoInicio)
        .lte('movement_date', periodoFim);
      
      if (movError) throw movError;
      
      // Converter movimentações para formato Bloco K
      const blocoKEntries = (movimentos || []).map(mov => ({
        company_id: currentCompany.id,
        periodo_referencia: periodoInicio,
        produto_id: mov.product_id,
        tipo_movimento: mov.movement_type === 'entrada' ? 'entrada' : 'saida',
        quantidade: mov.quantity,
        valor_unitario: mov.unit_cost,
        registro_tipo: 'K200',
      }));
      
      if (blocoKEntries.length > 0) {
        const { error: insertError } = await supabase
          .from('sped_bloco_k')
          .insert(blocoKEntries as never[]);
        
        if (insertError) throw insertError;
      }
      
      return blocoKEntries.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['sped-bloco-k'] });
      toast.success(`${count} movimentos gerados para o Bloco K`);
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar Bloco K: ' + error.message);
    },
  });
}

export function useExportSpedBlocoKTxt() {
  const { currentCompany } = useAuth();
  
  return useMutation({
    mutationFn: async (periodoReferencia: string) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      const { data, error } = await supabase
        .from('sped_bloco_k')
        .select('*, products(name, sku)')
        .eq('company_id', currentCompany.id)
        .eq('periodo_referencia', periodoReferencia)
        .order('created_at');
      
      if (error) throw error;
      
      // Gerar arquivo TXT no formato SPED
      let txtContent = '|K001|0|\n'; // Abertura do Bloco K
      
      (data || []).forEach((item, index) => {
        const linha = `|K200|${item.periodo_referencia}|${item.saldo_final || 0}|0|${item.products?.name || ''}||\n`;
        txtContent += linha;
      });
      
      txtContent += '|K990|' + (data?.length || 0 + 2) + '|\n'; // Encerramento
      
      // Criar blob e download
      const blob = new Blob([txtContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SPED_BLOCO_K_${periodoReferencia}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      
      return txtContent;
    },
    onSuccess: () => {
      toast.success('Arquivo SPED Bloco K exportado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao exportar: ' + error.message);
    },
  });
}
