import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, TrendingUp, TrendingDown, FileText, AlertTriangle, Users, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { ContractStats } from "@/hooks/useContracts";

interface ContractsKPIsProps {
  stats?: ContractStats;
  isLoading: boolean;
}

export function ContractsKPIs({ stats, isLoading }: ContractsKPIsProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* MRR - Receita Recorrente Mensal */}
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Monthly Recurring Revenue</strong></p>
                  <p className="text-xs mt-1">
                    Receita Recorrente Mensal: soma dos valores mensais de todos os contratos ativos.
                    É a métrica mais importante para negócios de assinatura.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats?.mrr || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ARR: {formatCurrency(stats?.arr || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Contratos Ativos */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.ativos || 0}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs">
                {stats?.total || 0} total
              </Badge>
              {(stats?.suspensos || 0) > 0 && (
                <Badge variant="outline" className="text-xs text-amber-600">
                  {stats?.suspensos} suspensos
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p><strong>Taxa de Cancelamento</strong></p>
                  <p className="text-xs mt-1">
                    Percentual de contratos cancelados nos últimos 30 dias em relação ao total.
                    Quanto menor, melhor a retenção de clientes.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            {(stats?.churnRate || 0) > 5 ? (
              <TrendingDown className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.churnRate || 0) > 5 ? 'text-red-600' : 'text-green-600'}`}>
              {stats?.churnRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.cancelados || 0} cancelado(s) no mês
            </p>
          </CardContent>
        </Card>

        {/* Contratos a Vencer */}
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium">A Vencer</CardTitle>
              <Tooltip>
                <TooltipTrigger>
                  <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Contratos que vencem nos próximos 30 dias</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats?.vencendo || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Necessitam atenção
            </p>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
