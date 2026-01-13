import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCNABAgreements, useCNABRemittances } from "@/hooks/useCNAB";
import { Send, Download, FileText, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", icon: Clock, variant: "secondary" },
  generated: { label: "Gerada", icon: FileText, variant: "outline" },
  sent: { label: "Enviada", icon: CheckCircle2, variant: "default" },
  error: { label: "Erro", icon: AlertCircle, variant: "destructive" },
};

export default function CNABRemessaPage() {
  const { data: agreements, isLoading: loadingAgreements } = useCNABAgreements();
  const { data: remittances, isLoading: loadingRemittances } = useCNABRemittances();
  const [selectedAgreement, setSelectedAgreement] = useState<string>("all");

  const activeAgreements = agreements?.filter(a => a.is_active) || [];
  
  const filteredRemittances = remittances?.filter(r => 
    selectedAgreement === "all" || r.agreement_id === selectedAgreement
  ) || [];

  const pendingCount = filteredRemittances.filter(r => r.status === "pending").length;
  const sentCount = filteredRemittances.filter(r => r.status === "sent").length;
  const totalValue = filteredRemittances.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="CNAB - Remessas"
          description="Gerar e gerenciar arquivos de remessa CNAB 240/400"
        >
          <Button>
            <Send className="mr-2 h-4 w-4" />
            Nova Remessa
          </Button>
        </PageHeader>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Convênios Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{activeAgreements.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remessas Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remessas Enviadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{sentCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(totalValue)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <Select value={selectedAgreement} onValueChange={setSelectedAgreement}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Filtrar por convênio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os convênios</SelectItem>
              {activeAgreements.map((agreement) => (
                <SelectItem key={agreement.id} value={agreement.id}>
                  {agreement.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Remittances Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Remessas</CardTitle>
            <CardDescription>
              Arquivos de remessa gerados para os bancos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRemittances ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredRemittances.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma remessa encontrada</h3>
                <p className="text-muted-foreground">Gere uma nova remessa para enviar títulos ao banco</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Registros</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRemittances.map((remittance: any) => {
                    const status = statusConfig[remittance.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={remittance.id}>
                        <TableCell>
                          {format(new Date(remittance.generated_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {remittance.cnab_agreements?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{remittance.remittance_type}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{remittance.record_count}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(remittance.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
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
