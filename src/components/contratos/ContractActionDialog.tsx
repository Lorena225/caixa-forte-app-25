import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, RefreshCw, Pause, XCircle, Trash2 } from "lucide-react";
import type { Contract } from "@/hooks/useContracts";
import { format, addYears } from "date-fns";

interface ContractActionDialogProps {
  type: 'suspend' | 'cancel' | 'renew' | 'delete' | null;
  contract: Contract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data?: { reason?: string; newEndDate?: string; feeAmount?: number }) => Promise<void>;
}

export function ContractActionDialog({ type, contract, open, onOpenChange, onConfirm }: ContractActionDialogProps) {
  const [reason, setReason] = useState("");
  const [newEndDate, setNewEndDate] = useState(
    contract?.data_fim ? format(addYears(new Date(contract.data_fim), 1), 'yyyy-MM-dd') : format(addYears(new Date(), 1), 'yyyy-MM-dd')
  );
  const [feeAmount, setFeeAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm({ reason, newEndDate, feeAmount });
      setReason("");
      setFeeAmount(0);
    } finally {
      setIsLoading(false);
    }
  };

  const config = {
    suspend: {
      icon: Pause,
      title: "Suspender Contrato",
      description: "A suspensão irá pausar a geração automática de cobranças. O contrato pode ser reativado a qualquer momento.",
      confirmText: "Suspender",
      variant: "default" as const,
    },
    cancel: {
      icon: XCircle,
      title: "Cancelar Contrato",
      description: "O cancelamento é permanente. Cobranças futuras não serão geradas. Você pode adicionar uma multa por rescisão.",
      confirmText: "Cancelar Contrato",
      variant: "destructive" as const,
    },
    renew: {
      icon: RefreshCw,
      title: "Renovar Contrato",
      description: "Defina a nova data de término do contrato. As demais condições serão mantidas.",
      confirmText: "Renovar",
      variant: "default" as const,
    },
    delete: {
      icon: Trash2,
      title: "Excluir Contrato",
      description: "Esta ação é irreversível. O contrato será removido permanentemente.",
      confirmText: "Excluir",
      variant: "destructive" as const,
    },
  };

  if (!type || !contract) return null;

  const { icon: Icon, title, description, confirmText, variant } = config[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${variant === 'destructive' ? 'text-destructive' : ''}`} />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Contrato: <strong>{contract.contract_number}</strong>
              <br />
              Cliente: <strong>{contract.counterparty?.name}</strong>
            </AlertDescription>
          </Alert>

          {type === 'renew' && (
            <div className="space-y-2">
              <Label htmlFor="newEndDate">Nova Data de Término</Label>
              <Input
                id="newEndDate"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
          )}

          {type === 'cancel' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="feeAmount">Multa por Cancelamento (opcional)</Label>
                <Input
                  id="feeAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={feeAmount}
                  onChange={(e) => setFeeAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                />
                <p className="text-xs text-muted-foreground">
                  Se informado, uma conta a receber será criada com este valor.
                </p>
              </div>
            </>
          )}

          {(type === 'suspend' || type === 'cancel') && (
            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={type === 'suspend' ? 'Ex: Inadimplência, solicitação do cliente...' : 'Ex: Encerramento de atividades, mudança de fornecedor...'}
                rows={3}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Voltar
          </Button>
          <Button variant={variant} onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
