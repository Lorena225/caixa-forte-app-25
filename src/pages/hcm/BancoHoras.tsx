import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Clock, TrendingUp, TrendingDown, Timer } from 'lucide-react';
import { useTimeTracking } from '@/hooks/hcm/useTimeTracking';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function HCMBancoHoras() {
  const { hourBank, hourBankLoading } = useTimeTracking();

  const totalPositive = hourBank
    .filter(h => h.transaction_type === 'credito')
    .reduce((sum, h) => sum + h.hours, 0);

  const totalNegative = hourBank
    .filter(h => h.transaction_type === 'debito')
    .reduce((sum, h) => sum + Math.abs(h.hours), 0);

  const currentBalance = hourBank.length > 0 ? hourBank[0]?.balance_after || 0 : 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Banco de Horas</h1>
          <p className="text-muted-foreground">Controle de horas extras e compensações</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Timer className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo Atual</p>
                  <p className="text-2xl font-bold">{currentBalance.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Créditos</p>
                  <p className="text-2xl font-bold text-success">+{totalPositive.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Débitos</p>
                  <p className="text-2xl font-bold text-destructive">-{totalNegative.toFixed(1)}h</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            {hourBankLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : hourBank.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma movimentação no banco de horas</p>
                <p className="text-sm mt-1">As movimentações serão registradas automaticamente pela integração de ponto</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Data Referência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                    <TableHead className="text-right">Saldo Após</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Vencimento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hourBank.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {entry.employee?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {format(new Date(entry.reference_date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={entry.transaction_type === 'credito'
                            ? 'bg-success/10 text-success border-success/20'
                            : 'bg-destructive/10 text-destructive border-destructive/20'
                          }
                        >
                          {entry.transaction_type === 'credito' ? 'Crédito' : 'Débito'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-mono ${
                        entry.transaction_type === 'credito' ? 'text-success' : 'text-destructive'
                      }`}>
                        {entry.transaction_type === 'credito' ? '+' : '-'}{Math.abs(entry.hours).toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.balance_after.toFixed(1)}h
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.description || '-'}
                      </TableCell>
                      <TableCell>
                        {entry.expires_at
                          ? format(new Date(entry.expires_at), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
