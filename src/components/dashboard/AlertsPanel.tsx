import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertaDashboard } from '@/types/dashboard';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  Bell,
  TrendingDown,
  Receipt,
  FileWarning,
  Shield,
} from 'lucide-react';

interface AlertsPanelProps {
  alerts: AlertaDashboard[];
  isLoading?: boolean;
  maxVisible?: number;
  className?: string;
}

const urgencyConfig = {
  alta: {
    icon: AlertTriangle,
    badge: 'destructive' as const,
    bgClass: 'bg-destructive/5 border-destructive/20',
    iconClass: 'text-destructive',
  },
  media: {
    icon: AlertCircle,
    badge: 'secondary' as const,
    bgClass: 'bg-warning/5 border-warning/20',
    iconClass: 'text-warning',
  },
  baixa: {
    icon: Info,
    badge: 'outline' as const,
    bgClass: 'bg-muted/50',
    iconClass: 'text-muted-foreground',
  },
};

const alertTypeIcons: Record<string, typeof AlertTriangle> = {
  contas_vencidas_tesouraria: Receipt,
  contas_receber_vencidas: TrendingDown,
  contas_pagar_vencidas: Receipt,
  orcamento_estourado: FileWarning,
  fluxo_negativo: TrendingDown,
  permissoes_pendentes: Shield,
};

function AlertItem({ alert }: { alert: AlertaDashboard }) {
  const navigate = useNavigate();
  const config = urgencyConfig[alert.urgencia];
  const Icon = alertTypeIcons[alert.tipo] || config.icon;

  const handleAction = () => {
    if (alert.actionCallback) {
      alert.actionCallback();
    } else if (alert.actionRoute) {
      navigate(alert.actionRoute);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        config.bgClass,
        alert.actionRoute && 'cursor-pointer hover:bg-accent/50'
      )}
      onClick={alert.actionRoute ? handleAction : undefined}
    >
      <div className={cn('mt-0.5 shrink-0', config.iconClass)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm truncate">{alert.titulo}</span>
          <Badge variant={config.badge} className="text-[10px] px-1.5 py-0 shrink-0">
            {alert.urgencia === 'alta' ? 'Urgente' : alert.urgencia === 'media' ? 'Atenção' : 'Info'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{alert.mensagem}</p>
        {alert.valor !== undefined && (
          <p className="text-xs font-medium mt-1">
            {formatCurrency(Math.abs(alert.valor))}
          </p>
        )}
      </div>
      {alert.actionLabel && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 h-7 px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            handleAction();
          }}
        >
          {alert.actionLabel}
          <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      )}
    </div>
  );
}

function AlertSkeleton() {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      <Skeleton className="h-4 w-4 rounded shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-14" />
        </div>
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  );
}

export function AlertsPanel({ 
  alerts, 
  isLoading = false, 
  maxVisible = 5,
  className 
}: AlertsPanelProps) {
  const navigate = useNavigate();
  const visibleAlerts = alerts.slice(0, maxVisible);
  const hasMore = alerts.length > maxVisible;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Alertas</CardTitle>
          {alerts.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {alerts.length}
            </Badge>
          )}
        </div>
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => navigate('/autopilot/inbox')}
          >
            Ver todos
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <AlertSkeleton key={i} />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-success/10 p-3 mb-3">
              <Bell className="h-5 w-5 text-success" />
            </div>
            <p className="text-sm font-medium">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhum alerta pendente no momento
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[320px]">
            <div className="space-y-2 pr-2">
              {visibleAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
