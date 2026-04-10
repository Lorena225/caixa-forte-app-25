import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Calculator, Target } from 'lucide-react';
import { WhatIfSimulation } from '@/components/budget/WhatIfSimulation';
import { useBudgetMasterAnalysis, BudgetMasterAnalysis } from '@/hooks/useBudgetModule';

const SCENARIO_LABELS: Record<string, string> = {
  original: 'Original',
  otimista: 'Otimista',
  realista: 'Realista',
  pessimista: 'Pessimista',
};

export default function SimulacoesOrcamento() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | undefined>();

  const { data: budgets = [], isLoading } = useBudgetMasterAnalysis(year);
  
  const selectedBudget = budgets.find(b => b.id === selectedBudgetId);
  const activeBudget = budgets.find(b => b.is_active);

  // Use selected or active budget
  const workingBudget = selectedBudget || activeBudget;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Simulações de Orçamento"
          description="Análise de cenários 'What-If' para planejamento financeiro"
        />

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ano</label>
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Orçamento Base</label>
            <Select value={selectedBudgetId || activeBudget?.id || ''} onValueChange={setSelectedBudgetId}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="Selecione um orçamento..." />
              </SelectTrigger>
              <SelectContent>
                {budgets.map(b => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name} (v{b.version}) - {SCENARIO_LABELS[b.scenario_type]} {b.is_active && '(Ativo)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            As simulações permitem testar diferentes cenários sem alterar o orçamento original. 
            Ajuste os parâmetros de receita e despesa para ver o impacto no resultado final.
          </AlertDescription>
        </Alert>

        {/* Budget Summary */}
        {workingBudget ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Orçamento Selecionado
                </CardTitle>
                <CardDescription>
                  {workingBudget.name} - {SCENARIO_LABELS[workingBudget.scenario_type]} (Versão {workingBudget.version})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Receita Planejada</p>
                    <p className="text-2xl font-bold text-success">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(workingBudget.total_revenue_planned)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Despesa Planejada</p>
                    <p className="text-2xl font-bold text-destructive">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(workingBudget.total_expense_planned)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Lucro Planejado</p>
                    <p className={`text-2xl font-bold ${workingBudget.total_profit_planned >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(workingBudget.total_profit_planned)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <WhatIfSimulation
              budgetId={workingBudget.id}
              baseRevenue={workingBudget.total_revenue_planned}
              baseExpense={workingBudget.total_expense_planned}
            />
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {isLoading ? 'Carregando orçamentos...' : 'Selecione ou crie um orçamento para iniciar as simulações'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
