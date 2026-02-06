import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Building2, 
  PiggyBank,
  Landmark,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { useLiquidityDashboard } from '@/hooks/useLiquidityDashboard';
import { formatCurrency } from '@/lib/formatters';

export function LiquidityDashboard() {
  const { data: liquidity, isLoading } = useLiquidityDashboard();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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

  if (!liquidity) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Configure suas contas bancárias para visualizar a liquidez</p>
        </CardContent>
      </Card>
    );
  }

  const netPosition30d = liquidity.receivables_30d - liquidity.payables_30d;
  const coverageDays = liquidity.payables_30d > 0 
    ? Math.floor((liquidity.total_balance / (liquidity.payables_30d / 30)))
    : 999;
  const isHealthy = coverageDays >= 30;

  const balanceBreakdown = [
    { label: 'Conta Corrente', value: liquidity.checking_balance, icon: Building2, color: 'text-blue-500' },
    { label: 'Poupança', value: liquidity.savings_balance, icon: PiggyBank, color: 'text-green-500' },
    { label: 'Caixa Físico', value: liquidity.cash_balance, icon: Wallet, color: 'text-amber-500' },
    { label: 'Investimentos', value: liquidity.investment_balance, icon: Landmark, color: 'text-purple-500' },
  ].filter(b => b.value > 0);

  return (
    <div className="space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Saldo Consolidado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${liquidity.total_balance >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(liquidity.total_balance)}
            </p>
            <div className="flex items-center gap-2 mt-2">
              {isHealthy ? (
                <Badge variant="default" className="gap-1 bg-success">
                  <CheckCircle className="h-3 w-3" />
                  Saudável
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Atenção
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {coverageDays < 999 ? `${coverageDays} dias de cobertura` : 'Sem obrigações'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              A Receber (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-success">
              {formatCurrency(liquidity.receivables_30d)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Títulos em aberto
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-destructive">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              A Pagar (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">
              {formatCurrency(liquidity.payables_30d)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Obrigações a vencer
            </p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${netPosition30d >= 0 ? 'border-l-success' : 'border-l-destructive'}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Posição Líquida (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-bold ${netPosition30d >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(netPosition30d)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Projeção D+30
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Breakdown */}
      {balanceBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Composição do Saldo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {balanceBreakdown.map((item) => {
              const Icon = item.icon;
              const percentage = liquidity.total_balance > 0 
                ? (item.value / liquidity.total_balance) * 100 
                : 0;
              
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold">{formatCurrency(item.value)}</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
