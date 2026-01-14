import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

// Default currencies (static data while types aren't synced)
const DEFAULT_CURRENCIES: Currency[] = [
  { id: '1', code: 'BRL', name: 'Real Brasileiro', symbol: 'R$', decimal_places: 2, is_active: true, created_at: '' },
  { id: '2', code: 'USD', name: 'Dólar Americano', symbol: '$', decimal_places: 2, is_active: true, created_at: '' },
  { id: '3', code: 'EUR', name: 'Euro', symbol: '€', decimal_places: 2, is_active: true, created_at: '' },
  { id: '4', code: 'GBP', name: 'Libra Esterlina', symbol: '£', decimal_places: 2, is_active: true, created_at: '' },
];

export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: async () => {
      // Return default currencies while types aren't synced
      return DEFAULT_CURRENCIES;
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useExchangeRates(_currencyId?: string) {
  return useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async () => {
      // Tables created but types not synced yet
      return [] as ExchangeRate[];
    },
  });
}

export function useLatestExchangeRate(currencyCode: string) {
  return useQuery({
    queryKey: ['latest-exchange-rate', currencyCode],
    queryFn: async () => {
      if (currencyCode === 'BRL') {
        return { rate: 1, rate_date: new Date().toISOString().split('T')[0] };
      }
      return null;
    },
    enabled: !!currencyCode,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCurrencyExchange() {
  const convert = async (
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    _date?: string
  ): Promise<number> => {
    if (fromCurrency === toCurrency) return amount;
    // Simplified conversion - will be enhanced when types are synced
    return amount;
  };
  
  return { convert };
}

export function useCreateExchangeRate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (_data: {
      currency_id: string;
      rate: number;
      rate_date: string;
      source?: string;
    }) => {
      // Implementation pending type sync
      return {} as ExchangeRate;
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
