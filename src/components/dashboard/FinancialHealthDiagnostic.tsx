import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  Wallet,
  Calendar,
  PiggyBank,
  Target,
  Sparkles,
  ThermometerSun,
  Shield,
  Clock
} from 'lucide-react';
import { format, addDays, differenceInDays, endOfMonth, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HealthMetrics {
  totalReceitas: number;
  totalDespesas: number;
  saldoAtual: number;
  despesasFixas: number;
  diasRestantesMes: number;
  mediaGastosDiarios: number;
  contasAVencer3Dias: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate: Date;
  }>;
}

interface FinancialHealthDiagnosticProps {
  metrics: HealthMetrics | null;
  isLoading?: boolean;
  className?: string;
}

type HealthStatus = 'excellent' | 'good' | 'attention' | 'risk';

const statusConfig: Record<HealthStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Activity;
  description: string;
}> = {
  excellent: {
    label: 'Saúde Excelente',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/20',
    icon: CheckCircle2,
    description: 'Suas finanças estão em ótimo estado!',
  },
  good: {
    label: 'Saúde Boa',
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
    icon: TrendingUp,
    description: 'Continue assim para manter o equilíbrio.',
  },
  attention: {
    label: 'Atenção',
    color: 'text-amber-600',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    icon: AlertTriangle,
    description: 'Alguns indicadores precisam de atenção.',
  },
  risk: {
    label: 'Risco Financeiro',
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    icon: TrendingDown,
    description: 'Ação imediata recomendada.',
  },
};

function calculateHealthStatus(metrics: HealthMetrics): HealthStatus {
  const { totalReceitas, totalDespesas, despesasFixas } = metrics;
  
  if (totalReceitas === 0) return 'attention';
  
  const taxaPoupanca = ((totalReceitas - totalDespesas) / totalReceitas) * 100;
  const percentualFixos = (despesasFixas / totalReceitas) * 100;
  
  // Score-based calculation
  let score = 100;
  
  // Penalize based on savings rate
  if (taxaPoupanca < 0) score -= 40;
  else if (taxaPoupanca < 10) score -= 20;
  else if (taxaPoupanca < 20) score -= 10;
  
  // Penalize high fixed costs
  if (percentualFixos > 70) score -= 30;
  else if (percentualFixos > 50) score -= 15;
  
  // Determine status
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'attention';
  return 'risk';
}

function generateSmartSuggestion(metrics: HealthMetrics): string {
  const { totalReceitas, totalDespesas, despesasFixas, saldoAtual, diasRestantesMes, mediaGastosDiarios } = metrics;
  
  const taxaPoupanca = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
  const percentualFixos = totalReceitas > 0 ? (despesasFixas / totalReceitas) * 100 : 0;
  const projecaoFimMes = saldoAtual - (mediaGastosDiarios * diasRestantesMes);
  
  // Priority-based suggestions
  if (projecaoFimMes < 0) {
    const deficitDiario = Math.abs(projecaoFimMes) / diasRestantesMes;
    return `⚠️ Alerta: Você pode terminar o mês com saldo negativo. Reduza seus gastos diários em ${formatCurrency(deficitDiario)} para equilibrar as contas.`;
  }
  
  if (taxaPoupanca < 0) {
    return `🚨 Você está gastando mais do que ganha este mês. Revise suas despesas variáveis e identifique cortes possíveis.`;
  }
  
  if (percentualFixos > 50) {
    const excesso = despesasFixas - (totalReceitas * 0.5);
    return `💡 Seus custos fixos representam ${percentualFixos.toFixed(0)}% da renda. Considere renegociar contratos para economizar ${formatCurrency(excesso)}/mês.`;
  }
  
  if (taxaPoupanca < 20 && taxaPoupanca >= 0) {
    const metaPoupanca = totalReceitas * 0.2;
    const faltante = metaPoupanca - (totalReceitas - totalDespesas);
    return `📈 Você está poupando ${taxaPoupanca.toFixed(0)}% da renda. Para atingir a meta ideal de 20%, economize mais ${formatCurrency(faltante)} este mês.`;
  }
  
  if (taxaPoupanca >= 20) {
    return `🎉 Excelente! Você está poupando ${taxaPoupanca.toFixed(0)}% da sua renda. Continue assim e considere investir o excedente.`;
  }
  
  return `✨ Monitore seus gastos diários para manter a saúde financeira em dia.`;
}

// Gauge Component
function HealthGauge({ value, maxValue, label, status }: { 
  value: number; 
  maxValue: number; 
  label: string;
  status: 'good' | 'warning' | 'danger';
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const colorClasses = {
    good: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  };
  
  const progressClasses = {
    good: '[&>div]:bg-emerald-500',
    warning: '[&>div]:bg-amber-500',
    danger: '[&>div]:bg-red-500',
  };
  
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-sm font-semibold", colorClasses[status])}>
          {value.toFixed(0)}%
        </span>
      </div>
      <Progress 
        value={percentage} 
        className={cn("h-2", progressClasses[status])} 
      />
    </div>
  );
}

export function FinancialHealthDiagnostic({ metrics, isLoading, className }: FinancialHealthDiagnosticProps) {
  const healthData = useMemo(() => {
    if (!metrics) return null;
    
    const { totalReceitas, totalDespesas, despesasFixas, saldoAtual, diasRestantesMes, mediaGastosDiarios } = metrics;
    
    const taxaPoupanca = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;
    const percentualFixos = totalReceitas > 0 ? (despesasFixas / totalReceitas) * 100 : 0;
    const projecaoFimMes = saldoAtual - (mediaGastosDiarios * diasRestantesMes);
    
    const status = calculateHealthStatus(metrics);
    const suggestion = generateSmartSuggestion(metrics);
    
    return {
      status,
      taxaPoupanca,
      percentualFixos,
      projecaoFimMes,
      suggestion,
      contasAVencer: metrics.contasAVencer3Dias,
    };
  }, [metrics]);
  
  if (isLoading) {
    return (
      <Card className={cn("border-2", className)}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!healthData || !metrics) {
    return null;
  }
  
  const config = statusConfig[healthData.status];
  const StatusIcon = config.icon;
  
  return (
    <Card className={cn(
      "border-2 transition-all duration-300",
      config.borderColor,
      config.bgColor,
      className
    )}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl",
              config.bgColor,
              "border",
              config.borderColor
            )}>
              <Sparkles className={cn("h-6 w-6", config.color)} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                Diagnóstico da IA
                <Badge variant="outline" className={cn(config.color, config.borderColor)}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </CardTitle>
              <CardDescription className={config.color}>
                {config.description}
              </CardDescription>
            </div>
          </div>
          
          {/* Health Thermometer */}
          <div className="hidden sm:flex items-center gap-2">
            <ThermometerSun className={cn("h-5 w-5", config.color)} />
            <div className="flex gap-1">
              {['risk', 'attention', 'good', 'excellent'].map((level, idx) => (
                <div
                  key={level}
                  className={cn(
                    "w-3 h-8 rounded-sm transition-all",
                    healthData.status === level || 
                    (['risk', 'attention', 'good', 'excellent'].indexOf(healthData.status) >= idx)
                      ? statusConfig[level as HealthStatus].bgColor.replace('/10', '/60')
                      : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Taxa de Poupança */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <PiggyBank className="h-4 w-4 text-primary" />
                </div>
                <Badge variant={healthData.taxaPoupanca >= 20 ? "default" : healthData.taxaPoupanca >= 0 ? "secondary" : "destructive"}>
                  {healthData.taxaPoupanca >= 0 ? '+' : ''}{healthData.taxaPoupanca.toFixed(1)}%
                </Badge>
              </div>
              <h4 className="font-medium text-sm">Taxa de Poupança</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {healthData.taxaPoupanca >= 20 
                  ? 'Acima da meta ideal' 
                  : healthData.taxaPoupanca >= 0 
                    ? 'Abaixo da meta de 20%' 
                    : 'Gastando mais que ganha'}
              </p>
              <HealthGauge 
                value={Math.max(0, healthData.taxaPoupanca)} 
                maxValue={30} 
                label="Meta: 20%"
                status={healthData.taxaPoupanca >= 20 ? 'good' : healthData.taxaPoupanca >= 10 ? 'warning' : 'danger'}
              />
            </CardContent>
          </Card>
          
          {/* Gastos Fixos */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Target className="h-4 w-4 text-amber-600" />
                </div>
                {healthData.percentualFixos > 50 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Alerta
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm">Custos Fixos</h4>
              <p className="text-xs text-muted-foreground mt-1">
                {healthData.percentualFixos.toFixed(0)}% da receita
              </p>
              <HealthGauge 
                value={healthData.percentualFixos} 
                maxValue={100} 
                label="Limite: 50%"
                status={healthData.percentualFixos <= 50 ? 'good' : healthData.percentualFixos <= 70 ? 'warning' : 'danger'}
              />
            </CardContent>
          </Card>
          
          {/* Projeção de Saldo */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Wallet className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <h4 className="font-medium text-sm">Projeção Fim do Mês</h4>
              <p className={cn(
                "text-lg font-bold mt-1",
                healthData.projecaoFimMes >= 0 ? "text-emerald-600" : "text-red-600"
              )}>
                {formatCurrency(healthData.projecaoFimMes)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Em {metrics.diasRestantesMes} dias restantes
              </p>
            </CardContent>
          </Card>
          
          {/* Contas a Vencer */}
          <Card className="bg-card/50 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock className="h-4 w-4 text-orange-600" />
                </div>
                {healthData.contasAVencer.length > 0 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-500/30">
                    {healthData.contasAVencer.length} pendente{healthData.contasAVencer.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <h4 className="font-medium text-sm">Vencimentos Próximos</h4>
              {healthData.contasAVencer.length > 0 ? (
                <div className="mt-2 space-y-1">
                  {healthData.contasAVencer.slice(0, 2).map((conta) => (
                    <div key={conta.id} className="flex items-center justify-between text-xs">
                      <span className="truncate max-w-[100px]">{conta.description}</span>
                      <span className="font-medium text-orange-600">
                        {formatCurrency(conta.amount)}
                      </span>
                    </div>
                  ))}
                  {healthData.contasAVencer.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{healthData.contasAVencer.length - 2} mais...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Sem vencimentos em 3 dias
                </p>
              )}
            </CardContent>
          </Card>
        </div>
        
        {/* Smart Suggestion */}
        <div className={cn(
          "flex items-start gap-3 p-4 rounded-xl",
          "bg-gradient-to-r from-primary/5 to-primary/10",
          "border border-primary/20"
        )}>
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Lightbulb className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-medium text-sm flex items-center gap-2">
              Sugestão Inteligente
              <Sparkles className="h-3 w-3 text-primary" />
            </h4>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {healthData.suggestion}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
