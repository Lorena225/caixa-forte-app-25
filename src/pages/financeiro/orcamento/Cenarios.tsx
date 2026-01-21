import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, TrendingDown, Target, Plus, BarChart3, 
  Sparkles, ArrowRight 
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { ScenarioBuilder } from '@/components/budget/ScenarioBuilder';
import { ScenarioComparison } from '@/components/budget/ScenarioComparison';
import { useBudgetScenarios, useApplyScenarioToBudget } from '@/hooks/useBudgetAdvanced';
import { useBudgetMasters } from '@/hooks/useBudgetModule';
import { toast } from 'sonner';

const SCENARIO_CONFIG = {
  pessimista: { label: 'Pessimista', color: 'destructive' as const, icon: TrendingDown },
  realista: { label: 'Realista', color: 'secondary' as const, icon: Target },
  otimista: { label: 'Otimista', color: 'default' as const, icon: TrendingUp },
  custom: { label: 'Personalizado', color: 'outline' as const, icon: Sparkles },
};

export default function CenariosPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>();
  const [showBuilder, setShowBuilder] = useState(false);

  const { data: budgets = [] } = useBudgetMasters(selectedYear);
  const { data: scenarios = [], isLoading } = useBudgetScenarios(selectedBudgetId);
  const applyScenario = useApplyScenarioToBudget();

  const handleApplyScenario = (scenarioId: string) => {
    if (!selectedBudgetId) return;
    applyScenario.mutate({ budgetId: selectedBudgetId, scenarioId }, {
      onSuccess: () => toast.success('Cenário aplicado com sucesso'),
    });
  };

  // Base budget values for comparison
  const baseBudget = { revenue: 1000000, expense: 800000 };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cenários Orçamentários"
          description="Compare cenários pessimista, realista e otimista"
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

          {selectedBudgetId && (
            <Button onClick={() => setShowBuilder(!showBuilder)}>
              <Plus className="h-4 w-4 mr-2" />
              {showBuilder ? 'Fechar Builder' : 'Novo Cenário'}
            </Button>
          )}
        </div>

        {showBuilder && selectedBudgetId && (
          <ScenarioBuilder 
            budgetId={selectedBudgetId} 
            onScenarioCreated={() => setShowBuilder(false)} 
          />
        )}

        <Tabs defaultValue="comparison" className="space-y-4">
          <TabsList>
            <TabsTrigger value="comparison">Comparação</TabsTrigger>
            <TabsTrigger value="list">Lista de Cenários</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison">
            {scenarios.length > 0 ? (
              <ScenarioComparison scenarios={scenarios} baseBudget={baseBudget} />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  {selectedBudgetId 
                    ? 'Nenhum cenário configurado. Crie um novo cenário para visualizar a comparação.'
                    : 'Selecione um orçamento para visualizar a comparação de cenários'}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Cenários Configurados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : scenarios.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhum cenário configurado. Crie um novo cenário para começar.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Probabilidade</TableHead>
                        <TableHead>Regras</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scenarios.map(scenario => {
                        const config = SCENARIO_CONFIG[scenario.scenario_type as keyof typeof SCENARIO_CONFIG] || SCENARIO_CONFIG.custom;
                        const Icon = config.icon;
                        return (
                          <TableRow key={scenario.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {scenario.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={config.color}>
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {((scenario.probability || 0) * 100).toFixed(0)}%
                            </TableCell>
                            <TableCell>
                              {scenario.adjustment_rules?.length || 0} regras
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleApplyScenario(scenario.id)}
                                disabled={applyScenario.isPending}
                              >
                                <ArrowRight className="h-4 w-4 mr-1" />
                                Aplicar
                              </Button>
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
        </Tabs>
      </div>
    </MainLayout>
  );
}
