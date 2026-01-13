import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWallets } from '@/hooks/useCompanyData';
import {
  useProcessSettlement,
  useValidateSettlement,
  SettlementType,
  TitleType,
  SETTLEMENT_TYPE_LABELS,
} from '@/hooks/useSettlements';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface TitleData {
  id: string;
  description: string;
  counterparty_name?: string | null;
  due_date: string;
  balance_amount: number;
  updated_at?: string;
}

interface QuickSettlementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: TitleData | null;
  titleType: TitleType;
  onSuccess?: () => void;
}

export function QuickSettlementDialog({
  open,
  onOpenChange,
  title,
  titleType,
  onSuccess,
}: QuickSettlementDialogProps) {
  const [settlementDate, setSettlementDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const { data: wallets = [] } = useWallets();
  const processSettlement = useProcessSettlement();
  const validateSettlement = useValidateSettlement();

  const settlementType: SettlementType = titleType === 'PAGAR' ? 'PAGAMENTO' : 'RECEBIMENTO';
  const bankWallets = wallets.filter((w) => w.type === 'banco');

  const resetForm = () => {
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setBankAccountId('');
    setNotes('');
    setError(null);
    setIsValidating(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const validateForm = (): string | null => {
    if (!settlementDate) {
      return 'A data da baixa é obrigatória.';
    }
    if (!bankAccountId) {
      return 'Selecione uma conta bancária.';
    }
    if (!title || title.balance_amount <= 0) {
      return 'O título não possui saldo para baixa.';
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!title) return;

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setIsValidating(true);

    try {
      // Validate first
      const validationResult = await validateSettlement.mutateAsync({
        settlement_type: settlementType,
        settlement_date: settlementDate,
        bank_account_id: bankAccountId,
        notes: notes || undefined,
        items: [
          {
            transaction_id: title.id,
            amount_settled: title.balance_amount,
            interest: 0,
            penalty: 0,
            discount: 0,
            expected_updated_at: title.updated_at,
          },
        ],
        mode: 'ALL_OR_NOTHING',
      });

      if (!validationResult.is_valid) {
        const firstError = validationResult.item_results?.[0]?.errors?.[0]?.message ||
          validationResult.global_errors?.[0]?.message ||
          'Erro ao validar baixa.';
        setError(firstError);
        setIsValidating(false);
        return;
      }

      // Process settlement
      await processSettlement.mutateAsync({
        settlement_type: settlementType,
        origin: 'MANUAL',
        title_type: titleType,
        settlement_date: settlementDate,
        bank_account_id: bankAccountId,
        notes: notes || undefined,
        items: [
          {
            transaction_id: title.id,
            amount_settled: title.balance_amount,
            interest: 0,
            penalty: 0,
            discount: 0,
          },
        ],
      });

      handleClose();
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar baixa.');
    } finally {
      setIsValidating(false);
    }
  };

  if (!title) return null;

  const isPending = isValidating || processSettlement.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Baixa Rápida
          </DialogTitle>
          <DialogDescription>
            Registrar {titleType === 'PAGAR' ? 'pagamento' : 'recebimento'} do título
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title Summary */}
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{title.description}</p>
                {title.counterparty_name && (
                  <p className="text-sm text-muted-foreground">{title.counterparty_name}</p>
                )}
              </div>
              <span className="font-semibold text-lg">{formatCurrency(title.balance_amount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Vencimento: {formatDate(title.due_date)}
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Settlement Date */}
          <div className="space-y-2">
            <Label htmlFor="settlement-date">Data da Baixa *</Label>
            <Input
              id="settlement-date"
              type="date"
              value={settlementDate}
              onChange={(e) => setSettlementDate(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Bank Account */}
          <div className="space-y-2">
            <Label htmlFor="bank-account">Conta Bancária *</Label>
            <Select
              value={bankAccountId || '__none__'}
              onValueChange={(v) => setBankAccountId(v === '__none__' ? '' : v)}
              disabled={isPending}
            >
              <SelectTrigger id="bank-account">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__" disabled>
                  Selecione uma conta...
                </SelectItem>
                {bankWallets.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre a baixa..."
              rows={2}
              disabled={isPending}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Confirmar Baixa
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
