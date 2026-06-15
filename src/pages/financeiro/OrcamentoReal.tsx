import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Target, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Plus, FileSpreadsheet, BarChart3, Download, Copy, History, 
  Sparkles, HelpCircle, ArrowRight, RefreshCcw, FileText, Send
} from 'lucide-react';
import { formatCurrency, formatShortMonth } from '@/lib/formatters';
import { 
  useBudgetMasterAnalysis, 
  useBudgetRevisions,
  useCreateBudgetMaster, 
  useCreateBudgetRevision,
  useDuplicateBudget,
  useApproveBudget,
  useActivateBudget,
  useBudgetVsActualAdvanced,
  BudgetMasterAnalysis 
} from '@/hooks/useBudgetModule';
import { useBudgetVsActual } from '@/hooks/useDashboardData';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, 
  ResponsiveContainer, LineChart, Line, ComposedChart, Area
} from 'recharts';
import { toast } from 'sonner';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const SCENARIO_LABELS: Record<string, string> = {
  original: 'Original',
  otimista: 'Otimista',
  realista: 'Realista',
  pessimista: 'Pessimista',
};
const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  rascunho: { label: 'Rascunho', variant: 'secondary' },
  pendente_aprovacao: { label: 'Pendente Aprovação', variant: 'outline' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  ativo: { label: 'Ativo', variant: 'default' },
  fechado: { label: 'Fechado', variant: 'secondary' },
  arquivado: { label: 'Arquivado', variant: 'secondary' },
};

function getVarianceStatus(variance: number): { icon: React.ReactNode; color: string; label: string } {
  const absVariance = Math.abs(variance);
  if (absVariance <= 5) return { icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-success', label: 'Normal' };
  if (absVariance <= 15) return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-warning', label: 'Atenção' };
  return { icon: <AlertTriangle className="h-4 w-4" />, color: 'text-destructive', label: 'Crítico' };
}

export default function OrcamentoReal() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>();
  const [selectedScenario, setSelectedScenario] = useState<string>('all');
  const [comparisonScenario, setComparisonScenario] = useState<string>('original');
  const [frequency, setFrequency] = useState<'mensal' | 'trimestral' | 'acumulado'>('mensal');
  const [showNewBudgetDialog, setShowNewBudgetDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [newBudgetForm, setNewBudgetForm] = useState({ name: '', scenario_type: 'original', notes: '' });
  const [revisionForm, setRevisionForm] = useState({ name: '', reason: '' });
  const [duplicateForm, setDuplicateForm] = useState({ name: '', scenario_type: 'realista' });

  const { data: budgets = [], isLoading } = useBudgetMasterAnalysis(selectedYear);
  const { data: revisions = [] } = useBudgetRevisions(selectedBudgetId);
  const { data: vsActualData } = useBudgetVsActual(selectedYear);
  const { data: advancedComparison } = useBudgetVsActualAdvanced(selectedBudgetId, selectedYear);
  
  const createBudget = useCreateBudgetMaster();
  const createRevision = useCreateBudgetRevision();
  const duplicateBudget = useDuplicateBudget();
  const approveBudget = useApproveBudget();
  const activateBudget = useActivateBudget();

  const filteredBudgets = selectedScenario === 'all' 
    ? budgets 
    : budgets.filter(b => b.scenario_type === selectedScenario);

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  // Chart data from view or advanced comparison
  const chartData = (vsActualData || []).map((item, idx) => ({
    month: MONTHS[idx] || formatShortMonth(item.month),
    'Meta Receita': Number(item.target_revenue || 0),
    'Real Receita': Number(item.actual_revenue || 0),
    'Meta Despesa': Number(item.target_expense || 0),
    'Real Despesa': Number(item.actual_expense || 0),
  }));

  // Stats calculation
  const stats = {
    totalPlanned: advancedComparison?.totals.planned_revenue || 0,
    totalActual: advancedComparison?.totals.actual_revenue || 0,
    totalVariance: advancedComparison?.totals.revenue_variance || 0,
    adherencePercent: advancedComparison?.totals.planned_revenue 
      ? (advancedComparison.totals.actual_revenue / advancedComparison.totals.planned_revenue) * 100 
      : 0,
    alertCount: (advancedComparison?.lines || []).filter(l => Math.abs(l.variance_percent) > 10).length,
  };

  const handleCreateBudget = () => {
    if (!newBudgetForm.name) return;
    createBudget.mutate({
      name: newBudgetForm.name,
      year: selectedYear,
      period_type: 'mensal',
      scenario_type: newBudgetForm.scenario_type,
      notes: newBudgetForm.notes,
    }, {
      onSuccess: () => {
        setShowNewBudgetDialog(false);
        setNewBudgetForm({ name: '', scenario_type: 'original', notes: '' });
      },
    });
  };

  const handleCreateRevision = () => {
    if (!selectedBudgetId) return;
    createRevision.mutate({
      budgetId: selectedBudgetId,
      revisionName: revisionForm.name,
      reason: revisionForm.reason,
    }, {
      onSuccess: () => {
        setShowRevisionDialog(false);
        setRevisionForm({ name: '', reason: '' });
      },
    });
  };

  const handleDuplicate = () => {
    if (!selectedBudgetId || !duplicateForm.name) return;
    duplicateBudget.mutate({
      sourceBudgetId: selectedBudgetId,
      newName: duplicateForm.name,
      scenarioType: duplicateForm.scenario_type,
    }, {
      onSuccess: () => {
        setShowDuplicateDialog(false);
        setDuplicateForm({ name: '', scenario_type: 'realista' });
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6 form-surface">
        <PageHeader
          title="Orçamento vs Real"
          description="Compare valores orçados com realizados, gerencie revisões e cenários"
        />

      <a href="/ia/agente-orcamento" className="flex items-center gap-3 p-3 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors mb-4">
        <div className="h-8 w-8 rounded-full bg-violet-600 flex items-center justify-center text-white text-sm">🤖</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-violet-900">Agente IA de Orçamento</p>
          <p className="text-xs text-violet-700">Análise de variância automática, forecast rolling 12 meses e alertas de estouro</p>
        </div>
        <span className="text-xs font-medium text-violet-700">Abrir agente →</span>
      </a>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedScenario} onValueChange={setSelectedScenario}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Cenário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Cenários</SelectItem>
                {Object.entries(SCENARIO_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedBudgetId || '__none__'} onValueChange={(v) => setSelectedBudgetId(v === '__none__' ? undefined : v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um orçamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione...</SelectItem>
                {filteredBudgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} (v{b.version}) - {SCENARIO_LABELS[b.scenario_type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedBudgetId && (
              <Select value={comparisonScenario} onValueChange={setComparisonScenario}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Comparar com" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="original">vs Original</SelectItem>
                  {revisions.map(r => (
                    <SelectItem key={r.id} value={`rev-${r.revision_number}`}>
                      vs {r.revision_name || `Revisão ${r.revision_number}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="acumulado">Acumulado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm">
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
                  <div className="space-y-2">
                    <Label>Nome do Orçamento</Label>
                    <Input
                      value={newBudgetForm.name}
                      onChange={(e) => setNewBudgetForm(f => ({ ...f, name: e.target.value }))}
                      placeholder={`Orçamento ${selectedYear}`}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Cenário</Label>
                    <Select 
                      value={newBudgetForm.scenario_type} 
                      onValueChange={(v) => setNewBudgetForm(f => ({ ...f, scenario_type: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(SCENARIO_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea
                      value={newBudgetForm.notes}
                      onChange={(e) => setNewBudgetForm(f => ({ ...f, notes: e.target.value }))}
                      placeholder="Notas sobre este orçamento..."
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowNewBudgetDialog(false)}>Cancelar</Button>
                  <Button onClick={handleCreateBudget} disabled={!newBudgetForm.name || createBudget.isPending}>
                    Criar Orçamento
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Orçado</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalPlanned)}</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
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
                <BarChart3 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Variação</p>
                  <p className={`text-2xl font-bold ${stats.totalVariance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(stats.totalVariance)}
                  </p>
                </div>
                {stats.totalVariance >= 0 ? (
                  <TrendingUp className="h-8 w-8 text-success" />
                ) : (
                  <TrendingDown className="h-8 w-8 text-destructive" />
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
                <Target className="h-8 w-8 text-info" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas (&gt;10%)</p>
                  <p className="text-2xl font-bold text-warning">{stats.alertCount}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Comparativo Mensal - Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Meta Receita" fill="hsl(var(--primary) / 0.3)" />
                  <Bar dataKey="Real Receita" fill="hsl(var(--primary))" />
                  <Line type="monotone" dataKey="Meta Receita" stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparativo Mensal - Despesa</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                  <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="Meta Despesa" fill="hsl(var(--destructive) / 0.3)" />
                  <Bar dataKey="Real Despesa" fill="hsl(var(--destructive))" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tendências & Insights AI Panel */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Tendências & Insights (IA)
            </CardTitle>
            <CardDescription>Análise automática do desempenho orçamentário</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="font-medium">Execução de Receita</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Você está em <span className="font-semibold text-foreground">{stats.adherencePercent.toFixed(0)}%</span> da meta de receita em relação ao período.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-warning" />
                  <span className="font-medium">Controle de Despesas</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  As despesas estão <span className="font-semibold text-foreground">
                    {((advancedComparison?.totals.expense_variance || 0) / Math.max(advancedComparison?.totals.planned_expense || 1, 1) * 100).toFixed(1)}%
                  </span> {(advancedComparison?.totals.expense_variance || 0) > 0 ? 'acima' : 'abaixo'} do planejado.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background border">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-info" />
                  <span className="font-medium">Projeção Anual</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  O ritmo atual indica que você fechará o ano com <span className="font-semibold text-foreground">{Math.min(stats.adherencePercent * 1.1, 120).toFixed(0)}%</span> de realização do orçado.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budgets List with Actions */}
        <Tabs defaultValue="budgets" className="w-full">
          <TabsList>
            <TabsTrigger value="budgets">Orçamentos</TabsTrigger>
            <TabsTrigger value="revisions" disabled={!selectedBudgetId}>Revisões ({revisions.length})</TabsTrigger>
            <TabsTrigger value="details" disabled={!selectedBudgetId}>Detalhamento</TabsTrigger>
          </TabsList>

          <TabsContent value="budgets">
            <Card>
              <CardHeader>
                <CardTitle>Orçamentos do Ano</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Carregando...</p>
                ) : filteredBudgets.length === 0 ? (
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
                        <TableHead>Cenário</TableHead>
                        <TableHead>Versão</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Receita Planejada</TableHead>
                        <TableHead className="text-right">Despesa Planejada</TableHead>
                        <TableHead>Revisões</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBudgets.map((budget) => (
                        <TableRow key={budget.id} className={selectedBudgetId === budget.id ? 'bg-muted/50' : ''}>
                          <TableCell className="font-medium">
                            {budget.name}
                            {budget.is_active && <Badge variant="default" className="ml-2">Ativo</Badge>}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{SCENARIO_LABELS[budget.scenario_type]}</Badge>
                          </TableCell>
                          <TableCell>v{budget.version}</TableCell>
                          <TableCell>
                            <Badge variant={STATUS_CONFIG[budget.status]?.variant || 'secondary'}>
                              {STATUS_CONFIG[budget.status]?.label || budget.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.total_revenue_planned)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(budget.total_expense_planned)}</TableCell>
                          <TableCell>{budget.revisions_count}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" onClick={() => setSelectedBudgetId(budget.id)}>
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver Detalhes</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button 
                                      variant="ghost" 
                                      size="icon" 
                                      onClick={() => { setSelectedBudgetId(budget.id); setShowDuplicateDialog(true); }}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Duplicar / Criar Cenário</TooltipContent>
                                </Tooltip>

                                {budget.status === 'rascunho' && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => approveBudget.mutate(budget.id)}
                                      >
                                        <CheckCircle2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Aprovar</TooltipContent>
                                  </Tooltip>
                                )}

                                {budget.status === 'aprovado' && !budget.is_active && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        variant="ghost" 
                                        size="icon"
                                        onClick={() => activateBudget.mutate({ budgetId: budget.id, year: budget.year })}
                                      >
                                        <RefreshCcw className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Ativar</TooltipContent>
                                  </Tooltip>
                                )}
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="revisions">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Histórico de Revisões</CardTitle>
                  <CardDescription>Versões anteriores do orçamento selecionado</CardDescription>
                </div>
                <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <History className="h-4 w-4 mr-2" />
                      Criar Revisão
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Criar Nova Revisão</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Nome da Revisão</Label>
                        <Input
                          value={revisionForm.name}
                          onChange={(e) => setRevisionForm(f => ({ ...f, name: e.target.value }))}
                          placeholder={`Revisão ${revisions.length + 1}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Motivo da Revisão</Label>
                        <Textarea
                          value={revisionForm.reason}
                          onChange={(e) => setRevisionForm(f => ({ ...f, reason: e.target.value }))}
                          placeholder="Descreva o motivo desta revisão..."
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>Cancelar</Button>
                      <Button onClick={handleCreateRevision} disabled={createRevision.isPending}>
                        Criar Revisão
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {revisions.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhuma revisão criada ainda</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Revisão</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Criado em</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revisions.map((rev) => (
                        <TableRow key={rev.id}>
                          <TableCell>#{rev.revision_number}</TableCell>
                          <TableCell className="font-medium">{rev.revision_name || `Revisão ${rev.revision_number}`}</TableCell>
                          <TableCell className="text-muted-foreground">{rev.reason || '-'}</TableCell>
                          <TableCell>{new Date(rev.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="details">
            <Card>
              <CardHeader>
                <CardTitle>Detalhamento por Conta</CardTitle>
                <CardDescription>
                  {selectedBudget?.name} - Variações por conta contábil
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!advancedComparison?.lines || advancedComparison.lines.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">Nenhuma linha de orçamento cadastrada</p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Conta</TableHead>
                          <TableHead>Mês</TableHead>
                          <TableHead className="text-right">Planejado</TableHead>
                          <TableHead className="text-right">Realizado</TableHead>
                          <TableHead className="text-right">Variação</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {advancedComparison.lines.slice(0, 50).map((line, idx) => {
                          const status = getVarianceStatus(line.variance_percent);
                          return (
                            <TableRow key={idx}>
                              <TableCell className="font-medium">
                                {(line.account as { account_name?: string })?.account_name || 'N/A'}
                              </TableCell>
                              <TableCell>{MONTHS[(line.month as number) - 1]}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.planned_amount as number)}</TableCell>
                              <TableCell className="text-right">{formatCurrency(line.actual_amount)}</TableCell>
                              <TableCell className={`text-right ${line.variance >= 0 ? 'text-success' : 'text-destructive'}`}>
                                {line.variance >= 0 ? '+' : ''}{line.variance_percent.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-center">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <span className={status.color}>{status.icon}</span>
                                    </TooltipTrigger>
                                    <TooltipContent>{status.label}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Duplicate Dialog */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar Orçamento / Criar Cenário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Novo Orçamento</Label>
                <Input
                  value={duplicateForm.name}
                  onChange={(e) => setDuplicateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder={`${selectedBudget?.name} - Cópia`}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Cenário</Label>
                <Select 
                  value={duplicateForm.scenario_type} 
                  onValueChange={(v) => setDuplicateForm(f => ({ ...f, scenario_type: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SCENARIO_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Cancelar</Button>
              <Button onClick={handleDuplicate} disabled={!duplicateForm.name || duplicateBudget.isPending}>
                Duplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
