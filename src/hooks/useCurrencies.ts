import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  decimal_places: number;
  is_active: boolean;
  created_at: string;
}

export interface ExchangeRate {
  id: string;
  currency_id: string;
  base_currency_code: string;
  rate: number;
  rate_date: string;
  source: string | null;
  created_at: string;
}

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('currencies')
        .select('*')
        .eq('is_active', true)
        .order('code');
      
      if (error) throw error;
      return data as Currency[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useExchangeRates(currencyId?: string) {
  return useQuery({
    queryKey: ['exchange-rates', currencyId],
    queryFn: async () => {
      let query = supabase
        .from('exchange_rates')
        .select('*')
        .order('rate_date', { ascending: false })
        .limit(30);
      
      if (currencyId) {
        query = query.eq('currency_id', currencyId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ExchangeRate[];
    },
    enabled: true,
  });
}

export function useLatestExchangeRate(currencyCode: string) {
  return useQuery({
    queryKey: ['latest-exchange-rate', currencyCode],
    queryFn: async () => {
      if (currencyCode === 'BRL') {
        return { rate: 1, rate_date: new Date().toISOString().split('T')[0] };
      }
      
      const { data: currency } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', currencyCode)
        .single();
      
      if (!currency) return null;
      
      const { data, error } = await supabase
        .from('exchange_rates')
        .select('*')
        .eq('currency_id', currency.id)
        .order('rate_date', { ascending: false })
        .limit(1)
        .single();
      
      if (error) return null;
      return data as ExchangeRate;
    },
    enabled: !!currencyCode && currencyCode !== 'BRL',
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCurrencyExchange() {
  const convert = async (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: string
  ): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;
    
    // Get rates for both currencies
    const getRate = async (currencyCode: string): Promise<number> => {
      if (currencyCode === 'BRL') return 1;
      
      const { data: currency } = await supabase
        .from('currencies')
        .select('id')
        .eq('code', currencyCode)
        .single();
      
      if (!currency) throw new Error(`Currency ${currencyCode} not found`);
      
      let query = supabase
        .from('exchange_rates')
        .select('rate')
        .eq('currency_id', currency.id)
        .order('rate_date', { ascending: false });
      
      if (date) {
        query = query.lte('rate_date', date);
      }
      
      const { data, error } = await query.limit(1).single();
      if (error || !data) throw new Error(`Exchange rate for ${currencyCode} not found`);
      
      return data.rate;
    };
    
    const fromRate = await getRate(fromCurrency);
    const toRate = await getRate(toCurrency);
    
    // Convert: amount in fromCurrency to BRL, then BRL to toCurrency
    const amountInBRL = amount * fromRate;
    const result = amountInBRL / toRate;
    
    return Math.round(result * 100) / 100;
  };
  
  return { convert };
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: {
      currency_id: string;
      rate: number;
      rate_date: string;
      source?: string;
    }) => {
      const { data: result, error } = await supabase
        .from('exchange_rates')
        .upsert({
          ...data,
          base_currency_code: 'BRL',
        }, {
          onConflict: 'currency_id,rate_date',
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exchange-rates'] });
      queryClient.invalidateQueries({ queryKey: ['latest-exchange-rate'] });
      toast.success('Taxa de câmbio salva');
    },
    onError: (error: Error) => {
      toast.error('Erro ao salvar taxa: ' + error.message);
    },
  });
}

// Fetch BCB exchange rates (edge function would be needed for production)
export async function fetchBCBRate(currencyCode: string, date: string): Promise<number | null> {
  // This would typically call an edge function that fetches from BCB API
  // For now, return null to indicate no automatic rate available
  return null;
}
