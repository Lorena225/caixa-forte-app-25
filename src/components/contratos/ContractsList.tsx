import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, Edit, Play, Pause, XCircle, RefreshCw, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Contract } from "@/hooks/useContracts";
import { useSuspendContract, useCancelContract, useRenewContract, useReactivateContract, useDeleteContract } from "@/hooks/useContracts";
import { ContractDetailsDialog } from "./ContractDetailsDialog";
import { ContractActionDialog } from "./ContractActionDialog";

interface ContractsListProps {
  contracts: Contract[];
  isLoading: boolean;
}

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  suspenso: "bg-amber-100 text-amber-800 border-amber-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
  rascunho: "bg-gray-100 text-gray-800 border-gray-200",
  encerrado: "bg-slate-100 text-slate-800 border-slate-200",
  expirado: "bg-orange-100 text-orange-800 border-orange-200",
  vigente: "bg-blue-100 text-blue-800 border-blue-200",
};

const billingCycleLabels: Record<string, string> = {
  mensal: "Mensal",
  bimestral: "Bimestral",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

export function ContractsList({ contracts, isLoading }: ContractsListProps) {
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [actionDialog, setActionDialog] = useState<{ type: 'suspend' | 'cancel' | 'renew' | 'delete' | null; contract: Contract | null }>({ type: null, contract: null });

  const suspendMutation = useSuspendContract();
  const cancelMutation = useCancelContract();
  const renewMutation = useRenewContract();
  const reactivateMutation = useReactivateContract();
  const deleteMutation = useDeleteContract();

  const formatCurrency = (value: number | null | undefined) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor Mensal</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-muted-foreground">Nenhum contrato encontrado</p>
      </div>
    );
  }

  const handleAction = (type: 'suspend' | 'cancel' | 'renew' | 'delete', contract: Contract) => {
    setActionDialog({ type, contract });
  };

  const handleReactivate = async (contract: Contract) => {
    await reactivateMutation.mutateAsync(contract.id);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor Mensal</TableHead>
              <TableHead>Ciclo</TableHead>
              <TableHead>Vigência</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell 
                  className="font-medium"
                  onClick={() => { setSelectedContract(contract); setShowDetailsDialog(true); }}
                >
                  <div>
                    <span className="font-mono text-sm">{contract.contract_number}</span>
                    {contract.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {contract.description}
                      </p>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => { setSelectedContract(contract); setShowDetailsDialog(true); }}>
                  <div>
                    <span>{contract.counterparty?.name || '-'}</span>
                    {contract.counterparty?.document && (
                      <p className="text-xs text-muted-foreground">{contract.counterparty.document}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(contract.monthly_value || contract.valor_total)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {billingCycleLabels[contract.billing_cycle || 'mensal'] || contract.billing_cycle}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <div>
                    {formatDate(contract.data_inicio)}
                    {contract.data_fim && (
                      <span className="text-muted-foreground"> → {formatDate(contract.data_fim)}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[contract.status] || statusColors.rascunho}>
                    {contract.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedContract(contract); setShowDetailsDialog(true); }}>
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {contract.status === 'ativo' && (
                        <>
                          <DropdownMenuItem onClick={() => handleAction('renew', contract)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Renovar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAction('suspend', contract)}>
                            <Pause className="h-4 w-4 mr-2" />
                            Suspender
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAction('cancel', contract)}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {contract.status === 'suspenso' && (
                        <>
                          <DropdownMenuItem onClick={() => handleReactivate(contract)}>
                            <Play className="h-4 w-4 mr-2" />
                            Reativar
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAction('cancel', contract)}
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Cancelar
                          </DropdownMenuItem>
                        </>
                      )}
                      
                      {contract.status === 'rascunho' && (
                        <DropdownMenuItem 
                          onClick={() => handleAction('delete', contract)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialogs */}
      <ContractDetailsDialog 
        contract={selectedContract}
        open={showDetailsDialog}
        onOpenChange={setShowDetailsDialog}
      />

      <ContractActionDialog
        type={actionDialog.type}
        contract={actionDialog.contract}
        open={actionDialog.type !== null}
        onOpenChange={(open) => !open && setActionDialog({ type: null, contract: null })}
        onConfirm={async (data) => {
          if (!actionDialog.contract) return;
          
          switch (actionDialog.type) {
            case 'suspend':
              await suspendMutation.mutateAsync({ id: actionDialog.contract.id, reason: data?.reason });
              break;
            case 'cancel':
              await cancelMutation.mutateAsync({ id: actionDialog.contract.id, reason: data?.reason });
              break;
            case 'renew':
              if (data?.newEndDate) {
                await renewMutation.mutateAsync({ id: actionDialog.contract.id, newEndDate: data.newEndDate });
              }
              break;
            case 'delete':
              await deleteMutation.mutateAsync(actionDialog.contract.id);
              break;
          }
          setActionDialog({ type: null, contract: null });
        }}
      />
    </>
  );
}
