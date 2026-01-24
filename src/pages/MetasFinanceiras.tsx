import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { 
  Plus, Target, TrendingUp, Wallet, Trophy, Sparkles,
  PiggyBank, CheckCircle, AlertCircle, Loader2
} from 'lucide-react';
import { 
  useFinancialGoals, 
  useCreateGoal, 
  useUpdateGoal, 
  useDeleteGoal,
  useAddToGoal,
  FinancialGoal,
  CreateGoalInput
} from '@/hooks/useFinancialGoals';
import { useDashboardKPIs } from '@/hooks/useCompanyData';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalFormDialog } from '@/components/goals/GoalFormDialog';
import { AddMoneyDialog } from '@/components/goals/AddMoneyDialog';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export default function MetasFinanceiras() {
  const { data: goals = [], isLoading } = useFinancialGoals();
  const { data: kpis } = useDashboardKPIs();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const addToGoal = useAddToGoal();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null);
  const [addMoneyGoal, setAddMoneyGoal] = useState<FinancialGoal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<FinancialGoal | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  
  // Calculate summary metrics
  const summary = useMemo(() => {
    const activeGoals = goals.filter(g => g.status === 'active');
    const completedGoals = goals.filter(g => g.status === 'completed');
    
    const totalPlanned = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
    const totalSaved = activeGoals.reduce((sum, g) => sum + g.current_amount, 0);
    const overallProgress = totalPlanned > 0 ? (totalSaved / totalPlanned) * 100 : 0;
    
    return {
      activeCount: activeGoals.length,
      completedCount: completedGoals.length,
      totalPlanned,
      totalSaved,
      overallProgress,
    };
  }, [goals]);
  
  const filteredGoals = useMemo(() => {
    if (activeTab === 'active') return goals.filter(g => g.status === 'active');
    if (activeTab === 'completed') return goals.filter(g => g.status === 'completed');
    return goals;
  }, [goals, activeTab]);
  
  const handleCreateGoal = (data: CreateGoalInput) => {
    createGoal.mutate(data, {
      onSuccess: () => {
        setIsFormOpen(false);
        setEditingGoal(null);
      },
    });
  };
  
  const handleUpdateGoal = (data: CreateGoalInput) => {
    if (!editingGoal) return;
    updateGoal.mutate({ id: editingGoal.id, ...data }, {
      onSuccess: () => {
        setIsFormOpen(false);
        setEditingGoal(null);
      },
    });
  };
  
  const handleDeleteGoal = () => {
    if (!deletingGoal) return;
    deleteGoal.mutate(deletingGoal.id, {
      onSuccess: () => setDeletingGoal(null),
    });
  };
  
  const handleAddMoney = (amount: number) => {
    if (!addMoneyGoal) return;
    addToGoal.mutate({ id: addMoneyGoal.id, amount }, {
      onSuccess: () => setAddMoneyGoal(null),
    });
  };
  
  const openEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal);
    setIsFormOpen(true);
  };
  
  const availableBalance = kpis?.balance || 0;
  const balanceDiff = availableBalance - summary.totalPlanned;
  
  return (
    <MainLayout>
      <PageHeader
        title="Metas Financeiras"
        description="Planeje e acompanhe seus objetivos financeiros"
        actions={
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Meta
          </Button>
        }
      />
      
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Planned vs Available */}
        <Card className="col-span-1 md:col-span-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Total Planejado em Metas
                </p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(summary.totalPlanned)}
                </p>
              </div>
              <div className={cn(
                'p-3 rounded-xl',
                balanceDiff >= 0 
                  ? 'bg-emerald-100 dark:bg-emerald-900/50' 
                  : 'bg-amber-100 dark:bg-amber-900/50'
              )}>
                <Wallet className={cn(
                  'h-6 w-6',
                  balanceDiff >= 0 ? 'text-emerald-600' : 'text-amber-600'
                )} />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-400">
                  Saldo Disponível Atual
                </span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {formatCurrency(availableBalance)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                {balanceDiff >= 0 ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700 dark:text-emerald-400">
                      Cobertura de {((availableBalance / summary.totalPlanned) * 100 || 0).toFixed(0)}% das metas
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700 dark:text-amber-400">
                      Faltam {formatCurrency(Math.abs(balanceDiff))} para cobrir as metas
                    </span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Already Saved */}
        <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                  Já Poupado
                </p>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                  {formatCurrency(summary.totalSaved)}
                </p>
              </div>
              <PiggyBank className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                {summary.overallProgress.toFixed(0)}% do total
              </span>
            </div>
          </CardContent>
        </Card>
        
        {/* Goals Count */}
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  Metas Ativas
                </p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {summary.activeCount}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-purple-700 dark:text-purple-400">
                {summary.completedCount} meta{summary.completedCount !== 1 ? 's' : ''} concluída{summary.completedCount !== 1 ? 's' : ''}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* AI Insight */}
      {summary.activeCount > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-primary">Dica da IA</p>
              <p className="text-sm text-muted-foreground">
                Você tem {summary.activeCount} meta{summary.activeCount > 1 ? 's' : ''} ativa{summary.activeCount > 1 ? 's' : ''} 
                {' '}com um total de {formatCurrency(summary.totalPlanned - summary.totalSaved)} ainda a poupar. 
                {summary.overallProgress >= 50 
                  ? ' Ótimo progresso! Continue assim 🎯' 
                  : ' Mantenha o foco e economize regularmente para alcançar seus objetivos! 💪'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Goals List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="active" className="gap-2">
            <Target className="h-4 w-4" />
            Ativas
            <Badge variant="secondary" className="ml-1">
              {goals.filter(g => g.status === 'active').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <Trophy className="h-4 w-4" />
            Concluídas
            <Badge variant="secondary" className="ml-1">
              {goals.filter(g => g.status === 'completed').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="all">
            Todas
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab}>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredGoals.length === 0 ? (
            <Card className="py-12">
              <CardContent className="flex flex-col items-center justify-center text-center">
                <div className="p-4 rounded-full bg-muted mb-4">
                  <Target className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">
                  {activeTab === 'completed' 
                    ? 'Nenhuma meta concluída ainda' 
                    : 'Nenhuma meta criada'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'completed'
                    ? 'Continue economizando para alcançar suas metas!'
                    : 'Comece a planejar seu futuro financeiro criando uma meta.'}
                </p>
                {activeTab !== 'completed' && (
                  <Button onClick={() => setIsFormOpen(true)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Criar Primeira Meta
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGoals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEdit}
                  onDelete={setDeletingGoal}
                  onAddMoney={setAddMoneyGoal}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Dialogs */}
      <GoalFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) setEditingGoal(null);
        }}
        goal={editingGoal}
        onSubmit={editingGoal ? handleUpdateGoal : handleCreateGoal}
        isLoading={createGoal.isPending || updateGoal.isPending}
      />
      
      <AddMoneyDialog
        open={!!addMoneyGoal}
        onOpenChange={(open) => !open && setAddMoneyGoal(null)}
        goal={addMoneyGoal}
        onSubmit={handleAddMoney}
        isLoading={addToGoal.isPending}
      />
      
      <AlertDialog open={!!deletingGoal} onOpenChange={(open) => !open && setDeletingGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta "{deletingGoal?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteGoal.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
