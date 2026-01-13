import { useState, ReactNode } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Loader2 } from 'lucide-react';

export type BulkEditInputType = 'date' | 'select' | 'text' | 'textarea' | 'confirm';

export interface BulkEditOption {
  value: string;
  label: string;
}

export interface BulkEditItem {
  id: string;
  label: string;
  sublabel?: string;
  currentValue?: string;
}

interface BulkEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  items: BulkEditItem[];
  inputType: BulkEditInputType;
  inputLabel?: string;
  inputPlaceholder?: string;
  options?: BulkEditOption[];
  onConfirm: (value: string, applyToEmpty?: boolean) => void;
  isLoading?: boolean;
  isDestructive?: boolean;
  confirmMessage?: string;
}

export function BulkEditModal({
  open,
  onOpenChange,
  title,
  description,
  items,
  inputType,
  inputLabel,
  inputPlaceholder,
  options = [],
  onConfirm,
  isLoading,
  isDestructive,
  confirmMessage,
}: BulkEditModalProps) {
  const [value, setValue] = useState('');
  const [applyToEmpty, setApplyToEmpty] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSubmit = () => {
    if (isDestructive || confirmMessage) {
      setShowConfirmation(true);
    } else {
      onConfirm(value, applyToEmpty);
    }
  };

  const handleConfirm = () => {
    setShowConfirmation(false);
    onConfirm(value, applyToEmpty);
  };

  const handleClose = () => {
    setValue('');
    setApplyToEmpty(false);
    onOpenChange(false);
  };

  const renderInput = () => {
    switch (inputType) {
      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full"
          />
        );
      case 'select':
        return (
          <Select value={value} onValueChange={setValue}>
            <SelectTrigger>
              <SelectValue placeholder={inputPlaceholder || 'Selecione...'} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'textarea':
        return (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputPlaceholder}
            rows={3}
          />
        );
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={inputPlaceholder}
          />
        );
      case 'confirm':
        return null;
      default:
        return null;
    }
  };

  const isConfirmType = inputType === 'confirm';

  if (isConfirmType) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {isDestructive && <AlertTriangle className="h-5 w-5 text-destructive" />}
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMessage || `Você está prestes a aplicar esta ação em ${items.length} itens.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {items.length > 0 && items.length <= 10 && (
            <div className="py-2">
              <p className="text-sm font-medium mb-2">Itens afetados:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {items.map((item) => (
                  <li key={item.id}>• {item.label}</li>
                ))}
              </ul>
            </div>
          )}
          
          {items.length > 10 && (
            <p className="text-sm text-muted-foreground">
              {items.length} itens serão afetados.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onConfirm('', false)}
              disabled={isLoading}
              className={isDestructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-4">
            {/* Items Preview */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Itens selecionados ({items.length})
              </Label>
              <ScrollArea className="h-32 rounded-md border p-2">
                <div className="space-y-1">
                  {items.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm py-1">
                      <span>{item.label}</span>
                      {item.currentValue && (
                        <span className="text-muted-foreground">{item.currentValue}</span>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Input Field - only show if not confirm type */}
            <div className="space-y-2">
              {inputLabel && <Label>{inputLabel}</Label>}
              {renderInput()}
            </div>

            {/* Apply to empty only option */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="apply-to-empty"
                checked={applyToEmpty}
                onCheckedChange={(checked) => setApplyToEmpty(checked === true)}
              />
              <Label htmlFor="apply-to-empty" className="text-sm font-normal">
                Aplicar apenas aos que não possuem valor
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !value}
              variant={isDestructive ? 'destructive' : 'default'}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                'Aplicar alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmMessage || `Você está prestes a alterar ${items.length} itens. Deseja continuar?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={isDestructive ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
