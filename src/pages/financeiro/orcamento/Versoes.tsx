import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  History, GitBranch, Copy, FileText,
  Plus, ArrowLeftRight, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { VersionHistory } from '@/components/budget/VersionHistory';
import { 
  useBudgetMasters, 
  useBudgetRevisions, 
  useCreateBudgetRevision,
  useDuplicateBudget 
} from '@/hooks/useBudgetModule';
import { useCompareVersions } from '@/hooks/useBudgetAdvanced';
import { toast } from 'sonner';
import { formatCurrency } from '@/lib/formatters';

export default function VersoesPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>();
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [compareVersions, setCompareVersions] = useState<{ v1: number; v2: number }>({ v1: 1, v2: 2 });
  const [revisionForm, setRevisionForm] = useState({ name: '', reason: '' });
  const [duplicateForm, setDuplicateForm] = useState({ name: '', scenario_type: 'realista' });

  const { data: budgets = [] } = useBudgetMasters(selectedYear);
  const { data: revisions = [], isLoading } = useBudgetRevisions(selectedBudgetId);
  const createRevision = useCreateBudgetRevision();
  const duplicateBudget = useDuplicateBudget();
  const { data: comparisonData } = useCompareVersions(selectedBudgetId);

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);

  const handleCreateRevision = () => {
    if (!selectedBudgetId || !revisionForm.name) return;
    createRevision.mutate({
      budgetId: selectedBudgetId,
      revisionName: revisionForm.name,
      reason: revisionForm.reason,
    }, {
      onSuccess: () => {
        setShowRevisionDialog(false);
        setRevisionForm({ name: '', reason: '' });
        toast.success('Revisão criada com sucesso');
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
        toast.success('Orçamento duplicado com sucesso');
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Versionamento de Orçamentos"
          description="Gerencie revisões, compare versões e duplique orçamentos"
        />

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
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

            <Select value={selectedBudgetId || '__none__'} onValueChange={(v) => setSelectedBudgetId(v === '__none__' ? undefined : v)}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Selecione um orçamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione...</SelectItem>
                {budgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name} (v{b.version})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowCompareDialog(true)}
              disabled={!selectedBudgetId || revisions.length < 2}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              Comparar Versões
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowDuplicateDialog(true)}
              disabled={!selectedBudgetId}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicar
            </Button>
            <Button 
              onClick={() => setShowRevisionDialog(true)}
              disabled={!selectedBudgetId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Revisão
            </Button>
          </div>
        </div>

        {/* Budget Info Card */}
        {selectedBudget && (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {selectedBudget.name}
                  </CardTitle>
                  <CardDescription>
                    Versão {selectedBudget.version} • {selectedBudget.scenario_type}
                  </CardDescription>
                </div>
                <Badge variant={selectedBudget.status === 'ativo' ? 'default' : 'secondary'}>
                  {selectedBudget.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Criado em</p>
                  <p className="font-medium">
                    {format(new Date(selectedBudget.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Período</p>
                  <p className="font-medium">{selectedBudget.period_type}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total de Revisões</p>
                  <p className="font-medium">{revisions.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Última Revisão</p>
                  <p className="font-medium">
                    {revisions[0] ? format(new Date(revisions[0].created_at), 'dd/MM/yyyy', { locale: ptBR }) : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="history" className="space-y-4">
          <TabsList>
            <TabsTrigger value="history">
              <History className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <GitBranch className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            {selectedBudgetId ? (
              <VersionHistory budgetId={selectedBudgetId} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione um orçamento para visualizar o histórico de versões
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5" />
                  Timeline de Revisões
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : revisions.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma revisão encontrada. Crie uma nova revisão para começar.
                  </p>
                ) : (
                  <div className="relative">
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
                    <div className="space-y-6">
                      {revisions.map((rev) => (
                        <div key={rev.id} className="relative pl-10">
                          <div className="absolute left-2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
                          <div className="p-4 rounded-lg border bg-card">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">v{rev.revision_number}</Badge>
                                <span className="font-medium">{rev.revision_name || `Revisão ${rev.revision_number}`}</span>
                              </div>
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {format(new Date(rev.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                            {rev.reason && (
                              <p className="text-sm text-muted-foreground">{rev.reason}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* New Revision Dialog */}
        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
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
                  placeholder="Ex: Revisão Q2 2026"
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
              <Button onClick={handleCreateRevision} disabled={!revisionForm.name || createRevision.isPending}>
                Criar Revisão
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Duplicate Dialog */}
        <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Duplicar Orçamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Novo Orçamento</Label>
                <Input
                  value={duplicateForm.name}
                  onChange={(e) => setDuplicateForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Orçamento 2027 - Realista"
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
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="otimista">Otimista</SelectItem>
                    <SelectItem value="realista">Realista</SelectItem>
                    <SelectItem value="pessimista">Pessimista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Cancelar</Button>
              <Button onClick={handleDuplicate} disabled={!duplicateForm.name || duplicateBudget.isPending}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Compare Dialog */}
        <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Comparar Versões</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Versão Base</Label>
                  <Select 
                    value={compareVersions.v1.toString()} 
                    onValueChange={(v) => setCompareVersions(c => ({ ...c, v1: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {revisions.map(r => (
                        <SelectItem key={r.id} value={r.revision_number.toString()}>
                          v{r.revision_number} - {r.revision_name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Comparar com</Label>
                  <Select 
                    value={compareVersions.v2.toString()} 
                    onValueChange={(v) => setCompareVersions(c => ({ ...c, v2: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {revisions.map(r => (
                        <SelectItem key={r.id} value={r.revision_number.toString()}>
                          v{r.revision_number} - {r.revision_name || 'Sem nome'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {comparisonData && (
                <div className="border rounded-lg p-4 space-y-3">
                  <h4 className="font-medium">Resumo da Comparação</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Diferença Total</p>
                      <p className={`font-bold ${(comparisonData.summary?.totalDiff || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                        {formatCurrency(comparisonData.summary?.totalDiff || 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Linhas Alteradas</p>
                      <p className="font-bold">{comparisonData.summary?.changedCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">% de Mudança</p>
                      <p className="font-bold">{comparisonData.summary?.totalDiff ? ((comparisonData.summary.changedCount / (comparisonData.summary.changedCount + comparisonData.summary.unchangedCount)) * 100).toFixed(1) : '0.0'}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCompareDialog(false)}>Fechar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
