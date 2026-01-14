import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBoletos, useBoletoEvents, useCancelBoleto } from "@/hooks/useBoletos";
import { FileText, Eye, Ban, History, RefreshCw, Filter } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  registered: "default",
  paid: "default",
  cancelled: "destructive",
  overdue: "destructive",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  registered: "Registrado",
  paid: "Pago",
  cancelled: "Cancelado",
  overdue: "Vencido",
};

export default function BoletosPage() {
  const [statusFilter, setStatusFilter] = useState<string>("__all__");
  const { data: boletos, isLoading, refetch } = useBoletos({ status: statusFilter === "__all__" ? undefined : statusFilter });
  const cancelBoleto = useCancelBoleto();
  
  const [selectedBoleto, setSelectedBoleto] = useState<string | null>(null);
  const { data: events } = useBoletoEvents(selectedBoleto);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Boletos"
          description="Gestão de boletos emitidos e eventos de cobrança"
        >
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Atualizar
          </Button>
        </PageHeader>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="registered">Registrado</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
                <SelectItem value="overdue">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <p className="text-muted-foreground">Carregando...</p>
            ) : boletos?.length === 0 ? (
              <p className="text-muted-foreground">Nenhum boleto encontrado</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nosso Número</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pago em</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boletos?.map((boleto) => (
                    <TableRow key={boleto.id}>
                      <TableCell className="font-mono">{boleto.our_number}</TableCell>
                      <TableCell>{format(new Date(boleto.due_date), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{formatCurrency(boleto.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={statusColors[boleto.status] || "secondary"}>
                          {statusLabels[boleto.status] || boleto.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {boleto.paid_date ? format(new Date(boleto.paid_date), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {boleto.amount_paid ? formatCurrency(boleto.amount_paid) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedBoleto(boleto.id)}
                              >
                                <History className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle>Histórico de Eventos</DialogTitle>
                              </DialogHeader>
                              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                                {events?.length === 0 ? (
                                  <p className="text-muted-foreground">Nenhum evento registrado</p>
                                ) : (
                                  events?.map((event) => (
                                    <div key={event.id} className="flex items-start gap-3 p-3 border rounded-lg">
                                      <div className="h-2 w-2 mt-2 rounded-full bg-primary" />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium">{event.event_type}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {format(new Date(event.event_date), "dd/MM/yyyy HH:mm")}
                                          </span>
                                        </div>
                                        {event.return_message && (
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {event.return_message}
                                          </p>
                                        )}
                                        {event.amount && (
                                          <p className="text-sm mt-1">
                                            Valor: {formatCurrency(event.amount)}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                          
                          {boleto.status === 'registered' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => cancelBoleto.mutate(boleto.id)}
                            >
                              <Ban className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {boleto.pdf_url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={boleto.pdf_url} target="_blank" rel="noopener noreferrer">
                                <Eye className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
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
