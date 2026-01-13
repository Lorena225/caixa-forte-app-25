import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calculator, Calendar, FileCheck, Play } from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';

const taxes = [
  { code: 'ICMS', name: 'ICMS a Recolher', status: 'pendente' },
  { code: 'IPI', name: 'IPI a Recolher', status: 'calculado' },
  { code: 'ISS', name: 'ISS a Recolher', status: 'pago' },
  { code: 'PIS', name: 'PIS', status: 'pendente' },
  { code: 'COFINS', name: 'COFINS', status: 'pendente' },
];

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/10 text-warning',
  calculado: 'bg-info/10 text-info',
  pago: 'bg-success/10 text-success',
};

export default function FiscalApuracao() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Apuração de Impostos"
          description="Cálculo e apuração por período fiscal"
          action={{
            label: 'Nova Apuração',
            onClick: () => {},
            icon: <Calculator className="h-4 w-4" />,
          }}
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Período Atual</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">Janeiro/2026</p>
              <p className="text-xs text-muted-foreground">Em apuração</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Total a Recolher</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">R$ 0,00</p>
              <p className="text-xs text-muted-foreground">Estimativa</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm">Créditos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">R$ 0,00</p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Impostos por Apurar</CardTitle>
            <CardDescription>
              Status de cada imposto no período atual
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {taxes.map((tax) => (
                <div
                  key={tax.code}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{tax.code}</Badge>
                    <span className="font-medium">{tax.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[tax.status]}>
                      {tax.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
