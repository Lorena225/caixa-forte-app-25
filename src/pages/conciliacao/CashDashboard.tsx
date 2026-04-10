import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useWallets } from '@/hooks/useCompanyData';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  Wallet, TrendingUp, TrendingDown, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle, Calendar, Clock,
  BarChart3, RefreshCw
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

// Mock data
const mockCashPositions = [
  { id: '1', name: 'Bradesco CC', openingBalance: 45000, credits: 12500, debits: 8200, closingBalance: 49300 },
  { id: '2', name: 'Itaú CC', openingBalance: 28000, credits: 5430, debits: 3500, closingBalance: 29930 },
  { id: '3', name: 'Caixa Física', openingBalance: 2500, credits: 800, debits: 1200, closingBalance: 2100 },
];

const mockProjection = [
  { date: '13/01', aReceber: 15000, aPagar: 8000, saldo: 79330 },
  { date: '14/01', aReceber: 5000, aPagar: 12000, saldo: 72330 },
  { date: '15/01', aReceber: 22000, aPagar: 3500, saldo: 90830 },
  { date: '16/01', aReceber: 0, aPagar: 15000, saldo: 75830 },
  { date: '17/01', aReceber: 8500, aPagar: 2000, saldo: 82330 },
  { date: '18/01', aReceber: 3000, aPagar: 0, saldo: 85330 },
  { date: '19/01', aReceber: 0, aPagar: 5500, saldo: 79830 },
];

const mockAlerts = [
  {
    id: '1',
    type: 'overdue',
    message: '3 títulos a receber vencidos há mais de 7 dias',
    severity: 'warning',
  },
  {
    id: '2',
    type: 'unreconciled',
    message: '5 lançamentos bancários não conciliados há mais de 5 dias',
    severity: 'info',
  },
  {
    id: '3',
    type: 'negative',
    message: 'Projeção de saldo negativo em 16/01 na conta Itaú CC',
    severity: 'error',
  },
];

export default function CashDashboard() {
  const [projectionDays, setProjectionDays] = useState('7');
  const { data: wallets = [] } = useWallets();

  const totalOpening = mockCashPositions.reduce((sum, p) => sum + p.openingBalance, 0);
  const totalCredits = mockCashPositions.reduce((sum, p) => sum + p.credits, 0);
  const totalDebits = mockCashPositions.reduce((sum, p) => sum + p.debits, 0);
  const totalClosing = mockCashPositions.reduce((sum, p) => sum + p.closingBalance, 0);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'warning': return 'bg-warning/10 text-warning border-warning/20';
      default: return 'bg-info/10 text-info border-info/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-muted">
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                <p className="text-lg font-semibold">{formatCurrency(totalOpening)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-success/10">
                <ArrowDownCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entradas Conciliadas</p>
                <p className="text-lg font-semibold text-success">+{formatCurrency(totalCredits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-destructive/10">
                <ArrowUpCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saídas Conciliadas</p>
                <p className="text-lg font-semibold text-destructive">-{formatCurrency(totalDebits)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full p-2 bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Saldo Atual</p>
                <p className="text-lg font-semibold text-primary">{formatCurrency(totalClosing)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {mockAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Alertas de Caixa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockAlerts.map((alert) => (
              <Alert key={alert.id} className={getSeverityColor(alert.severity)}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{alert.message}</AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Cash Position by Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Posição por Conta
            </CardTitle>
            <CardDescription>Saldos do dia por conta bancária</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Saldo Inicial</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Saídas</TableHead>
                  <TableHead className="text-right">Saldo Final</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCashPositions.map((position) => (
                  <TableRow key={position.id}>
                    <TableCell className="font-medium">{position.name}</TableCell>
                    <TableCell className="text-right">{formatCurrency(position.openingBalance)}</TableCell>
                    <TableCell className="text-right text-success">+{formatCurrency(position.credits)}</TableCell>
                    <TableCell className="text-right text-destructive">-{formatCurrency(position.debits)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(position.closingBalance)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Cash Projection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Projeção de Caixa
                </CardTitle>
                <CardDescription>Fluxo previsto baseado nos títulos em aberto</CardDescription>
              </div>
              <Select value={projectionDays} onValueChange={setProjectionDays}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="15">15 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockProjection}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    name="Saldo Projetado"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t mt-4">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="h-4 w-4 text-success" />
                <div>
                  <p className="text-xs text-muted-foreground">A Receber (próx. {projectionDays}d)</p>
                  <p className="font-semibold text-success">
                    {formatCurrency(mockProjection.reduce((sum, p) => sum + p.aReceber, 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpCircle className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-xs text-muted-foreground">A Pagar (próx. {projectionDays}d)</p>
                  <p className="font-semibold text-destructive">
                    {formatCurrency(mockProjection.reduce((sum, p) => sum + p.aPagar, 0))}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
