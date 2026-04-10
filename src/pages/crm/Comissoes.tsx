import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DollarSign, CheckCircle, Clock, CreditCard, TrendingUp, Users } from "lucide-react";
import { useCommissions, useSellers } from "@/hooks/useCRM";
import { format } from "date-fns";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  pending: { label: "Pendente", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
  approved: { label: "Aprovada", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
  paid: { label: "Paga", variant: "default", icon: <CreditCard className="h-3 w-3" /> },
  cancelled: { label: "Cancelada", variant: "destructive", icon: null },
};

export default function Comissoes() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [period, setPeriod] = useState(currentMonth);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [sellerFilter, setSellerFilter] = useState<string>("");

  const { data: commissions = [], approveCommission, payCommission } = useCommissions({
    period: period || undefined,
    status: statusFilter || undefined,
    seller_id: sellerFilter || undefined,
  });
  const { data: sellers = [] } = useSellers();

  const totals = commissions.reduce(
    (acc, c) => {
      acc.total += c.total_amount || 0;
      if (c.status === "pending") acc.pending += c.total_amount || 0;
      if (c.status === "approved") acc.approved += c.total_amount || 0;
      if (c.status === "paid") acc.paid += c.total_amount || 0;
      return acc;
    },
    { total: 0, pending: 0, approved: 0, paid: 0 }
  );

  // Generate period options (last 12 months)
  const periodOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return format(d, "yyyy-MM");
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Comissões" description="Cálculo e pagamento de comissões da equipe" />

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4" /> Total do Período
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {totals.pending.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-500" /> Aprovadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {totals.approved.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-emerald-500" /> Pagas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {totals.paid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map(p => (
                    <SelectItem key={p} value={p}>
                      {format(new Date(p + "-01"), "MMM/yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {Object.entries(statusConfig).map(([value, { label }]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sellerFilter} onValueChange={setSellerFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Vendedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {sellers.filter(s => s.is_active).map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Valor Venda</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">Comissão</TableHead>
                  <TableHead className="text-right">Bônus</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhuma comissão encontrada para o período
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map(commission => (
                    <TableRow key={commission.id}>
                      <TableCell className="font-medium">
                        {commission.seller?.name || "-"}
                      </TableCell>
                      <TableCell>
                        {commission.reference_period ? format(new Date(commission.reference_period + "-01"), "MMM/yyyy") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {commission.sale_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {commission.commission_percent || 0}%
                      </TableCell>
                      <TableCell className="text-right">
                        {commission.commission_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell className="text-right">
                        {commission.bonus_amount > 0 
                          ? commission.bonus_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                          : "-"
                        }
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {commission.total_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[commission.status]?.variant || "secondary"} className="gap-1">
                          {statusConfig[commission.status]?.icon}
                          {statusConfig[commission.status]?.label || commission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {commission.status === "pending" && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => approveCommission.mutate(commission.id)}
                            >
                              Aprovar
                            </Button>
                          )}
                          {commission.status === "approved" && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => payCommission.mutate({ id: commission.id })}
                            >
                              Pagar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
