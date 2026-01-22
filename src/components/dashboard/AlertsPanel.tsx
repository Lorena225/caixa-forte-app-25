import { memo, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    badgeBg: 'bg-destructive/10',
    badgeColor: 'text-destructive',
  },
  media: {
    icon: AlertCircle,
    badgeBg: 'bg-warning/10',
    badgeColor: 'text-warning',
  },
  baixa: {
    icon: Info,
    badgeBg: 'bg-info/10',
    badgeColor: 'text-info',
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

const AlertItem = memo(forwardRef<HTMLDivElement, { alert: AlertaDashboard }>(
  function AlertItem({ alert }, ref) {
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
        ref={ref}
        className={cn(
          'flex items-start gap-3 py-2 border-b border-border/50 last:border-b-0',
          alert.actionRoute && 'cursor-pointer hover:bg-muted/50 rounded-lg px-2 -mx-2'
        )}
        onClick={alert.actionRoute ? handleAction : undefined}
      >
        {/* Badge Icon */}
        <div className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
          config.badgeBg
        )}>
          <Icon className={cn('h-3.5 w-3.5', config.badgeColor)} />
        </div>

        {/* Text Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-foreground leading-5">
            {alert.titulo}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {alert.mensagem ? alert.mensagem.slice(0, 50) : 'há 2 horas'}
          </p>
          {alert.valor !== undefined && (
            <p className="text-xs font-medium text-muted-foreground mt-0.5">
              {formatCurrency(Math.abs(alert.valor))}
            </p>
          )}
        </div>

        {/* Action Button */}
        {alert.actionLabel && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-6 px-2 text-xs text-muted-foreground hover:text-primary"
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
));

AlertItem.displayName = 'AlertItem';

function AlertSkeleton() {
  return (
    <div className="flex items-start gap-3 py-2">
      <Skeleton className="h-6 w-6 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export const AlertsPanel = memo(function AlertsPanel({ 
  alerts, 
  isLoading = false, 
  maxVisible = 5,
  className 
}: AlertsPanelProps) {
  const navigate = useNavigate();
  
  const visibleAlerts = useMemo(() => alerts.slice(0, maxVisible), [alerts, maxVisible]);
  const hasMore = alerts.length > maxVisible;

  return (
    <Card className={cn(
      'bg-white border border-border border-l-4 border-l-warning rounded-xl',
      'shadow-xs hover:shadow-md transition-shadow',
      'min-h-[240px]',
      className
    )}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4 mb-4 border-b border-border">
        <AlertTriangle className="h-5 w-5 text-warning" />
        <h3 className="text-base font-semibold text-foreground flex-1">
          Alertas e Avisos
        </h3>
        {alerts.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {alerts.length} alerta{alerts.length > 1 ? 's' : ''}
          </span>
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
            <p className="text-sm font-medium text-foreground">Tudo em dia!</p>
            <p className="text-xs text-muted-foreground mt-1">
              Nenhum alerta pendente
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[200px]">
            <div className="space-y-1">
              {visibleAlerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        )}

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-muted-foreground hover:text-primary"
            onClick={() => navigate('/autopilot/inbox')}
          >
            Ver todos os alertas
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
});

AlertsPanel.displayName = 'AlertsPanel';
