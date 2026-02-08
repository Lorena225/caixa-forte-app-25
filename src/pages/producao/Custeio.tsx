import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  AlertTriangle,
  CheckCircle2,
  Factory
} from "lucide-react";
import { useProductionOrders } from "@/hooks/usePCP";

export default function Custeio() {
  const [period, setPeriod] = useState("month");
  const { data: orders = [], isLoading } = useProductionOrders();

  // Filter completed orders for variance analysis
  const completedOrders = orders.filter(o => o.status === 'completed');

  // Calculate totals
  const totalStandardCost = completedOrders.reduce((acc, o) => 
    acc + (o.standard_material_cost || 0) + (o.standard_labor_cost || 0) + ((o as any).standard_overhead_cost || 0), 0
  );
  const totalActualCost = completedOrders.reduce((acc, o) => 
    acc + (o.actual_material_cost || 0) + (o.actual_labor_cost || 0) + ((o as any).actual_overhead_cost || 0), 0
  );
  const totalVariance = totalActualCost - totalStandardCost;
  const variancePercent = totalStandardCost > 0 ? (totalVariance / totalStandardCost) * 100 : 0;

  const stats = [
    {
      title: "Custo Padrão Total",
      value: `R$ ${totalStandardCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Custo Real Total",
      value: `R$ ${totalActualCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Variação Total",
      value: `R$ ${Math.abs(totalVariance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      subtitle: `${variancePercent >= 0 ? '+' : ''}${variancePercent.toFixed(1)}%`,
      icon: totalVariance >= 0 ? TrendingUp : TrendingDown,
      color: totalVariance >= 0 ? "text-red-600" : "text-green-600",
      bgColor: totalVariance >= 0 ? "bg-red-500/10" : "bg-green-500/10"
    },
  ];

  const getVarianceBadge = (variance: number) => {
    if (variance > 0) {
      return <Badge variant="destructive" className="gap-1"><TrendingUp className="h-3 w-3" /> Desfavorável</Badge>;
    } else if (variance < 0) {
      return <Badge className="gap-1 bg-green-500/10 text-green-600"><TrendingDown className="h-3 w-3" /> Favorável</Badge>;
    }
    return <Badge variant="outline"><CheckCircle2 className="h-3 w-3" /> Zero</Badge>;
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="Custeio Industrial"
            description="Análise de variações e custos de produção"
          />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    {stat.subtitle && (
                      <p className={`text-sm font-medium ${stat.color}`}>{stat.subtitle}</p>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Variance Analysis by Order */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Análise de Variações por OP
            </CardTitle>
            <CardDescription>
              Comparação entre custos padrão e reais por ordem de produção
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Custo Padrão</TableHead>
                  <TableHead className="text-right">Custo Real</TableHead>
                  <TableHead className="text-right">Variação</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : completedOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <Factory className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma ordem concluída para análise.</p>
                      <p className="text-sm">Complete ordens de produção para ver as variações de custo.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  completedOrders.map(order => {
                    const standardTotal = (order.standard_material_cost || 0) + 
                                         (order.standard_labor_cost || 0) + 
                                         ((order as any).standard_overhead_cost || 0);
                    const actualTotal = (order.actual_material_cost || 0) + 
                                       (order.actual_labor_cost || 0) + 
                                       ((order as any).actual_overhead_cost || 0);
                    const variance = actualTotal - standardTotal;

                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono">{order.order_number}</TableCell>
                        <TableCell className="font-medium">{order.products?.name}</TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {standardTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          R$ {actualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${variance > 0 ? 'text-red-600' : variance < 0 ? 'text-green-600' : ''}`}>
                          {variance >= 0 ? '+' : ''}R$ {variance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getVarianceBadge(variance)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Variance Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Variação de Material</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Padrão</span>
                  <span className="font-mono">
                    R$ {completedOrders.reduce((acc, o) => acc + (o.standard_material_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Real</span>
                  <span className="font-mono">
                    R$ {completedOrders.reduce((acc, o) => acc + (o.actual_material_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Variação de Mão de Obra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Padrão</span>
                  <span className="font-mono">
                    R$ {completedOrders.reduce((acc, o) => acc + (o.standard_labor_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Real</span>
                  <span className="font-mono">
                    R$ {completedOrders.reduce((acc, o) => acc + (o.actual_labor_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Variação de GGF</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Padrão</span>
                  <span className="font-mono">
                    R$ {completedOrders.reduce((acc, o) => acc + ((o as any).standard_overhead_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Real</span>
                  <span className="font-mono">
                    R$ {completedOrders.reduce((acc, o) => acc + ((o as any).actual_overhead_cost || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
