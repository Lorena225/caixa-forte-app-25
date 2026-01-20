import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { BackButton } from "@/components/common/BackButton";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Clock, CheckCircle, Wallet } from "lucide-react";
import { useSalesCommissions, useApproveCommission, usePayCommission, useCommissionsStats } from "@/hooks/useSalesCommissions";
import { format, startOfMonth, endOfMonth } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  pendente: 'Pendente',
  aprovada: 'Aprovada',
  paga: 'Paga',
  cancelada: 'Cancelada',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pendente: 'outline',
  aprovada: 'default',
  paga: 'default',
  cancelada: 'destructive',
};

export default function Comissoes() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const hoje = new Date();

  const { data: commissions, isLoading } = useSalesCommissions({ 
    status: statusFilter || undefined,
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });
  const { data: stats } = useCommissionsStats({
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });
  const approveCommission = useApproveCommission();
  const payCommission = usePayCommission();

  const handleApprove = async (id: string) => {
    await approveCommission.mutateAsync(id);
  };

  const handlePay = async (id: string) => {
    await payCommission.mutateAsync(id);
  };

  const columns = [
    { 
      key: 'data_venda', 
      header: 'Data Venda',
      render: (item: typeof commissions extends (infer T)[] ? T : never) => (
        format(new Date(item.data_venda), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'percentual_comissao', 
      header: '% Comissão',
      render: (item: typeof commissions extends (infer T)[] ? T : never) => (
        `${Number(item.percentual_comissao).toFixed(2)}%`
      )
    },
    { 
      key: 'valor_base', 
      header: 'Valor Base',
      render: (item: typeof commissions extends (infer T)[] ? T : never) => (
        (Number(item.valor_base) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
    },
    { 
      key: 'valor_comissao', 
      header: 'Valor Comissão',
      render: (item: typeof commissions extends (infer T)[] ? T : never) => (
        <span className="font-semibold text-emerald-600">
          {(Number(item.valor_comissao) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: typeof commissions extends (infer T)[] ? T : never) => (
        <Badge variant={STATUS_VARIANTS[item.status]}>
          {STATUS_LABELS[item.status]}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      header: '',
      render: (item: typeof commissions extends (infer T)[] ? T : never) => (
        <div className="flex gap-2">
          {item.status === 'pendente' && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleApprove(item.id)}
              disabled={approveCommission.isPending}
            >
              Aprovar
            </Button>
          )}
          {item.status === 'aprovada' && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => handlePay(item.id)}
              disabled={payCommission.isPending}
            >
              Pagar
            </Button>
          )}
        </div>
      )
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton to="/vendas" />
          <PageHeader title="Comissões" description="Gestão de comissões de vendas" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pendentes || 0}</div>
              <p className="text-xs text-muted-foreground">
                {(stats?.valorPendente || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              <CheckCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.aprovadas || 0}</div>
              <p className="text-xs text-muted-foreground">
                {(stats?.valorAprovado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pagas</CardTitle>
              <Wallet className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.pagas || 0}</div>
              <p className="text-xs text-muted-foreground">
                {(stats?.valorPago || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
              <p className="text-xs text-muted-foreground">comissões no mês</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DataTable 
          data={commissions || []} 
          columns={columns} 
          loading={isLoading}
        />
      </div>
    </MainLayout>
  );
}
