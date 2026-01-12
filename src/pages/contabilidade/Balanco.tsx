import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Scale } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface BalanceItem {
  code: string;
  name: string;
  balance: number;
  level: number;
}

export default function Balanco() {
  const { currentCompany } = useAuth();
  const [referenceDate, setReferenceDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ['balance-sheet', currentCompany?.id, referenceDate],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from('v_trial_balance')
        .select('*')
        .eq('company_id', currentCompany.id)
        .lte('period_end', referenceDate);

      if (error) throw error;

      // Group by category
      const assets: BalanceItem[] = [];
      const liabilities: BalanceItem[] = [];
      const equity: BalanceItem[] = [];

      let totalAssets = 0;
      let totalLiabilities = 0;
      let totalEquity = 0;

      (data || []).forEach((row: any) => {
        const item = {
          code: row.account_code,
          name: row.account_name,
          balance: Number(row.closing_balance) || 0,
          level: row.level || 1
        };

        if (row.category_type === 'asset') {
          assets.push(item);
          totalAssets += item.balance;
        } else if (row.category_type === 'liability') {
          liabilities.push(item);
          totalLiabilities += item.balance;
        } else if (row.category_type === 'equity') {
          equity.push(item);
          totalEquity += item.balance;
        }
      });

      return {
        assets,
        liabilities,
        equity,
        totalAssets,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesAndEquity: totalLiabilities + totalEquity
      };
    },
    enabled: !!currentCompany?.id
  });

  const renderSection = (title: string, items: BalanceItem[], total: number, colorClass: string) => (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className={`text-lg ${colorClass}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center py-1"
              style={{ paddingLeft: `${(item.level - 1) * 1.5}rem` }}
            >
              <span className={item.level === 1 ? 'font-medium' : 'text-sm text-muted-foreground'}>
                <span className="font-mono text-xs mr-2">{item.code}</span>
                {item.name}
              </span>
              <span className={item.level === 1 ? 'font-medium' : ''}>
                {formatCurrency(Math.abs(item.balance))}
              </span>
            </div>
          ))}
        </div>
        <div className={`mt-4 pt-4 border-t flex justify-between items-center font-bold ${colorClass}`}>
          <span>Total {title}</span>
          <span className="text-xl">{formatCurrency(Math.abs(total))}</span>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Balanço Patrimonial"
          description="Demonstrativo de ativos, passivos e patrimônio líquido"
        >
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar PDF
          </Button>
        </PageHeader>

        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4 items-end">
              <div>
                <Label>Data de Referência</Label>
                <Input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                />
              </div>
              <Button variant="secondary">Atualizar</Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : balanceData ? (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                {renderSection('Ativo', balanceData.assets, balanceData.totalAssets, 'text-primary')}
              </div>
              <div className="space-y-6">
                {renderSection('Passivo', balanceData.liabilities, balanceData.totalLiabilities, 'text-destructive')}
                {renderSection('Patrimônio Líquido', balanceData.equity, balanceData.totalEquity, 'text-success')}
              </div>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-primary" />
                      <span className="font-medium">Total do Ativo</span>
                    </div>
                    <span className="text-2xl font-bold text-primary">
                      {formatCurrency(Math.abs(balanceData.totalAssets))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-success/5 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-success" />
                      <span className="font-medium">Passivo + PL</span>
                    </div>
                    <span className="text-2xl font-bold text-success">
                      {formatCurrency(Math.abs(balanceData.totalLiabilitiesAndEquity))}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum dado disponível para o período selecionado
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
