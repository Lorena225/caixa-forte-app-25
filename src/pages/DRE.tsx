import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDreMonthly } from '@/hooks/useCompanyData';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { TrendingUp, TrendingDown, Target, DollarSign } from 'lucide-react';

const categoryLabels: Record<string, string> = {
  receita: 'Receitas',
  custo: 'Custos',
  despesa: 'Despesas',
};

export default function DRE() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  
  const { data: dreData = [], isLoading } = useDreMonthly(year);
  
  // Group by category and month
  const grouped = dreData.reduce((acc: any, item) => {
    const cat = item.category_type as string;
    if (!acc[cat]) acc[cat] = { total: 0, byMonth: {} };
    acc[cat].total += Number(item.total || 0);
    const month = item.month || 0;
    if (!acc[cat].byMonth[month]) acc[cat].byMonth[month] = 0;
    acc[cat].byMonth[month] += Number(item.total || 0);
    return acc;
  }, {});

  const totalReceitas = grouped.receita?.total || 0;
  const totalCustos = grouped.custo?.total || 0;
  const totalDespesas = grouped.despesa?.total || 0;
  const lucrobruto = totalReceitas - totalCustos;
  const resultado = lucrobruto - totalDespesas;
  const margem = totalReceitas > 0 ? ((resultado / totalReceitas) * 100).toFixed(1) : '0.0';

  // Build monthly breakdown
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const monthlyData = months.map(m => {
    const rec = grouped.receita?.byMonth[m] || 0;
    const cus = grouped.custo?.byMonth[m] || 0;
    const des = grouped.despesa?.byMonth[m] || 0;
    const lb = rec - cus;
    const res = lb - des;
    return { month: m, receitas: rec, custos: cus, despesas: des, lucrobruto: lb, resultado: res };
  });

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="DRE - Demonstrativo de Resultado" description="Análise de receitas, custos e despesas">
          <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </PageHeader>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="kpi-card kpi-card-success">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receita Bruta</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold value-positive">{formatCurrency(totalReceitas)}</div>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-danger">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Custos + Despesas</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold value-negative">{formatCurrency(totalCustos + totalDespesas)}</div>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-primary">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Líquido</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                {formatCurrency(resultado)}
              </div>
            </CardContent>
          </Card>
          <Card className="kpi-card kpi-card-warning">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Margem Líquida</CardTitle>
              <Target className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{margem}%</div>
            </CardContent>
          </Card>
        </div>

        {/* DRE Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Demonstrativo Resumido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="font-medium">Receita Bruta</span>
                <span className="value-positive font-semibold">{formatCurrency(totalReceitas)}</span>
              </div>
              <div className="flex justify-between py-2 border-b pl-4">
                <span className="text-muted-foreground">(-) Custos dos Produtos/Serviços</span>
                <span className="value-negative">{formatCurrency(totalCustos)}</span>
              </div>
              <div className="flex justify-between py-2 border-b bg-muted/30 px-2 rounded">
                <span className="font-medium">(=) Lucro Bruto</span>
                <span className={`font-semibold ${lucrobruto >= 0 ? 'value-positive' : 'value-negative'}`}>
                  {formatCurrency(lucrobruto)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b pl-4">
                <span className="text-muted-foreground">(-) Despesas Operacionais</span>
                <span className="value-negative">{formatCurrency(totalDespesas)}</span>
              </div>
              <div className="flex justify-between py-3 bg-primary/5 px-2 rounded">
                <span className="font-bold">(=) Resultado Líquido</span>
                <span className={`text-lg font-bold ${resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                  {formatCurrency(resultado)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Table */}
        <Card>
          <CardHeader>
            <CardTitle>DRE Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="data-table text-sm">
                <thead>
                  <tr>
                    <th>Mês</th>
                    <th className="text-right">Receitas</th>
                    <th className="text-right">Custos</th>
                    <th className="text-right">Lucro Bruto</th>
                    <th className="text-right">Despesas</th>
                    <th className="text-right">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyData.map((row) => (
                    <tr key={row.month}>
                      <td className="font-medium">{formatShortMonth(row.month)}</td>
                      <td className="text-right value-positive">{formatCurrency(row.receitas)}</td>
                      <td className="text-right value-negative">{formatCurrency(row.custos)}</td>
                      <td className={`text-right font-medium ${row.lucrobruto >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.lucrobruto)}
                      </td>
                      <td className="text-right value-negative">{formatCurrency(row.despesas)}</td>
                      <td className={`text-right font-semibold ${row.resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                        {formatCurrency(row.resultado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/50 font-semibold">
                    <td>TOTAL</td>
                    <td className="text-right value-positive">{formatCurrency(totalReceitas)}</td>
                    <td className="text-right value-negative">{formatCurrency(totalCustos)}</td>
                    <td className={`text-right ${lucrobruto >= 0 ? 'value-positive' : 'value-negative'}`}>
                      {formatCurrency(lucrobruto)}
                    </td>
                    <td className="text-right value-negative">{formatCurrency(totalDespesas)}</td>
                    <td className={`text-right ${resultado >= 0 ? 'value-positive' : 'value-negative'}`}>
                      {formatCurrency(resultado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
