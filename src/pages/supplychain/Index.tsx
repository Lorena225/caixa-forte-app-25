import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Package,
  AlertTriangle,
  ShoppingCart,
  Truck,
  BarChart3,
  RefreshCw,
  Calendar,
  DollarSign,
  Clock,
  Target,
} from 'lucide-react';

// Mock data for ABC Analysis
const abcData = [
  { sku: 'PRD-001', name: 'Produto Premium A', class: 'A', revenue: 150000, percentage: 35, cumulative: 35 },
  { sku: 'PRD-002', name: 'Produto Standard B', class: 'A', revenue: 120000, percentage: 28, cumulative: 63 },
  { sku: 'PRD-003', name: 'Componente C1', class: 'B', revenue: 45000, percentage: 10, cumulative: 73 },
  { sku: 'PRD-004', name: 'Acessório D', class: 'B', revenue: 38000, percentage: 9, cumulative: 82 },
  { sku: 'PRD-005', name: 'Item E', class: 'B', revenue: 30000, percentage: 7, cumulative: 89 },
  { sku: 'PRD-006', name: 'Material F', class: 'C', revenue: 20000, percentage: 5, cumulative: 94 },
  { sku: 'PRD-007', name: 'Consumível G', class: 'C', revenue: 15000, percentage: 3, cumulative: 97 },
  { sku: 'PRD-008', name: 'Diversos H', class: 'C', revenue: 12000, percentage: 3, cumulative: 100 },
];

// Mock MRP suggestions
const mrpSuggestions = [
  { id: 1, product: 'Produto Premium A', currentStock: 45, minStock: 100, suggested: 200, leadTime: 7, supplier: 'Fornecedor Alpha', urgency: 'high' },
  { id: 2, product: 'Componente C1', currentStock: 80, minStock: 50, suggested: 100, leadTime: 14, supplier: 'Fornecedor Beta', urgency: 'medium' },
  { id: 3, product: 'Material F', currentStock: 200, minStock: 150, suggested: 0, leadTime: 21, supplier: 'Fornecedor Gamma', urgency: 'low' },
];

// Mock demand forecast
const demandForecast = [
  { month: 'Jan', actual: 1200, forecast: 1150, variance: 4.3 },
  { month: 'Fev', actual: 1350, forecast: 1300, variance: 3.8 },
  { month: 'Mar', actual: 1500, forecast: 1450, variance: 3.4 },
  { month: 'Abr', actual: null, forecast: 1600, variance: null },
  { month: 'Mai', actual: null, forecast: 1700, variance: null },
  { month: 'Jun', actual: null, forecast: 1800, variance: null },
];

const ABC_COLORS = {
  A: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  B: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  C: 'bg-slate-100 text-slate-700 dark:bg-slate-950 dark:text-slate-300',
};

const URGENCY_CONFIG = {
  high: { label: 'Urgente', color: 'bg-destructive text-destructive-foreground' },
  medium: { label: 'Moderado', color: 'bg-amber-500 text-white' },
  low: { label: 'Normal', color: 'bg-muted text-muted-foreground' },
};

export default function SupplyChainIndex() {
  const [activeTab, setActiveTab] = useState('curva-abc');

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Supply Chain & MRP"
          description="Gestão de cadeia de suprimentos, curva ABC, previsão de demanda e planejamento de materiais"
          action={{
            label: 'Atualizar Análise',
            onClick: () => {},
            icon: <RefreshCw className="h-4 w-4" />,
          }}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950">
                  <Package className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Itens Classe A</p>
                  <p className="text-2xl font-bold text-foreground">2</p>
                  <p className="text-xs text-muted-foreground">63% do valor</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Abaixo do Mínimo</p>
                  <p className="text-2xl font-bold text-foreground">3</p>
                  <p className="text-xs text-destructive">Requer ação</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-950">
                  <ShoppingCart className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pedidos Sugeridos</p>
                  <p className="text-2xl font-bold text-foreground">5</p>
                  <p className="text-xs text-muted-foreground">Automáticos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950">
                  <Target className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Precisão Forecast</p>
                  <p className="text-2xl font-bold text-foreground">96.2%</p>
                  <p className="text-xs text-emerald-600">+2.1% vs mês anterior</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="curva-abc">Curva ABC</TabsTrigger>
            <TabsTrigger value="mrp">MRP / Sugestões</TabsTrigger>
            <TabsTrigger value="previsao">Previsão de Demanda</TabsTrigger>
            <TabsTrigger value="fornecedores">Fornecedores Críticos</TabsTrigger>
          </TabsList>

          {/* Curva ABC */}
          <TabsContent value="curva-abc" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Classificação ABC de Produtos
                </CardTitle>
                <CardDescription>
                  Análise de Pareto para priorização de estoque e compras
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">SKU</th>
                        <th className="pb-3 font-medium">Produto</th>
                        <th className="pb-3 font-medium">Classe</th>
                        <th className="pb-3 font-medium text-right">Receita (R$)</th>
                        <th className="pb-3 font-medium text-right">% Total</th>
                        <th className="pb-3 font-medium">% Acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {abcData.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-3 font-mono text-xs">{item.sku}</td>
                          <td className="py-3 font-medium text-foreground">{item.name}</td>
                          <td className="py-3">
                            <Badge className={ABC_COLORS[item.class as keyof typeof ABC_COLORS]}>
                              Classe {item.class}
                            </Badge>
                          </td>
                          <td className="py-3 text-right font-medium">
                            {item.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-3 text-right">{item.percentage}%</td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <Progress value={item.cumulative} className="w-20 h-2" />
                              <span className="text-xs text-muted-foreground">{item.cumulative}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MRP */}
          <TabsContent value="mrp" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Sugestões de Compra (MRP)
                </CardTitle>
                <CardDescription>
                  Planejamento de necessidades de materiais baseado em estoque mínimo e lead time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mrpSuggestions.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'p-4 rounded-lg border',
                        item.urgency === 'high' && 'border-destructive/50 bg-destructive/5',
                        item.urgency === 'medium' && 'border-amber-500/50 bg-amber-500/5',
                        item.urgency === 'low' && 'border-border'
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-foreground">{item.product}</h4>
                            <Badge className={URGENCY_CONFIG[item.urgency as keyof typeof URGENCY_CONFIG].color}>
                              {URGENCY_CONFIG[item.urgency as keyof typeof URGENCY_CONFIG].label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Fornecedor: {item.supplier} • Lead Time: {item.leadTime} dias
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Atual</p>
                              <p className={cn('font-bold', item.currentStock < item.minStock ? 'text-destructive' : 'text-foreground')}>
                                {item.currentStock}
                              </p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Mínimo</p>
                              <p className="font-bold text-foreground">{item.minStock}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Sugerido</p>
                              <p className="font-bold text-primary">{item.suggested}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {item.suggested > 0 && (
                        <div className="mt-3 flex gap-2">
                          <Button size="sm">Gerar Pedido de Compra</Button>
                          <Button size="sm" variant="outline">Ignorar</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Previsão de Demanda */}
          <TabsContent value="previsao" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Previsão de Demanda
                </CardTitle>
                <CardDescription>
                  Projeção baseada em histórico de vendas e sazonalidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-3 font-medium">Mês</th>
                        <th className="pb-3 font-medium text-right">Realizado</th>
                        <th className="pb-3 font-medium text-right">Previsto</th>
                        <th className="pb-3 font-medium text-right">Variância</th>
                        <th className="pb-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {demandForecast.map((item, idx) => (
                        <tr key={idx} className="border-b border-border/50">
                          <td className="py-3 font-medium text-foreground">{item.month}</td>
                          <td className="py-3 text-right">
                            {item.actual ? item.actual.toLocaleString() : '—'}
                          </td>
                          <td className="py-3 text-right font-medium text-primary">
                            {item.forecast.toLocaleString()}
                          </td>
                          <td className="py-3 text-right">
                            {item.variance !== null ? (
                              <span className={item.variance <= 5 ? 'text-emerald-600' : 'text-amber-600'}>
                                {item.variance}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-3">
                            {item.actual !== null ? (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                                Confirmado
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Projetado
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fornecedores Críticos */}
          <TabsContent value="fornecedores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Análise de Fornecedores Críticos
                </CardTitle>
                <CardDescription>
                  Identificação de dependências e riscos na cadeia de suprimentos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-foreground">Fornecedor Único Detectado</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          3 produtos dependem exclusivamente de <strong>Fornecedor Alpha</strong>. 
                          Recomenda-se diversificar a base de fornecedores.
                        </p>
                        <Button size="sm" variant="outline" className="mt-3">
                          Ver Produtos Afetados
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold text-foreground mb-3">Top 5 Fornecedores por Volume</h4>
                      <div className="space-y-3">
                        {['Fornecedor Alpha', 'Fornecedor Beta', 'Fornecedor Gamma', 'Fornecedor Delta', 'Fornecedor Epsilon'].map((name, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{name}</span>
                            <div className="flex items-center gap-2">
                              <Progress value={100 - idx * 15} className="w-24 h-2" />
                              <span className="text-sm font-medium">{100 - idx * 15}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border">
                      <h4 className="font-semibold text-foreground mb-3">Lead Time Médio por Fornecedor</h4>
                      <div className="space-y-3">
                        {[
                          { name: 'Fornecedor Alpha', days: 7 },
                          { name: 'Fornecedor Beta', days: 14 },
                          { name: 'Fornecedor Gamma', days: 21 },
                          { name: 'Fornecedor Delta', days: 10 },
                          { name: 'Fornecedor Epsilon', days: 5 },
                        ].map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">{item.name}</span>
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              {item.days} dias
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
