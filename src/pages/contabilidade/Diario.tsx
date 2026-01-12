import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar, Download, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

export default function Diario() {
  const { currentCompany } = useAuth();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal-entries-diario', currentCompany?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentCompany?.id) return [];

      const { data, error } = await supabase
        .from('journal_entries')
        .select(`
          id,
          entry_date,
          entry_number,
          description,
          journal_lines(
            id,
            debit_amount,
            credit_amount,
            account:accounts(code, name)
          )
        `)
        .eq('company_id', currentCompany.id)
        .gte('entry_date', dateFrom)
        .lte('entry_date', dateTo)
        .order('entry_date', { ascending: true })
        .order('entry_number', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Livro Diário"
          description="Todos os lançamentos contábeis em ordem cronológica"
        >
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div>
                <Label>Data Inicial</Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label>Data Final</Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : entries && entries.length > 0 ? (
              <div className="space-y-6">
                {entries.map((entry: any) => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-center gap-4 mb-3">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{format(new Date(entry.entry_date), 'dd/MM/yyyy')}</span>
                      <span className="font-mono text-sm text-muted-foreground">#{entry.entry_number}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{entry.description}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead className="text-right">Débito</TableHead>
                          <TableHead className="text-right">Crédito</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entry.journal_lines?.map((line: any) => (
                          <TableRow key={line.id}>
                            <TableCell>
                              <span className="font-mono text-xs mr-2">{line.account?.code}</span>
                              {line.account?.name}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.debit_amount > 0 ? formatCurrency(line.debit_amount) : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              {line.credit_amount > 0 ? formatCurrency(line.credit_amount) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum lançamento encontrado no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
