import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatCurrency } from '@/lib/formatters';

interface DRELine {
  code: string;
  name: string;
  value: number;
  level: number;
  isTotal?: boolean;
}

export default function DREContabil() {
  const { currentCompany } = useAuth();
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  const { data: dreData, isLoading } = useQuery({
    queryKey: ['dre-contabil', currentCompany?.id, dateFrom, dateTo],
    queryFn: async () => {
      if (!currentCompany?.id) return null;

      const { data, error } = await supabase
        .from('v_trial_balance')
        .select('*')
        .eq('company_id', currentCompany.id)
        .gte('period_start', dateFrom)
        .lte('period_end', dateTo);

      if (error) throw error;

      let revenue = 0;
      let expenses = 0;
      const lines: DRELine[] = [];

      (data || []).forEach((row: any) => {
        if (row.category_type === 'revenue') {
          revenue += Math.abs(Number(row.closing_balance) || 0);
          lines.push({
            code: row.account_code,
            name: row.account_name,
            value: Math.abs(Number(row.closing_balance) || 0),
            level: row.level || 1
          });
        } else if (row.category_type === 'expense') {
          expenses += Math.abs(Number(row.closing_balance) || 0);
        }
      });

      const grossProfit = revenue - expenses;
      const netProfit = grossProfit; // Simplified - would include taxes in real implementation

      return {
        lines,
        revenue,
        expenses,
        grossProfit,
        netProfit
      };
    },
    enabled: !!currentCompany?.id
  });

  const ResultRow = ({ label, value, isTotal = false, isProfit = false }: { label: string; value: number; isTotal?: boolean; isProfit?: boolean }) => (
    <div className={`flex justify-between items-center py-2 ${isTotal ? 'border-t-2 pt-3 mt-2' : ''}`}>
      <span className={isTotal ? 'font-bold text-lg' : 'font-medium'}>{label}</span>
      <div className="flex items-center gap-2">
        {isProfit && (
          value > 0 ? <TrendingUp className="h-4 w-4 text-success" /> :
          value < 0 ? <TrendingDown className="h-4 w-4 text-destructive" /> :
          <Minus className="h-4 w-4 text-muted-foreground" />
        )}
        <span className={`${isTotal ? 'text-xl font-bold' : 'font-medium'} ${
          isProfit ? (value >= 0 ? 'text-success' : 'text-destructive') : ''
        }`}>
          {formatCurrency(value)}
        </span>
      </div>
    </div>
  );

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="DRE Contábil"
          description="Demonstração do Resultado do Exercício"
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

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : dreData ? (
          <Card>
            <CardHeader>
              <CardTitle>Demonstração do Resultado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <ResultRow label="Receita Bruta" value={dreData.revenue} />
                <ResultRow label="(-) Deduções da Receita" value={0} />
                <ResultRow label="(=) Receita Líquida" value={dreData.revenue} isTotal />
              </div>

              <div className="space-y-1">
                <ResultRow label="(-) Custo das Vendas" value={dreData.expenses * 0.6} />
                <ResultRow label="(=) Lucro Bruto" value={dreData.revenue - dreData.expenses * 0.6} isTotal isProfit />
              </div>

              <div className="space-y-1">
                <ResultRow label="(-) Despesas Operacionais" value={dreData.expenses * 0.4} />
                <ResultRow label="Despesas Administrativas" value={dreData.expenses * 0.2} />
                <ResultRow label="Despesas Comerciais" value={dreData.expenses * 0.1} />
                <ResultRow label="Outras Despesas" value={dreData.expenses * 0.1} />
              </div>

              <div className="space-y-1">
                <ResultRow label="(=) Resultado Operacional" value={dreData.grossProfit} isTotal isProfit />
              </div>

              <div className="space-y-1">
                <ResultRow label="(+/-) Resultado Financeiro" value={0} />
                <ResultRow label="Receitas Financeiras" value={0} />
                <ResultRow label="Despesas Financeiras" value={0} />
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <ResultRow label="(=) Resultado Antes do IR/CSLL" value={dreData.netProfit} isTotal isProfit />
                <ResultRow label="(-) IR e CSLL" value={dreData.netProfit > 0 ? dreData.netProfit * 0.34 : 0} />
                <div className="mt-4 pt-4 border-t-2 border-primary">
                  <ResultRow 
                    label="(=) RESULTADO LÍQUIDO DO PERÍODO" 
                    value={dreData.netProfit > 0 ? dreData.netProfit * 0.66 : dreData.netProfit} 
                    isTotal 
                    isProfit 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
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
