import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Package, History, User, Calendar, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Contract } from "@/hooks/useContracts";
import { useContractItems, useContractBillings } from "@/hooks/useContracts";

interface ContractDetailsDialogProps {
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800",
  suspenso: "bg-amber-100 text-amber-800",
  cancelado: "bg-red-100 text-red-800",
  rascunho: "bg-gray-100 text-gray-800",
};

export function ContractDetailsDialog({ contract, open, onOpenChange }: ContractDetailsDialogProps) {
  const { data: items, isLoading: itemsLoading } = useContractItems(contract?.id || null);
  const { data: billings, isLoading: billingsLoading } = useContractBillings(contract?.id || null);

  const formatCurrency = (value: number | null | undefined) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (!contract) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contrato {contract.contract_number}
            </DialogTitle>
            <Badge className={statusColors[contract.status]}>
              {contract.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="space-y-4">
          <TabsList>
            <TabsTrigger value="info" className="gap-2">
              <FileText className="h-4 w-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="items" className="gap-2">
              <Package className="h-4 w-4" />
              Itens ({items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <History className="h-4 w-4" />
              Faturamentos ({billings?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4">
            {/* Cliente */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Cliente</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Nome:</span>
                  <p className="font-medium">{contract.counterparty?.name || '-'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Documento:</span>
                  <p className="font-medium">{contract.counterparty?.document || '-'}</p>
                </div>
              </div>
            </div>

            {/* Vigência */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Vigência</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Início:</span>
                  <p className="font-medium">{formatDate(contract.data_inicio)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Término:</span>
                  <p className="font-medium">{formatDate(contract.data_fim)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ciclo:</span>
                  <p className="font-medium capitalize">{contract.billing_cycle || 'Mensal'}</p>
                </div>
              </div>
            </div>

            {/* Financeiro */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium">Financeiro</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Valor Mensal:</span>
                  <p className="font-medium text-lg">{formatCurrency(contract.monthly_value || contract.valor_total)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Dia Vencimento:</span>
                  <p className="font-medium">Dia {contract.billing_day || 1}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Faturamento Auto:</span>
                  <p className="font-medium">{contract.auto_generate_billing ? 'Sim' : 'Não'}</p>
                </div>
              </div>
              {contract.auto_adjustment && (
                <div className="mt-3 pt-3 border-t">
                  <span className="text-muted-foreground text-sm">Reajuste:</span>
                  <p className="font-medium">{contract.adjustment_index || 'Configurado'}</p>
                </div>
              )}
            </div>

            {/* Descrição */}
            {contract.description && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Descrição</h4>
                <p className="text-sm text-muted-foreground">{contract.description}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="items">
            {itemsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : items && items.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Valor Unit.</TableHead>
                    <TableHead className="text-right">Desconto</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const total = item.quantity * item.unit_price * (1 - (item.discount_percentage || 0) / 100);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <span>{item.description}</span>
                            {item.product && (
                              <p className="text-xs text-muted-foreground">{item.product.name}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                        <TableCell className="text-right">{item.discount_percentage || 0}%</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(total)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum item cadastrado. O valor mensal do contrato será usado no faturamento.
              </p>
            )}
          </TabsContent>

          <TabsContent value="billing">
            {billingsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : billings && billings.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Data Faturamento</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billings.map((billing) => (
                    <TableRow key={billing.id}>
                      <TableCell className="font-medium">
                        {billing.reference_month.toString().padStart(2, '0')}/{billing.reference_year}
                      </TableCell>
                      <TableCell>{formatDate(billing.billing_date)}</TableCell>
                      <TableCell>{formatDate(billing.due_date)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(billing.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={billing.status === 'pago' ? 'default' : 'secondary'}>
                          {billing.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhum faturamento gerado ainda.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
