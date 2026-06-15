import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, TrendingUp, Info } from 'lucide-react';
import { ComposedChart, Area, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCashflowSummary } from '@/hooks/useFinanceModule';
import { formatCurrency } from '@/lib/formatters';
import { format, parseISO } from 'date-fns';

const RANGES = [30, 60, 90, 180];

export default function FluxoCaixaProjetado() {
  const [days, setDays] = useState(90);
  const { data: summary = [], isLoading } = useCashflowSummary(days);

  // saldo acumulado
  const chartData = useMemo(() => {
    let acc = 0;
    return summary.map((s) => {
      acc += Number(s.day_net);
      return {
        date: format(parseISO(s.ref_date), 'dd/MM'),
        entradas: Number(s.day_inflow),
        saidas: -Number(s.day_outflow),
        saldo: acc,
      };
    });
  }, [summary]);

  const totalIn = summary.reduce((s, d) => s + Number(d.day_inflow), 0);
  const totalOut = summary.reduce((s, d) => s + Number(d.day_outflow), 0);
  const net = totalIn - totalOut;
  const firstNegative = chartData.find((d) => d.saldo < 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Fluxo de Caixa Projetado"
          description="Projeção de entradas e saídas incluindo títulos, faturamento de projetos a realizar e despesas previstas">
          <div className="flex gap-1">
            {RANGES.map((r) => (
              <Button key={r} size="sm" variant={days === r ? 'default' : 'outline'} onClick={() => setDays(r)}>{r}d</Button>
            ))}
          </div>
        </PageHeader>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Entradas previstas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIn)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Saídas previstas</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold text-red-600">{formatCurrency(totalOut)}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Resultado projetado</CardTitle></CardHeader>
            <CardContent><p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(net)}</p></CardContent></Card>
        </div>

        {firstNegative && (
          <Alert variant="destructive">
            <AlertDescription>
              Saldo acumulado fica negativo a partir de <strong>{firstNegative.date}</strong> — antecipe recebimentos ou renegocie saídas.
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Projeção diária e saldo acumulado</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
              : chartData.length === 0 ? (
                <p className="text-center py-16 text-muted-foreground">Sem movimentações previstas no período. A projeção aparece conforme houver títulos em aberto e eventos de projeto aprovados.</p>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => formatCurrency(Math.abs(Number(v)))} />
                      <Legend />
                      <Bar dataKey="entradas" name="Entradas" fill="hsl(142 71% 45%)" />
                      <Bar dataKey="saidas" name="Saídas" fill="hsl(0 72% 51%)" />
                      <Line type="monotone" dataKey="saldo" name="Saldo acumulado" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
          </CardContent>
        </Card>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            A projeção combina três fontes: títulos a receber/pagar em aberto, eventos de faturamento de projetos já aprovados
            (entrada futura, antes de virar título) e despesas de projeto aprovadas ainda não pagas (saída futura). É o elo entre
            o módulo de Projetos e o caixa.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
}
