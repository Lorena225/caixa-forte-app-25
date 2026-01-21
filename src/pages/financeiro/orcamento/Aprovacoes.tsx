import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  CheckCircle2, XCircle, Clock, Send, FileCheck, 
  AlertTriangle, Users 
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ApprovalWorkflow } from '@/components/budget/ApprovalWorkflow';
import { 
  usePendingApprovals, 
  useSubmitForApproval, 
  useApproveStep 
} from '@/hooks/useBudgetAdvanced';
import { useBudgetMasters } from '@/hooks/useBudgetModule';
import { toast } from 'sonner';

export default function AprovacoesPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>();
  const [tab, setTab] = useState<'pending' | 'history'>('pending');

  const { data: budgets = [] } = useBudgetMasters(selectedYear);
  const { data: pendingApprovals = [], isLoading } = usePendingApprovals();
  const submitForApproval = useSubmitForApproval();
  const approveStep = useApproveStep();

  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
  const canSubmit = selectedBudget && selectedBudget.status === 'rascunho';

  const handleSubmitForApproval = () => {
    if (!selectedBudgetId) return;
    submitForApproval.mutate({ budgetId: selectedBudgetId }, {
      onSuccess: () => toast.success('Orçamento enviado para aprovação'),
    });
  };

  const handleApprove = (item: typeof pendingApprovals[0]) => {
    if (!item.step_id || !item.request_id) return;
    approveStep.mutate({ 
      stepId: item.step_id, 
      requestId: item.request_id,
      approved: true 
    }, {
      onSuccess: () => toast.success('Etapa aprovada'),
    });
  };

  const handleReject = (item: typeof pendingApprovals[0]) => {
    if (!item.step_id || !item.request_id) return;
    approveStep.mutate({ 
      stepId: item.step_id, 
      requestId: item.request_id,
      approved: false, 
      comments: 'Necessita revisão' 
    }, {
      onSuccess: () => toast.success('Etapa rejeitada'),
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Aprovações de Orçamento"
          description="Gerencie o fluxo de aprovação dos orçamentos"
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
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canSubmit && (
            <Button onClick={handleSubmitForApproval} disabled={submitForApproval.isPending}>
              <Send className="h-4 w-4 mr-2" />
              Enviar para Aprovação
            </Button>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-warning">{pendingApprovals.length}</p>
                </div>
                <Clock className="h-8 w-8 text-warning" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Aprovados Hoje</p>
                  <p className="text-2xl font-bold text-success">0</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-success" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejeitados</p>
                  <p className="text-2xl font-bold text-destructive">0</p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total Pendente</p>
                  <p className="text-2xl font-bold">{formatCurrency(0)}</p>
                </div>
                <FileCheck className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="h-4 w-4 mr-2" />
              Pendentes
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileCheck className="h-4 w-4 mr-2" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Aprovações Pendentes
                </CardTitle>
                <CardDescription>
                  Orçamentos aguardando sua aprovação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : pendingApprovals.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-12 w-12 mx-auto text-success mb-4" />
                    <p className="text-lg font-medium">Tudo em dia!</p>
                    <p className="text-muted-foreground">
                      Não há orçamentos pendentes de aprovação.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Orçamento</TableHead>
                        <TableHead>Nível</TableHead>
                        <TableHead>Data Solicitação</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingApprovals.map((item, idx) => (
                        <TableRow key={`${item.request_id}-${idx}`}>
                          <TableCell className="font-medium">{item.budget_name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">Nível {item.current_level}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.requested_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </TableCell>
                          <TableCell>{formatCurrency(0)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleReject(item)}
                                disabled={approveStep.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Rejeitar
                              </Button>
                              <Button 
                                size="sm"
                                onClick={() => handleApprove(item)}
                                disabled={approveStep.isPending}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Aprovar
                              </Button>
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

          <TabsContent value="history">
            {selectedBudgetId && selectedBudget ? (
              <ApprovalWorkflow 
                budgetId={selectedBudgetId} 
                budgetName={selectedBudget.name}
                budgetStatus={selectedBudget.status}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Selecione um orçamento para visualizar o histórico de aprovações
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
