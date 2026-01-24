import { useMemo, useState } from 'react';
import { format, differenceInDays, isPast } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Target, Plane, Trophy, Car, Home, GraduationCap, Heart, 
  Wallet, Briefcase, Gift, Sparkles, TrendingUp, Calendar,
  PiggyBank, MoreVertical, Plus, Pencil, Trash2, CheckCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FinancialGoal, calculateMonthlySavings } from '@/hooks/useFinancialGoals';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: FinancialGoal;
  onEdit: (goal: FinancialGoal) => void;
  onDelete: (goal: FinancialGoal) => void;
  onAddMoney: (goal: FinancialGoal) => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  target: Target,
  plane: Plane,
  trophy: Trophy,
  car: Car,
  home: Home,
  education: GraduationCap,
  health: Heart,
  wallet: Wallet,
  business: Briefcase,
  gift: Gift,
  piggy: PiggyBank,
};

const COLOR_MAP: Record<string, { bg: string; text: string; progress: string; border: string }> = {
  blue: { 
    bg: 'bg-blue-50 dark:bg-blue-950/30', 
    text: 'text-blue-600 dark:text-blue-400', 
    progress: 'bg-blue-500',
    border: 'border-blue-200 dark:border-blue-800',
  },
  green: { 
    bg: 'bg-emerald-50 dark:bg-emerald-950/30', 
    text: 'text-emerald-600 dark:text-emerald-400', 
    progress: 'bg-emerald-500',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  purple: { 
    bg: 'bg-purple-50 dark:bg-purple-950/30', 
    text: 'text-purple-600 dark:text-purple-400', 
    progress: 'bg-purple-500',
    border: 'border-purple-200 dark:border-purple-800',
  },
  orange: { 
    bg: 'bg-orange-50 dark:bg-orange-950/30', 
    text: 'text-orange-600 dark:text-orange-400', 
    progress: 'bg-orange-500',
    border: 'border-orange-200 dark:border-orange-800',
  },
  pink: { 
    bg: 'bg-pink-50 dark:bg-pink-950/30', 
    text: 'text-pink-600 dark:text-pink-400', 
    progress: 'bg-pink-500',
    border: 'border-pink-200 dark:border-pink-800',
  },
  teal: { 
    bg: 'bg-teal-50 dark:bg-teal-950/30', 
    text: 'text-teal-600 dark:text-teal-400', 
    progress: 'bg-teal-500',
    border: 'border-teal-200 dark:border-teal-800',
  },
};

export function GoalCard({ goal, onEdit, onDelete, onAddMoney }: GoalCardProps) {
  const Icon = ICON_MAP[goal.icon] || Target;
  const colors = COLOR_MAP[goal.color] || COLOR_MAP.blue;
  
  const progress = useMemo(() => {
    return Math.min(100, (goal.current_amount / goal.target_amount) * 100);
  }, [goal.current_amount, goal.target_amount]);
  
  const { monthly, remaining, monthsLeft } = useMemo(() => {
    return calculateMonthlySavings(goal.target_amount, goal.current_amount, goal.target_date);
  }, [goal.target_amount, goal.current_amount, goal.target_date]);
  
  const daysLeft = useMemo(() => {
    return differenceInDays(new Date(goal.target_date), new Date());
  }, [goal.target_date]);
  
  const isOverdue = isPast(new Date(goal.target_date)) && goal.status !== 'completed';
  const isCompleted = goal.status === 'completed';
  
  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1',
      colors.border,
      isCompleted && 'ring-2 ring-emerald-500 ring-offset-2'
    )}>
      {/* Decorative gradient */}
      <div className={cn(
        'absolute top-0 left-0 right-0 h-1',
        colors.progress
      )} />
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'p-2.5 rounded-xl',
              colors.bg
            )}>
              <Icon className={cn('h-6 w-6', colors.text)} />
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-tight">{goal.name}</h3>
              {goal.description && (
                <p className="text-sm text-muted-foreground mt-0.5">{goal.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {isCompleted && (
              <Badge className="bg-emerald-500 text-white">
                <CheckCircle className="h-3 w-3 mr-1" />
                Concluída
              </Badge>
            )}
            {isOverdue && !isCompleted && (
              <Badge variant="destructive">Vencida</Badge>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onAddMoney(goal)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Valor
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(goal)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar Meta
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDelete(goal)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Amount Display */}
        <div className="flex items-baseline justify-between">
          <div>
            <span className={cn('text-2xl font-bold', colors.text)}>
              {formatCurrency(goal.current_amount)}
            </span>
            <span className="text-muted-foreground text-sm ml-1">
              de {formatCurrency(goal.target_amount)}
            </span>
          </div>
          <span className={cn('text-lg font-semibold', colors.text)}>
            {progress.toFixed(0)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="relative">
          <Progress 
            value={progress} 
            className="h-3 bg-muted"
          />
          {/* Custom colored progress indicator */}
          <div 
            className={cn(
              'absolute top-0 left-0 h-3 rounded-full transition-all duration-500',
              colors.progress
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Date and AI Suggestion */}
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Meta até {format(new Date(goal.target_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
            {daysLeft > 0 && !isCompleted && (
              <Badge variant="outline" className="ml-auto">
                {daysLeft} dias restantes
              </Badge>
            )}
          </div>
          
          {/* AI Calculation Insight */}
          {!isCompleted && remaining > 0 && (
            <div className={cn(
              'flex items-start gap-2 p-3 rounded-lg text-sm',
              colors.bg
            )}>
              <Sparkles className={cn('h-4 w-4 mt-0.5 flex-shrink-0', colors.text)} />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">Dica da IA:</span>{' '}
                Para atingir esta meta até{' '}
                <span className="font-medium">
                  {format(new Date(goal.target_date), "MMMM 'de' yyyy", { locale: ptBR })}
                </span>
                , você precisa economizar aproximadamente{' '}
                <span className={cn('font-bold', colors.text)}>
                  {formatCurrency(monthly)}
                </span>{' '}
                por mês ({monthsLeft} {monthsLeft === 1 ? 'mês' : 'meses'} restante{monthsLeft > 1 ? 's' : ''}).
              </p>
            </div>
          )}
          
          {isCompleted && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-sm">
              <Trophy className="h-4 w-4 text-emerald-600" />
              <p className="text-emerald-700 dark:text-emerald-400 font-medium">
                🎉 Parabéns! Você alcançou esta meta!
              </p>
            </div>
          )}
        </div>
        
        {/* Quick Add Button */}
        {!isCompleted && (
          <Button 
            onClick={() => onAddMoney(goal)}
            className={cn('w-full', colors.progress, 'hover:opacity-90')}
          >
            <PiggyBank className="h-4 w-4 mr-2" />
            Adicionar Valor
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
