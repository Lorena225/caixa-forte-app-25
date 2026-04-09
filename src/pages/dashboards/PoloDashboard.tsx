import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, TrendingUp, TrendingDown,
  DollarSign, BarChart3, Building2, ArrowUpCircle, ArrowDownCircle
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCostCenters } from '@/hooks/useCompanyData';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ---- Formatadores ----
const fmtR = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#14B8A6', '#F59E0B', '#10B981', '#3B82F6', '#EF4444'];

// ---- Hook: transações do mês por centro de custo ----
function useTransactionsByCC(month: number, year: number) {
  const { currentCompany } = useAuth();

  return useQuery({
    queryKey: ['polo-dashboard-txn', currentCompany?.id, year, month],
    queryFn: async () => {
      const start = format(startOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');
      const end = format(endOfMonth(new Date(year, month - 1, 1)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, direction, amount, status, due_date, paid_date,
          cost_center_id,
          cost_centers:cost_center_id(id, code, name)
        `)
        .eq('company_id', currentCompany!.id)
        .neq('status', 'cancelado')
        .gte('due_date', start)
        .lte('due_date', end);

      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!currentCompany?.id,
  });
}

interface Transaction {
  id: string;
  direction: string;
  amount: number;
  status: string;
  due_date: string;
  paid_date?: string;
  cost_center_id?: string;
  cost_centers?: { id: string; code: string; name: string } | null;
}

// ---- Aggregated per CC ----
interface CCStats {
  id: string;
  code: string;
  name: string;
  receita: number;
  despesa: number;
  resultado: number;
  margem: number;
  recebido: number;
  pago: number;
  txCount: number;
}

function aggregate(transactions: Transaction[], costCenters: { id: string; code: string; name: string }[]): CCStats[] {
  const map: Record<string, CCStats> = {};

  // Inicializa todos os CCs
  for (const cc of costCenters) {
    map[cc.id] = { id: cc.id, code: cc.code, name: cc.name, receita: 0, despesa: 0, resultado: 0, margem: 0, recebido: 0, pago: 0, txCount: 0 };
  }
  // CC "Sem polo"
  map[''] = { id: '', code: '—', name: 'Sem polo', receita: 0, despesa: 0, resultado: 0, margem: 0, recebido: 0, pago: 0, txCount: 0 };

  for (const t of transactions) {
    const key = t.cost_center_id || '';
    if (!map[key]) {
      const cc = t.cost_centers;
      map[key] = { id: key, code: cc?.code || '—', name: cc?.name || 'Sem polo', receita: 0, despesa: 0, resultado: 0, margem: 0, recebido: 0, pago: 0, txCount: 0 };
    }
    const amt = Number(t.amount) || 0;
    map[key].txCount++;
    if (t.direction === 'entrada') {
      map[key].receita += amt;
      if (t.status === 'pago') map[key].recebido += amt;
    } else {
      map[key].despesa += amt;
      if (t.status === 'pago') map[key].pago += amt;
    }
  }

  return Object.values(map)
    .map(cc => ({
      ...cc,
      resultado: cc.receita - cc.despesa,
      margem: cc.receita > 0 ? ((cc.receita - cc.despesa) / cc.receita) * 100 : 0,
    }))
    .filter(cc => cc.txCount > 0 || costCenters.some(c => c.id === cc.id))
    .sort((a, b) => b.receita - a.receita);
}

const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function PoloDashboard() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data: costCenters = [] } = useCostCenters();
  const { data: transactions = [], isLoading } = useTransactionsByCC(month, year);

  const stats = useMemo(() =>
    aggregate(transactions, costCenters as { id: string; code: string; name: string }[]),
    [transactions, costCenters]
  );

  const totals = useMemo(() => {
    const receita = stats.reduce((s, c) => s + c.receita, 0);
    const despesa = stats.reduce((s, c) => s + c.despesa, 0);
    return { receita, despesa, resultado: receita - despesa, margem: receita > 0 ? ((receita - despesa) / receita) * 100 : 0 };
  }, [stats]);

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });

  const stepMonth = (d: number) => {
    const dt = new Date(year, month - 1 + d, 1);
    setMonth(dt.getMonth() + 1);
    setYear(dt.getFullYear());
  };

  // Dados para gráfico de barras comparativo
  const barData = stats.slice(0, 8).map(cc => ({
    name: cc.name.length > 14 ? cc.name.substring(0, 12) + '…' : cc.name,
    Receita: cc.receita,
    Despesa: cc.despesa,
    Resultado: cc.resultado,
  }));

  // Dados para pizza de receita por polo
  const pieData = stats.filter(s => s.receita > 0).slice(0, 6).map(cc => ({
    name: cc.name,
    value: cc.receita,
  }));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="h-6 w-6 text-primary" />
              Dashboard por Polo / Unidade
            </h1>
            <p className="text-muted-foreground">Resultado financeiro comparativo por centro de custo</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => stepMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[140px] text-center capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" onClick={() => stepMonth(1)}
              disabled={month === now.getMonth() + 1 && year === now.getFullYear()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* KPIs consolidados */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <ArrowUpCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receita total</p>
                <p className="text-xl font-bold text-green-600">{fmtR(totals.receita)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <ArrowDownCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesa total</p>
                <p className="text-xl font-bold text-red-500">{fmtR(totals.despesa)}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totals.resultado >= 0 ? 'bg-primary/10' : 'bg-red-100'}`}>
                {totals.resultado >= 0
                  ? <TrendingUp className="h-5 w-5 text-primary" />
                  : <TrendingDown className="h-5 w-5 text-red-500" />
                }
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Resultado</p>
                <p className={`text-xl font-bold ${totals.resultado >= 0 ? 'text-primary' : 'text-red-500'}`}>
                  {fmtR(totals.resultado)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totals.margem >= 20 ? 'bg-green-100' : totals.margem >= 0 ? 'bg-amber-100' : 'bg-red-100'}`}>
                <DollarSign className={`h-5 w-5 ${totals.margem >= 20 ? 'text-green-600' : totals.margem >= 0 ? 'text-amber-600' : 'text-red-500'}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Margem geral</p>
                <p className={`text-xl font-bold ${totals.margem >= 20 ? 'text-green-600' : totals.margem >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                  {totals.margem.toFixed(1)}%
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Barra comparativa */}
          <Card className="md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Comparativo por Polo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground">Carregando...</div>
              ) : barData.length === 0 ? (
                <div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma transação com polo definido neste período
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmtR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Receita" fill="#10B981" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Despesa" fill="#EF4444" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Resultado" fill="#6366F1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Pizza de receita */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Distribuição de Receita</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              {pieData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => fmtR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1 w-full mt-1">
                    {pieData.map((p, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="truncate max-w-[100px]">{p.name}</span>
                        </div>
                        <span className="font-medium">{totals.receita > 0 ? ((p.value / totals.receita) * 100).toFixed(0) : 0}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabela detalhada */}
        <Tabs defaultValue="resultado">
          <TabsList>
            <TabsTrigger value="resultado">Resultado por Polo</TabsTrigger>
            <TabsTrigger value="ranking">Ranking de Margem</TabsTrigger>
          </TabsList>

          <TabsContent value="resultado">
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : stats.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p>Nenhum dado encontrado para este período</p>
                    <p className="text-xs mt-1">Verifique se há transações com centro de custo atribuído</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Polo / Unidade</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                        <TableHead className="text-right">Despesa</TableHead>
                        <TableHead className="text-right">Resultado</TableHead>
                        <TableHead className="text-center">Margem</TableHead>
                        <TableHead className="text-right">Recebido</TableHead>
                        <TableHead className="text-right">Pago</TableHead>
                        <TableHead className="text-center">Lanç.</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.map((cc, i) => {
                        const isPositive = cc.resultado >= 0;
                        const margemColor = cc.margem >= 20 ? 'text-green-600' : cc.margem >= 0 ? 'text-amber-600' : 'text-red-500';
                        return (
                          <TableRow key={cc.id || i} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                  style={{ background: COLORS[i % COLORS.length] }}
                                />
                                <div>
                                  <p className="font-medium">{cc.name}</p>
                                  {cc.code !== '—' && <p className="text-xs text-muted-foreground">{cc.code}</p>}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-green-600 font-medium">{fmtR(cc.receita)}</TableCell>
                            <TableCell className="text-right text-red-500">{fmtR(cc.despesa)}</TableCell>
                            <TableCell className={`text-right font-semibold ${isPositive ? 'text-primary' : 'text-red-500'}`}>
                              {isPositive ? '+' : ''}{fmtR(cc.resultado)}
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-sm font-semibold ${margemColor}`}>
                                  {cc.margem.toFixed(1)}%
                                </span>
                                <Progress
                                  value={Math.max(0, Math.min(Math.abs(cc.margem), 100))}
                                  className="h-1 w-16"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{fmtR(cc.recebido)}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{fmtR(cc.pago)}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">{cc.txCount}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ranking">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Ranking de Margem de Contribuição</CardTitle>
                <CardDescription>Polos ordenados pela margem do período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[...stats]
                  .filter(c => c.receita > 0)
                  .sort((a, b) => b.margem - a.margem)
                  .map((cc, i) => (
                    <div key={cc.id || i} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cc.name}</span>
                          <span className={`text-sm font-semibold ${cc.margem >= 20 ? 'text-green-600' : cc.margem >= 0 ? 'text-amber-600' : 'text-red-500'}`}>
                            {cc.margem.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={Math.max(0, Math.min(cc.margem, 100))}
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Receita: {fmtR(cc.receita)} · Resultado: {fmtR(cc.resultado)}
                        </p>
                      </div>
                    </div>
                  ))
                }
                {stats.filter(c => c.receita > 0).length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum polo com receita neste período</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
