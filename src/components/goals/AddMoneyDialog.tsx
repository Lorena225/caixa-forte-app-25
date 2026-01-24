import { useState } from 'react';
import { Loader2, PiggyBank, TrendingUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { FinancialGoal } from '@/hooks/useFinancialGoals';
import { formatCurrency } from '@/lib/formatters';

interface AddMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: FinancialGoal | null;
  onSubmit: (amount: number) => void;
  isLoading?: boolean;
}

export function AddMoneyDialog({ 
  open, 
  onOpenChange, 
  goal, 
  onSubmit,
  isLoading 
}: AddMoneyDialogProps) {
  const [amount, setAmount] = useState('');
  
  if (!goal) return null;
  
  const currentProgress = (goal.current_amount / goal.target_amount) * 100;
  const amountValue = parseFloat(amount.replace(',', '.')) || 0;
  const newTotal = goal.current_amount + amountValue;
  const newProgress = Math.min(100, (newTotal / goal.target_amount) * 100);
  const remaining = goal.target_amount - newTotal;
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountValue > 0) {
      onSubmit(amountValue);
      setAmount('');
    }
  };
  
  // Quick add buttons
  const quickAmounts = [50, 100, 200, 500];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-primary" />
            Adicionar à Meta
          </DialogTitle>
          <DialogDescription>
            {goal.name}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Progress */}
          <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progresso atual</span>
              <span className="font-medium">{currentProgress.toFixed(0)}%</span>
            </div>
            <Progress value={currentProgress} className="h-2" />
            <div className="flex justify-between text-sm">
              <span>{formatCurrency(goal.current_amount)}</span>
              <span className="text-muted-foreground">{formatCurrency(goal.target_amount)}</span>
            </div>
          </div>
          
          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor a Adicionar</Label>
            <Input
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="text-lg"
              autoFocus
            />
          </div>
          
          {/* Quick Add Buttons */}
          <div className="flex gap-2">
            {quickAmounts.map((quickAmount) => (
              <Button
                key={quickAmount}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAmount(quickAmount.toString())}
              >
                +R${quickAmount}
              </Button>
            ))}
          </div>
          
          {/* Preview */}
          {amountValue > 0 && (
            <div className="space-y-2 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">Após adicionar:</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Novo total</span>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(newTotal)}
                </span>
              </div>
              <Progress value={newProgress} className="h-2" />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Progresso: {newProgress.toFixed(0)}%</span>
                {remaining > 0 ? (
                  <span>Faltam: {formatCurrency(remaining)}</span>
                ) : (
                  <span className="text-emerald-600 font-medium">🎉 Meta atingida!</span>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || amountValue <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar {amountValue > 0 && formatCurrency(amountValue)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
