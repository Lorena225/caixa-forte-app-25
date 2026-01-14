import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface DigitalTaxBook {
  id: string;
  company_id: string;
  period_id: string | null;
  period_year: number;
  period_month: number;
  book_type: 'entrada' | 'saida' | 'inventario' | 'apuracao_icms' | 'apuracao_ipi' | 'servicos_prestados' | 'servicos_tomados';
  file_path: string | null;
  file_name: string | null;
  file_hash: string | null;
  file_size_bytes: number | null;
  generated_at: string | null;
  generated_by: string | null;
  is_signed: boolean;
  signed_at: string | null;
  signed_by: string | null;
  certificate_info: unknown | null;
  is_validated: boolean;
  validation_errors: unknown | null;
  is_transmitted: boolean;
  transmitted_at: string | null;
  protocol_number: string | null;
  status: 'pendente' | 'gerado' | 'assinado' | 'transmitido' | 'aceito' | 'rejeitado';
  created_at: string;
  updated_at: string;
}

const BOOK_TYPE_LABELS: Record<string, string> = {
  entrada: 'Livro de Entrada',
  saida: 'Livro de Saída',
  inventario: 'Livro de Inventário',
  apuracao_icms: 'Apuração ICMS',
  apuracao_ipi: 'Apuração IPI',
  servicos_prestados: 'Serviços Prestados',
  servicos_tomados: 'Serviços Tomados',
};

export function getBookTypeLabel(type: string): string {
  return BOOK_TYPE_LABELS[type] || type;
}

export function useDigitalBooks(year?: number, month?: number) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['digital-tax-books', currentCompany?.id, year, month],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      let query = supabase
        .from('digital_tax_books')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false });
      
      if (year) {
        query = query.eq('period_year', year);
      }
      if (month) {
        query = query.eq('period_month', month);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as DigitalTaxBook[];
    },
    enabled: !!currentCompany?.id,
  });
}

export function useDigitalBooksByType(bookType: string) {
  const { currentCompany } = useAuth();
  
  return useQuery({
    queryKey: ['digital-books-by-type', currentCompany?.id, bookType],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      
      const { data, error } = await supabase
        .from('digital_tax_books')
        .select('*')
        .eq('company_id', currentCompany.id)
        .eq('book_type', bookType)
        .order('period_year', { ascending: false })
        .order('period_month', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data as DigitalTaxBook[];
    },
    enabled: !!currentCompany?.id && !!bookType,
  });
}

export function useGenerateDigitalBook() {
  const queryClient = useQueryClient();
  const { currentCompany, user } = useAuth();
  
  return useMutation({
    mutationFn: async (data: { bookType: string; year: number; month: number }) => {
      if (!currentCompany?.id) throw new Error('Empresa não selecionada');
      
      // Check if book already exists
      const { data: existing } = await supabase
        .from('digital_tax_books')
        .select('id')
        .eq('company_id', currentCompany.id)
        .eq('book_type', data.bookType)
        .eq('period_year', data.year)
        .eq('period_month', data.month)
        .single();
      
      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('digital_tax_books')
          .update({
            status: 'gerado',
            generated_at: new Date().toISOString(),
            generated_by: user?.id,
            file_name: `${data.bookType}_${data.year}${String(data.month).padStart(2, '0')}.txt`,
          })
          .eq('id', existing.id);
        
        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('digital_tax_books')
          .insert({
            company_id: currentCompany.id,
            book_type: data.bookType,
            period_year: data.year,
            period_month: data.month,
            status: 'gerado',
            generated_at: new Date().toISOString(),
            generated_by: user?.id,
            file_name: `${data.bookType}_${data.year}${String(data.month).padStart(2, '0')}.txt`,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-tax-books'] });
      toast.success('Livro fiscal gerado com sucesso');
    },
    onError: (error: Error) => {
      toast.error('Erro ao gerar livro: ' + error.message);
    },
  });
}

export function useSignDigitalBook() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  return useMutation({
    mutationFn: async (bookId: string) => {
      const { error } = await supabase
        .from('digital_tax_books')
        .update({
          is_signed: true,
          signed_at: new Date().toISOString(),
          signed_by: user?.id,
          status: 'assinado',
        })
        .eq('id', bookId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['digital-tax-books'] });
      toast.success('Livro assinado digitalmente');
    },
    onError: (error: Error) => {
      toast.error('Erro ao assinar: ' + error.message);
    },
  });
}

export function useTransmitDigitalBook() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bookId: string) => {
      // Simulate transmission - in production this would call SEFAZ
      const protocol = `PROT${Date.now()}`;
      
      const { error } = await supabase
        .from('digital_tax_books')
        .update({
          is_transmitted: true,
          transmitted_at: new Date().toISOString(),
          protocol_number: protocol,
          status: 'aceito',
        })
        .eq('id', bookId);
      
      if (error) throw error;
      return protocol;
    },
    onSuccess: (protocol) => {
      queryClient.invalidateQueries({ queryKey: ['digital-tax-books'] });
      toast.success(`Livro transmitido. Protocolo: ${protocol}`);
    },
    onError: (error: Error) => {
      toast.error('Erro na transmissão: ' + error.message);
    },
  });
}
