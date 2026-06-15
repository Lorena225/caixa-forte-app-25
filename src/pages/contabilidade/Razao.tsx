import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Filter, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

export default function Razao() {
  const { currentCompany } = useAuth();
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: accounts } = useQuery({
    queryKey: ['accounts-select', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('accounts')
        .select('id, code, name')
        .eq('company_id', currentCompany.id)
        .eq('allows_posting', true)
        .eq('is_active', true)
        .order('code');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id
  });

  const { data: ledgerData, isLoading } = useQuery({
    queryKey: ['ledger-data', currentCompany?.id, selectedAccount, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentCompany?.id || !selectedAccount) return null;

      const { data: lines, error } = await supabase
        .from('journal_lines')
        .select(`
          id,
          debit_amount,
          credit_amount,
          entry:journal_entries!inner(
            entry_date,
            entry_number,
            description,
            company_id
          )
        `)
        .eq('account_id', selectedAccount)
        .eq('entry.company_id', currentCompany.id)
        .gte('entry.entry_date', dateFrom)
        .lte('entry.entry_date', dateTo)
        .order('entry(entry_date)', { ascending: true });

      if (error) throw error;

      let balance = 0;
      const movements = (lines || []).map((line: any) => {
        const debit = Number(line.debit_amount) || 0;
        const credit = Number(line.credit_amount) || 0;
        balance += debit - credit;
        return {
          ...line,
          runningBalance: balance
        };
      });

      return { movements, finalBalance: balance };
    },
    enabled: !!currentCompany?.id && !!selectedAccount
  });

  const selectedAccountInfo = accounts?.find(a => a.id === selectedAccount);

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Livro Razão"
          description="Movimentação detalhada por conta contábil"
        >
          <Button variant="outline" disabled={!selectedAccount}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
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
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <div className="md:col-span-2">
                <Label>Conta Contábil</Label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta..." />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

        {selectedAccount && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                {selectedAccountInfo?.code} - {selectedAccountInfo?.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : ledgerData && ledgerData.movements.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Lançamento</TableHead>
                        <TableHead>Histórico</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-right">Crédito</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledgerData.movements.map((mov: any) => (
                        <TableRow key={mov.id}>
                          <TableCell>{format(new Date(mov.entry.entry_date), 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="font-mono text-sm">#{mov.entry.entry_number}</TableCell>
                          <TableCell className="max-w-xs truncate">{mov.entry.description}</TableCell>
                          <TableCell className="text-right">
                            {mov.debit_amount > 0 ? formatCurrency(mov.debit_amount) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {mov.credit_amount > 0 ? formatCurrency(mov.credit_amount) : '-'}
                          </TableCell>
                          <TableCell className={`text-right font-medium ${mov.runningBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                            {formatCurrency(mov.runningBalance)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 p-4 bg-muted rounded-lg flex justify-between items-center">
                    <span className="font-medium">Saldo Final</span>
                    <span className={`text-xl font-bold ${ledgerData.finalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(ledgerData.finalBalance)}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma movimentação encontrada no período
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
