import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCNABAgreements } from "@/hooks/useCNAB";
import { Upload, Download, FileText, Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { Skeleton } from "@/components/ui/skeleton";

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", icon: Clock, variant: "secondary" },
  processing: { label: "Processando", icon: Clock, variant: "outline" },
  processed: { label: "Processado", icon: CheckCircle2, variant: "default" },
  error: { label: "Erro", icon: AlertCircle, variant: "destructive" },
  partial: { label: "Parcial", icon: XCircle, variant: "secondary" },
};

// Mock data for now - will use real table when available
const mockReturns: any[] = [];

export default function CNABRetornoPage() {
  const { data: agreements, isLoading: loadingAgreements } = useCNABAgreements();
  const [selectedAgreement, setSelectedAgreement] = useState<string>("all");

  const activeAgreements = agreements?.filter(a => a.is_active) || [];
  
  const filteredReturns = mockReturns.filter(r => 
    selectedAgreement === "all" || r.agreement_id === selectedAgreement
  );

  const processedCount = filteredReturns.filter(r => r.status === "processed").length;
  const pendingCount = filteredReturns.filter(r => r.status === "pending" || r.status === "processing").length;
  const confirmedTotal = filteredReturns.reduce((sum, r) => 
    sum + Number(r.confirmed_amount || 0), 0
  );
  const rejectedCount = filteredReturns.reduce((sum, r) => 
    sum + Number(r.rejected_count || 0), 0
  );

  const isLoading = loadingAgreements;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="CNAB - Retornos"
          description="Importar e processar arquivos de retorno bancário"
        >
          <Button>
            <Upload className="mr-2 h-4 w-4" />
            Importar Retorno
          </Button>
        </PageHeader>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retornos Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-warning">{pendingCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Retornos Processados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{processedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Valor Confirmado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-success">{formatCurrency(confirmedTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Registros Rejeitados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">{rejectedCount}</p>
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

        {/* Returns Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Retornos</CardTitle>
            <CardDescription>
              Arquivos de retorno processados dos bancos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : filteredReturns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Download className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold">Nenhum retorno encontrado</h3>
                <p className="text-muted-foreground">Importe um arquivo de retorno para processar baixas automáticas</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data Processamento</TableHead>
                    <TableHead>Convênio</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead className="text-right">Confirmados</TableHead>
                    <TableHead className="text-right">Rejeitados</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReturns.map((ret) => {
                    const status = statusConfig[ret.status] || statusConfig.pending;
                    const StatusIcon = status.icon;
                    return (
                      <TableRow key={ret.id}>
                        <TableCell>
                          {format(new Date(ret.processed_at || ret.created_at), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="font-medium">
                          {ret.cnab_agreements?.name || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{ret.filename || "arquivo.ret"}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-success">
                          {ret.confirmed_count || 0}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {ret.rejected_count || 0}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ret.confirmed_amount || 0)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant} className="flex items-center gap-1 w-fit">
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            <FileText className="h-4 w-4" />
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
