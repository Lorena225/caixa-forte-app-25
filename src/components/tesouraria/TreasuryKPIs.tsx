import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Wallet, TrendingUp, TrendingDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { useLiquidityDashboard } from '@/hooks/useLiquidityDashboard';

export function TreasuryKPIs() {
  const { data: liquidity, isLoading } = useLiquidityDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalBalance = liquidity?.total_balance || 0;
  const receivables = liquidity?.receivables_30d || 0;
  const payables = liquidity?.payables_30d || 0;
  const coverageDays = payables > 0 
    ? Math.floor((totalBalance / (payables / 30)))
    : 999;
  const isHealthy = coverageDays >= 30;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-l-4 border-l-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Saldo Total
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className={`text-2xl font-bold ${totalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalBalance)}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {isHealthy ? (
              <Badge variant="default" className="gap-1 bg-success text-xs">
                <CheckCircle className="h-3 w-3" />
                Saudável
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Atenção
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-l-4 border-l-success">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-success" />
            Entradas (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-success">
            {formatCurrency(receivables)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Títulos a receber</p>
        </CardContent>
      </Card>
      
      <Card className="border-l-4 border-l-destructive">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Saídas (30 dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-destructive">
            {formatCurrency(payables)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Obrigações a pagar</p>
        </CardContent>
      </Card>
    </div>
  );
}
