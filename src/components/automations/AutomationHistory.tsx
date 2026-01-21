import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AutomationLog, TRIGGER_LABELS } from '@/types/automations';

interface AutomationHistoryProps {
  logs: AutomationLog[];
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onRetry?: (logId: string) => void;
}

export function AutomationHistory({
  logs,
  isLoading,
  hasMore,
  onLoadMore,
  onRetry,
}: AutomationHistoryProps) {
  const getStatusIcon = (status: AutomationLog['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: AutomationLog['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-600 hover:bg-green-700">Sucesso</Badge>;
      case 'partial':
        return <Badge variant="outline" className="border-amber-500 text-amber-600">Parcial</Badge>;
      case 'failed':
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">Executando</Badge>;
    }
  };

  if (isLoading && logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Execução</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Execução</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma execução registrada ainda.</p>
            <p className="text-sm">O histórico aparecerá aqui quando a automação for executada.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Histórico de Execução</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-3">
            {logs.map((log) => {
              const successCount = log.actions_executed.filter(a => a.result === 'success').length;
              const totalCount = log.actions_executed.length;
              const triggerLabel = TRIGGER_LABELS[log.trigger_type as keyof typeof TRIGGER_LABELS] || log.trigger_type;

              return (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="p-2 bg-muted rounded-full">
                    {getStatusIcon(log.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusBadge(log.status)}
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(log.triggered_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Acionada por: </span>
                      {triggerLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Ações executadas: {successCount}/{totalCount} sucesso
                    </p>
                    {log.error && (
                      <p className="text-sm text-destructive mt-1">
                        Erro: {log.error}
                      </p>
                    )}
                  </div>
                  {log.status === 'failed' && onRetry && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => onRetry(log.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {hasMore && (
          <Button 
            variant="outline" 
            className="w-full mt-4"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            <ChevronDown className="h-4 w-4 mr-2" />
            Carregar mais
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
