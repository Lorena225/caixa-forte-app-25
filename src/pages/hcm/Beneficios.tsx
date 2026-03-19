import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Gift, Heart, Bus, UtensilsCrossed, Shield } from 'lucide-react';
import { useBenefitsAndRequests } from '@/hooks/hcm/useBenefitsAndRequests';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const benefitTypeIcons: Record<string, typeof Gift> = {
  vt: Bus,
  vr: UtensilsCrossed,
  va: UtensilsCrossed,
  saude: Heart,
  odonto: Shield,
  seguro_vida: Shield,
};

const benefitTypeLabels: Record<string, string> = {
  vt: 'Vale Transporte',
  vr: 'Vale Refeição',
  va: 'Vale Alimentação',
  saude: 'Plano de Saúde',
  odonto: 'Plano Odontológico',
  seguro_vida: 'Seguro de Vida',
};

export default function HCMBeneficios() {
  const { employeeBenefits, employeeBenefitsLoading } = useBenefitsAndRequests();
  const { employees } = useEmployees();

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.full_name || 'N/A';
  };

  const totalCustoEmpresa = employeeBenefits.reduce((sum, b) => sum + (b.company_value || 0), 0);
  const totalDesconto = employeeBenefits.reduce((sum, b) => sum + (b.employee_discount || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Benefícios</h1>
          <p className="text-muted-foreground">Gestão de benefícios dos colaboradores</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Benefícios Ativos</p>
                  <p className="text-2xl font-bold">{employeeBenefits.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Heart className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Custo Empresa (Mensal)</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalCustoEmpresa)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Shield className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Desconto Colaborador</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalDesconto)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Benefícios Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {employeeBenefitsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : employeeBenefits.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum benefício cadastrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Custo Empresa</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeeBenefits.map((benefit) => {
                    const Icon = benefitTypeIcons[benefit.benefit_type] || Gift;
                    return (
                      <TableRow key={benefit.id}>
                        <TableCell className="font-medium">
                          {getEmployeeName(benefit.employee_id)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            {benefitTypeLabels[benefit.benefit_type] || benefit.benefit_type}
                          </div>
                        </TableCell>
                        <TableCell>{benefit.benefit_name || '-'}</TableCell>
                        <TableCell>{benefit.provider || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(benefit.company_value)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(benefit.employee_discount)}</TableCell>
                        <TableCell>
                          <Badge variant={benefit.is_active ? 'default' : 'secondary'}>
                            {benefit.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
