import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Target, Plane, Trophy, Car, Home, GraduationCap, Heart, 
  Wallet, Briefcase, Gift, PiggyBank, Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FinancialGoal, CreateGoalInput } from '@/hooks/useFinancialGoals';
import { ptBR } from 'date-fns/locale';

interface GoalFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: FinancialGoal | null;
  onSubmit: (data: CreateGoalInput) => void;
  isLoading?: boolean;
}

const ICONS = [
  { value: 'target', icon: Target, label: 'Alvo' },
  { value: 'plane', icon: Plane, label: 'Viagem' },
  { value: 'trophy', icon: Trophy, label: 'Conquista' },
  { value: 'car', icon: Car, label: 'Veículo' },
  { value: 'home', icon: Home, label: 'Casa' },
  { value: 'education', icon: GraduationCap, label: 'Educação' },
  { value: 'health', icon: Heart, label: 'Saúde' },
  { value: 'wallet', icon: Wallet, label: 'Finanças' },
  { value: 'business', icon: Briefcase, label: 'Negócios' },
  { value: 'gift', icon: Gift, label: 'Presente' },
  { value: 'piggy', icon: PiggyBank, label: 'Poupança' },
];

const COLORS = [
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'green', label: 'Verde', class: 'bg-emerald-500' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { value: 'teal', label: 'Azul-verde', class: 'bg-teal-500' },
];

export function GoalFormDialog({ 
  open, 
  onOpenChange, 
  goal, 
  onSubmit,
  isLoading 
}: GoalFormDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: '',
    target_date: undefined as Date | undefined,
    icon: 'target',
    color: 'blue',
  });
  
  useEffect(() => {
    if (goal) {
      setFormData({
        name: goal.name,
        description: goal.description || '',
        target_amount: goal.target_amount.toString(),
        current_amount: goal.current_amount.toString(),
        target_date: new Date(goal.target_date),
        icon: goal.icon,
        color: goal.color,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        target_amount: '',
        current_amount: '',
        target_date: undefined,
        icon: 'target',
        color: 'blue',
      });
    }
  }, [goal, open]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.target_amount || !formData.target_date) {
      return;
    }
    
    onSubmit({
      name: formData.name,
      description: formData.description || undefined,
      target_amount: parseFloat(formData.target_amount.replace(',', '.')),
      current_amount: formData.current_amount 
        ? parseFloat(formData.current_amount.replace(',', '.')) 
        : 0,
      target_date: format(formData.target_date, 'yyyy-MM-dd'),
      icon: formData.icon,
      color: formData.color,
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            {goal ? 'Editar Meta' : 'Nova Meta Financeira'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Viagem de Férias, Carro Novo..."
              required
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva sua meta..."
              rows={2}
            />
          </div>
          
          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Valor Alvo *</Label>
              <Input
                id="target_amount"
                value={formData.target_amount}
                onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                placeholder="5000,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="current_amount">Valor Já Poupado</Label>
              <Input
                id="current_amount"
                value={formData.current_amount}
                onChange={(e) => setFormData({ ...formData, current_amount: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>
          
          {/* Target Date */}
          <div className="space-y-2">
            <Label>Data Limite *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !formData.target_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.target_date
                    ? format(formData.target_date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                    : 'Selecione uma data'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.target_date}
                  onSelect={(date) => setFormData({ ...formData, target_date: date })}
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map(({ value, icon: Icon, label }) => (
                <Button
                  key={value}
                  type="button"
                  variant={formData.icon === value ? 'default' : 'outline'}
                  size="icon"
                  className="h-10 w-10"
                  onClick={() => setFormData({ ...formData, icon: value })}
                  title={label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              ))}
            </div>
          </div>
          
          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2">
              {COLORS.map(({ value, label, class: colorClass }) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    colorClass,
                    formData.color === value 
                      ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                      : 'opacity-70 hover:opacity-100'
                  )}
                  onClick={() => setFormData({ ...formData, color: value })}
                  title={label}
                />
              ))}
            </div>
          </div>
          
          <DialogFooter className="pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {goal ? 'Salvar Alterações' : 'Criar Meta'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
