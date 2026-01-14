import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Target, TrendingUp, TrendingDown, AlertTriangle,
  Plus, FileSpreadsheet, BarChart3, Download
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useBudgets, useBudgetVsActual, useCreateBudget, Budget } from '@/hooks/useBudgetsAdvanced';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function OrcamentoReal() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>();
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState('');
  
  const { data: budgets = [], isLoading } = useBudgets(selectedYear);
  const { data: comparison } = useBudgetVsActual(selectedBudgetId);
  const createBudget = useCreateBudget();

  const getStatusBadge = (status: Budget['status']) => {
    const styles = {
      rascunho: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      aprovado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      ativo: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      fechado: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    };
    const labels = {
      rascunho: 'Rascunho',
      aprovado: 'Aprovado',
      ativo: 'Ativo',
      fechado: 'Fechado',
    };
    return (
      <Badge className={styles[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const handleCreateBudget = () => {
    if (!newBudgetName) return;
    createBudget.mutate({
      name: newBudgetName,
      year: selectedYear,
      period_type: 'mensal',
    }, {
      onSuccess: () => {
        setShowNewBudgetDialog(false);
        setNewBudgetName('');
      },
    });
  };

  // Mock chart data
  const chartData = MONTHS.map((month, idx) => ({
    month,
    planejado: Math.random() * 100000 + 50000,
    realizado: Math.random() * 100000 + 45000,
  }));

  // Mock variance stats
  const stats = {
    totalPlanned: comparison?.totalPlanned || 0,
    totalActual: comparison?.totalActual || 0,
    totalVariance: comparison?.totalVariance || 0,
    adherencePercent: comparison?.adherencePercent || 0,
    alertCount: comparison?.alertItems?.length || 0,
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Orçamento vs Real"
          description="Compare valores orçados com realizados e identifique desvios"
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-4">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[2024, 2025, 2026].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedBudgetId || '__none__'} onValueChange={(v) => setSelectedBudgetId(v === '__none__' ? undefined : v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um orçamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione...</SelectItem>
                {budgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar Excel
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Dialog open={showNewBudgetDialog} onOpenChange={setShowNewBudgetDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Orçamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Orçamento</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Nome do Orçamento</label>
                    <Input
                      value={newBudgetName}
                      onChange={(e) => setNewBudgetName(e.target.value)}
                      placeholder={`Orçamento ${selectedYear}`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Ano</label>
                    <Input value={selectedYear} disabled />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleCreateBudget}
                    disabled={!newBudgetName || createBudget.isPending}
                  >
                    Criar Orçamento
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orçado</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPlanned)}</p>
                </div>
                <Target className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Realizado</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalActual)}</p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Variação</p>
                  <p className={`text-2xl font-bold ${stats.totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(stats.totalVariance)}
                  </p>
                </div>
                {stats.totalVariance >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-red-500" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aderência</p>
                  <p className="text-2xl font-bold">{stats.adherencePercent.toFixed(1)}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas (&gt;10%)</p>
                  <p className="text-2xl font-bold text-orange-600">{stats.alertCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Comparativo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="planejado" name="Planejado" fill="#3b82f6" />
                <Bar dataKey="realizado" name="Realizado" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Budgets List or Detail */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedBudgetId ? 'Detalhes do Orçamento' : 'Orçamentos'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Carregando...</p>
            ) : budgets.length === 0 ? (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhum orçamento criado para {selectedYear}</p>
                <Button className="mt-4" onClick={() => setShowNewBudgetDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Orçamento
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total Planejado</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium">{budget.name}</TableCell>
                      <TableCell>{budget.year}</TableCell>
                      <TableCell className="capitalize">{budget.period_type}</TableCell>
                      <TableCell>{getStatusBadge(budget.status)}</TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedBudgetId(budget.id)}
                        >
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
