import { memo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { WidgetMenu } from './WidgetMenu';
import { OpenBankingSecurityBadge } from '@/components/openbanking';
import { useOpenBankingBalance } from '@/hooks/useOpenBankingData';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  TrendingUp,
  RefreshCw,
  Wallet,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetOpenBankingBalanceProps {
  onRemove?: () => void;
  className?: string;
}

export const WidgetOpenBankingBalance = memo(function WidgetOpenBankingBalance({
  onRemove,
  className,
}: WidgetOpenBankingBalanceProps) {
  const navigate = useNavigate();
  const { data, isLoading, refetch, isRefetching } = useOpenBankingBalance();

  if (isLoading) {
    return (
      <Card className={cn('relative overflow-hidden', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-5 rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasConnections = data && data.connections_count > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        'relative overflow-hidden group',
        'bg-gradient-to-br from-card via-card to-primary/5',
        'border-l-4 border-l-primary',
        className
      )}>
        {/* Decorative element */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />

        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4 text-primary" />
              Saldo Open Banking
              {isRefetching && (
                <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </CardTitle>
            <WidgetMenu
              onRefresh={() => refetch()}
              onViewDetails={() => navigate('/openfinance/conexoes')}
              onRemove={onRemove}
              detailsLabel="Ver Conexões"
            />
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {hasConnections ? (
            <>
              {/* Main Balance */}
              <div>
                <p className="text-xs text-muted-foreground mb-1">Saldo Total em Contas</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary font-mono">
                    {formatCurrency(data.total_balance)}
                  </span>
                  <Badge variant="outline" className="text-success border-success/30 bg-success/10">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Atualizado
                  </Badge>
                </div>
                {data.available_balance !== data.total_balance && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Disponível: {formatCurrency(data.available_balance)}
                  </p>
                )}
              </div>

              {/* Accounts List */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Contas Conectadas ({data.connections_count})
                </p>
                <div className="space-y-1.5">
                  {data.accounts.slice(0, 3).map((account) => (
                    <div
                      key={account.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: account.bank_color }}
                        >
                          <Wallet className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm">{account.bank_name}</span>
                      </div>
                      <span className="font-medium font-mono text-sm">
                        {formatCurrency(account.balance)}
                      </span>
                    </div>
                  ))}
                  {data.accounts.length > 3 && (
                    <button
                      onClick={() => navigate('/openfinance/conexoes')}
                      className="text-xs text-primary hover:underline w-full text-center py-1"
                    >
                      +{data.accounts.length - 3} mais contas
                    </button>
                  )}
                </div>
              </div>

              {/* Last Sync */}
              {data.last_sync_at && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                  <span>
                    Última sincronização: {format(new Date(data.last_sync_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                  <button
                    onClick={() => refetch()}
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Atualizar
                  </button>
                </div>
              )}

              {/* Security Badge */}
              <OpenBankingSecurityBadge variant="inline" className="w-full justify-center" />
            </>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="p-3 rounded-full bg-muted mb-3">
                <Landmark className="h-8 w-8 text-muted-foreground" />
              </div>
              <h4 className="font-medium mb-1">Nenhum banco conectado</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Conecte suas contas via Open Banking para ver o saldo em tempo real
              </p>
              <button
                onClick={() => navigate('/openfinance/conexoes')}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                Conectar banco
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
});
