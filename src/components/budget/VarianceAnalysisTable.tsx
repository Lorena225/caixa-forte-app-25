import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { VarianceAnalysisRow } from '@/hooks/useBudgetAdvanced';

interface VarianceAnalysisTableProps {
  data: VarianceAnalysisRow[];
  groupBy?: 'account' | 'cost_center' | 'month';
}

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
}

export function VarianceAnalysisTable({ data, groupBy = 'account' }: VarianceAnalysisTableProps) {
  const aggregatedData = useMemo(() => {
    const map = new Map<string, {
      key: string;
      label: string;
      category: string | null;
      budget: number;
      actual: number;
      variance: number;
      variancePercent: number;
      status: 'favorable' | 'unfavorable';
    }>();

    for (const row of data) {
      let key: string;
      let label: string;

      switch (groupBy) {
        case 'cost_center':
          key = row.cost_center_id || 'no-cc';
          label = row.cost_center_name || 'Sem Centro de Custo';
          break;
        case 'month':
          key = String(row.month);
          label = MONTH_NAMES[row.month - 1];
          break;
        default:
          key = row.account_id || 'no-account';
          label = row.account_name ? `${row.account_code} - ${row.account_name}` : 'Sem Conta';
      }

      const existing = map.get(key);
      if (existing) {
        existing.budget += row.budget_amount;
        existing.actual += row.actual_amount;
        existing.variance += row.variance_amount;
      } else {
        map.set(key, {
          key,
          label,
          category: row.category_type,
          budget: row.budget_amount,
          actual: row.actual_amount,
          variance: row.variance_amount,
          variancePercent: 0,
          status: row.variance_status,
        });
      }
    }

    // Calculate percentages
    for (const item of map.values()) {
      item.variancePercent = item.budget !== 0 ? (item.variance / item.budget) * 100 : 0;
      item.status = item.category === 'receita'
        ? (item.actual >= item.budget ? 'favorable' : 'unfavorable')
        : (item.actual <= item.budget ? 'favorable' : 'unfavorable');
    }

    return Array.from(map.values()).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [data, groupBy]);

  const totals = useMemo(() => {
    return aggregatedData.reduce(
      (acc, row) => ({
        budget: acc.budget + row.budget,
        actual: acc.actual + row.actual,
        variance: acc.variance + row.variance,
      }),
      { budget: 0, actual: 0, variance: 0 }
    );
  }, [aggregatedData]);

  const getVarianceIcon = (status: 'favorable' | 'unfavorable', variance: number) => {
    if (Math.abs(variance) < 0.01) return <Minus className="h-4 w-4 text-muted-foreground" />;
    return status === 'favorable' 
      ? <TrendingUp className="h-4 w-4 text-success" />
      : <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Análise de Variância</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                {groupBy === 'account' ? 'Conta' : groupBy === 'cost_center' ? 'Centro de Custo' : 'Mês'}
              </TableHead>
              {groupBy === 'account' && <TableHead>Tipo</TableHead>}
              <TableHead className="text-right">Orçado</TableHead>
              <TableHead className="text-right">Realizado</TableHead>
              <TableHead className="text-right">Variância</TableHead>
              <TableHead className="text-right">Var %</TableHead>
              <TableHead className="text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aggregatedData.map((row) => (
              <TableRow key={row.key}>
                <TableCell className="font-medium">{row.label}</TableCell>
                {groupBy === 'account' && (
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {row.category || 'N/A'}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="text-right">{formatCurrency(row.budget)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.actual)}</TableCell>
                <TableCell className={`text-right font-medium ${row.status === 'favorable' ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(row.variance)}
                </TableCell>
                <TableCell className={`text-right ${row.status === 'favorable' ? 'text-success' : 'text-destructive'}`}>
                  {formatPercent(row.variancePercent)}
                </TableCell>
                <TableCell className="text-center">
                  {getVarianceIcon(row.status, row.variance)}
                </TableCell>
              </TableRow>
            ))}
            {aggregatedData.length > 0 && (
              <TableRow className="bg-muted/50 font-bold">
                <TableCell>Total</TableCell>
                {groupBy === 'account' && <TableCell />}
                <TableCell className="text-right">{formatCurrency(totals.budget)}</TableCell>
                <TableCell className="text-right">{formatCurrency(totals.actual)}</TableCell>
                <TableCell className={`text-right ${totals.variance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(totals.variance)}
                </TableCell>
                <TableCell className="text-right">
                  {totals.budget !== 0 ? formatPercent((totals.variance / totals.budget) * 100) : '-'}
                </TableCell>
                <TableCell />
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
