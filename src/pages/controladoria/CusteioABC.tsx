import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  Plus,
  Search,
  Settings,
  Activity,
  DollarSign,
  TrendingUp,
  PieChart,
  ArrowRight,
  Calculator,
  Target,
  BarChart3,
} from 'lucide-react';

// Mock data for ABC Costing
const activities = [
  { id: '1', code: 'ATI-001', name: 'Processamento de Pedidos', driver: 'Número de Pedidos', cost: 45000, volume: 1500, unitCost: 30 },
  { id: '2', code: 'ATI-002', name: 'Controle de Qualidade', driver: 'Horas de Inspeção', cost: 28000, volume: 560, unitCost: 50 },
  { id: '3', code: 'ATI-003', name: 'Expedição e Logística', driver: 'Peso Expedido (kg)', cost: 62000, volume: 31000, unitCost: 2 },
  { id: '4', code: 'ATI-004', name: 'Atendimento ao Cliente', driver: 'Chamados Atendidos', cost: 35000, volume: 2800, unitCost: 12.5 },
  { id: '5', code: 'ATI-005', name: 'Setup de Máquinas', driver: 'Número de Setups', cost: 22000, volume: 220, unitCost: 100 },
];

const costDrivers = [
  { id: '1', name: 'Número de Pedidos', type: 'transação', volume: 1500, trend: 'up' },
  { id: '2', name: 'Horas de Inspeção', type: 'duração', volume: 560, trend: 'stable' },
  { id: '3', name: 'Peso Expedido (kg)', type: 'intensidade', volume: 31000, trend: 'up' },
  { id: '4', name: 'Chamados Atendidos', type: 'transação', volume: 2800, trend: 'down' },
  { id: '5', name: 'Número de Setups', type: 'transação', volume: 220, trend: 'stable' },
];

const productCosts = [
  { product: 'Produto A', directCost: 45, indirectCost: 28, totalCost: 73, margin: 32 },
  { product: 'Produto B', directCost: 62, indirectCost: 41, totalCost: 103, margin: 18 },
  { product: 'Produto C', directCost: 38, indirectCost: 22, totalCost: 60, margin: 45 },
  { product: 'Produto D', directCost: 85, indirectCost: 55, totalCost: 140, margin: 12 },
];

function formatCurrency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function CusteioABC() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('atividades');

  const totalCosts = activities.reduce((sum, a) => sum + a.cost, 0);

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Custeio ABC"
          description="Custeio baseado em atividades - alocação precisa de custos indiretos"
          action={{
            label: 'Nova Atividade',
            onClick: () => {},
            icon: <Plus className="h-4 w-4" />,
          }}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Atividades</p>
                  <p className="text-2xl font-bold text-foreground">{activities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Total</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(totalCosts)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                  <Settings className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Direcionadores</p>
                  <p className="text-2xl font-bold text-foreground">{costDrivers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precisão</p>
                  <p className="text-2xl font-bold text-foreground">98.5%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="atividades">Atividades</TabsTrigger>
            <TabsTrigger value="direcionadores">Direcionadores</TabsTrigger>
            <TabsTrigger value="alocacao">Alocação por Produto</TabsTrigger>
            <TabsTrigger value="analise">Análise de Custos</TabsTrigger>
          </TabsList>

          {/* Atividades */}
          <TabsContent value="atividades" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Pool de Atividades</CardTitle>
                    <CardDescription>Atividades e seus custos acumulados</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar atividades..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Código</th>
                        <th className="pb-3 font-medium">Atividade</th>
                        <th className="pb-3 font-medium">Direcionador</th>
                        <th className="pb-3 font-medium text-right">Custo Total</th>
                        <th className="pb-3 font-medium text-right">Volume</th>
                        <th className="pb-3 font-medium text-right">Custo Unitário</th>
                        <th className="pb-3 font-medium">% do Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activities.map((activity) => {
                        const percentage = (activity.cost / totalCosts) * 100;
                        return (
                          <tr key={activity.id} className="border-b border-border/50">
                            <td className="py-3 font-mono text-xs">{activity.code}</td>
                            <td className="py-3 font-medium text-foreground">{activity.name}</td>
                            <td className="py-3 text-muted-foreground">{activity.driver}</td>
                            <td className="py-3 text-right font-medium">{formatCurrency(activity.cost)}</td>
                            <td className="py-3 text-right">{activity.volume.toLocaleString()}</td>
                            <td className="py-3 text-right font-medium text-primary">
                              {formatCurrency(activity.unitCost)}
                            </td>
                            <td className="py-3">
                              <div className="flex items-center gap-2">
                                <Progress value={percentage} className="w-16 h-2" />
                                <span className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Direcionadores */}
          <TabsContent value="direcionadores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Direcionadores de Custo
                </CardTitle>
                <CardDescription>Bases de alocação para distribuição de custos indiretos</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {costDrivers.map((driver) => (
                    <div key={driver.id} className="p-4 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">{driver.name}</h4>
                          <Badge variant="outline" className="mt-1">
                            {driver.type}
                          </Badge>
                        </div>
                        <div className={cn(
                          'p-1.5 rounded',
                          driver.trend === 'up' && 'bg-emerald-100 dark:bg-emerald-950',
                          driver.trend === 'down' && 'bg-red-100 dark:bg-red-950',
                          driver.trend === 'stable' && 'bg-muted'
                        )}>
                          <TrendingUp className={cn(
                            'h-4 w-4',
                            driver.trend === 'up' && 'text-emerald-600',
                            driver.trend === 'down' && 'text-red-600 rotate-180',
                            driver.trend === 'stable' && 'text-muted-foreground rotate-90'
                          )} />
                        </div>
                      </div>
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground">Volume do Período</p>
                        <p className="text-2xl font-bold text-foreground">{driver.volume.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Alocação por Produto */}
          <TabsContent value="alocacao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  Custos por Produto
                </CardTitle>
                <CardDescription>Alocação de custos diretos e indiretos por produto</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Produto</th>
                        <th className="pb-3 font-medium text-right">Custo Direto</th>
                        <th className="pb-3 font-medium text-center">
                          <ArrowRight className="h-4 w-4 inline" />
                        </th>
                        <th className="pb-3 font-medium text-right">Custo Indireto (ABC)</th>
                        <th className="pb-3 font-medium text-center">=</th>
                        <th className="pb-3 font-medium text-right">Custo Total</th>
                        <th className="pb-3 font-medium text-right">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productCosts.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-4 font-medium text-foreground">{item.product}</td>
                          <td className="py-4 text-right">{formatCurrency(item.directCost)}</td>
                          <td className="py-4 text-center text-muted-foreground">+</td>
                          <td className="py-4 text-right text-amber-600">{formatCurrency(item.indirectCost)}</td>
                          <td className="py-4 text-center text-muted-foreground">=</td>
                          <td className="py-4 text-right font-bold text-foreground">{formatCurrency(item.totalCost)}</td>
                          <td className="py-4 text-right">
                            <Badge className={cn(
                              item.margin >= 30 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              item.margin >= 15 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                              'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            )}>
                              {item.margin}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Análise */}
          <TabsContent value="analise" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    Ponto de Equilíbrio
                  </CardTitle>
                  <CardDescription>Break-even analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Custos Fixos</span>
                        <span className="font-medium">{formatCurrency(85000)}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Margem de Contribuição Média</span>
                        <span className="font-medium">35%</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-primary">Ponto de Equilíbrio</span>
                        <span className="text-xl font-bold text-primary">{formatCurrency(242857)}</span>
                      </div>
                    </div>
                    <Button className="w-full">
                      <Calculator className="h-4 w-4 mr-2" />
                      Recalcular
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Alavancagem Operacional
                  </CardTitle>
                  <CardDescription>Grau de alavancagem operacional (GAO)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Margem de Contribuição</span>
                        <span className="font-medium">{formatCurrency(120000)}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Lucro Operacional</span>
                        <span className="font-medium">{formatCurrency(35000)}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">GAO</span>
                        <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">3.43x</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Para cada 1% de aumento na receita, o lucro aumenta 3.43%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
