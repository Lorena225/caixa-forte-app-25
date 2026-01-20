import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { 
  Calculator, Save, Trash2, TrendingUp, TrendingDown, 
  Sparkles, Plus, RotateCcw
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useBudgetSimulations, useCreateSimulation, useDeleteSimulation, BudgetSimulation } from '@/hooks/useBudgetModule';

interface WhatIfSimulationProps {
  budgetId: string;
  baseRevenue: number;
  baseExpense: number;
}

export function WhatIfSimulation({ budgetId, baseRevenue, baseExpense }: WhatIfSimulationProps) {
  const [revenueAdjustment, setRevenueAdjustment] = useState(0);
  const [expenseAdjustment, setExpenseAdjustment] = useState(0);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [simulationName, setSimulationName] = useState('');

  const { data: savedSimulations = [] } = useBudgetSimulations(budgetId);
  const createSimulation = useCreateSimulation();
  const deleteSimulation = useDeleteSimulation();

  // Calculate adjusted values
  const adjustedRevenue = baseRevenue * (1 + revenueAdjustment / 100);
  const adjustedExpense = baseExpense * (1 + expenseAdjustment / 100);
  const baseProfit = baseRevenue - baseExpense;
  const adjustedProfit = adjustedRevenue - adjustedExpense;
  const profitChange = adjustedProfit - baseProfit;
  const profitChangePercent = baseProfit !== 0 ? (profitChange / baseProfit) * 100 : 0;

  const handleSave = () => {
    if (!simulationName) return;
    createSimulation.mutate({
      budgetId,
      name: simulationName,
      parameters: {
        revenue_adjustment_pct: revenueAdjustment,
        expense_adjustment_pct: expenseAdjustment,
      },
    }, {
      onSuccess: () => {
        setShowSaveDialog(false);
        setSimulationName('');
      },
    });
  };

  const handleReset = () => {
    setRevenueAdjustment(0);
    setExpenseAdjustment(0);
  };

  const loadSimulation = (sim: BudgetSimulation) => {
    setRevenueAdjustment(sim.parameters.revenue_adjustment_pct || 0);
    setExpenseAdjustment(sim.parameters.expense_adjustment_pct || 0);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulação "What-If"
          </CardTitle>
          <CardDescription>
            Ajuste parâmetros para ver o impacto no resultado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sliders */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  Ajuste de Receita
                </Label>
                <Badge variant={revenueAdjustment >= 0 ? 'default' : 'destructive'}>
                  {revenueAdjustment >= 0 ? '+' : ''}{revenueAdjustment}%
                </Badge>
              </div>
              <Slider
                value={[revenueAdjustment]}
                onValueChange={([v]) => setRevenueAdjustment(v)}
                min={-50}
                max={50}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  Ajuste de Despesa
                </Label>
                <Badge variant={expenseAdjustment <= 0 ? 'default' : 'destructive'}>
                  {expenseAdjustment >= 0 ? '+' : ''}{expenseAdjustment}%
                </Badge>
              </div>
              <Slider
                value={[expenseAdjustment]}
                onValueChange={([v]) => setExpenseAdjustment(v)}
                min={-50}
                max={50}
                step={1}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-50%</span>
                <span>0%</span>
                <span>+50%</span>
              </div>
            </div>
          </div>

          {/* Results Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Métrica</TableHead>
                <TableHead className="text-right">Original</TableHead>
                <TableHead className="text-right">Simulado</TableHead>
                <TableHead className="text-right">Impacto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">Receita Total</TableCell>
                <TableCell className="text-right">{formatCurrency(baseRevenue)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(adjustedRevenue)}</TableCell>
                <TableCell className={`text-right ${adjustedRevenue >= baseRevenue ? 'text-success' : 'text-destructive'}`}>
                  {revenueAdjustment >= 0 ? '+' : ''}{revenueAdjustment}%
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">Despesa Total</TableCell>
                <TableCell className="text-right">{formatCurrency(baseExpense)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(adjustedExpense)}</TableCell>
                <TableCell className={`text-right ${adjustedExpense <= baseExpense ? 'text-success' : 'text-destructive'}`}>
                  {expenseAdjustment >= 0 ? '+' : ''}{expenseAdjustment}%
                </TableCell>
              </TableRow>
              <TableRow className="bg-muted/50">
                <TableCell className="font-bold">Lucro Projetado</TableCell>
                <TableCell className="text-right">{formatCurrency(baseProfit)}</TableCell>
                <TableCell className={`text-right font-bold ${adjustedProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(adjustedProfit)}
                </TableCell>
                <TableCell className={`text-right font-bold ${profitChange >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {profitChange >= 0 ? '+' : ''}{profitChangePercent.toFixed(1)}%
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Resetar
            </Button>
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Simulação
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Salvar Simulação</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Nome da Simulação</Label>
                    <Input
                      value={simulationName}
                      onChange={(e) => setSimulationName(e.target.value)}
                      placeholder="Ex: Cenário Otimista Q4"
                    />
                  </div>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <p className="text-sm"><strong>Receita:</strong> {revenueAdjustment >= 0 ? '+' : ''}{revenueAdjustment}%</p>
                    <p className="text-sm"><strong>Despesa:</strong> {expenseAdjustment >= 0 ? '+' : ''}{expenseAdjustment}%</p>
                    <p className="text-sm"><strong>Lucro Projetado:</strong> {formatCurrency(adjustedProfit)}</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={!simulationName || createSimulation.isPending}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Saved Simulations */}
      {savedSimulations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Simulações Salvas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead className="text-right">Receita Ajust.</TableHead>
                  <TableHead className="text-right">Despesa Ajust.</TableHead>
                  <TableHead className="text-right">Lucro Simulado</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedSimulations.map((sim) => (
                  <TableRow key={sim.id}>
                    <TableCell className="font-medium">{sim.name}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(sim.parameters.revenue_adjustment_pct || 0) >= 0 ? 'default' : 'destructive'}>
                        {(sim.parameters.revenue_adjustment_pct || 0) >= 0 ? '+' : ''}{sim.parameters.revenue_adjustment_pct || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant={(sim.parameters.expense_adjustment_pct || 0) <= 0 ? 'default' : 'destructive'}>
                        {(sim.parameters.expense_adjustment_pct || 0) >= 0 ? '+' : ''}{sim.parameters.expense_adjustment_pct || 0}%
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${(sim.results.adjusted_profit || 0) >= 0 ? 'text-success' : 'text-destructive'}`}>
                      {formatCurrency(sim.results.adjusted_profit || 0)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(sim.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => loadSimulation(sim)}>
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => deleteSimulation.mutate(sim.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
