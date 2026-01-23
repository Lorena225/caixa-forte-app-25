import { memo, useState } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight, Pencil, Check, X } from 'lucide-react';
import { TooltipIcon } from '@/components/common/TooltipIcon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
  tooltip?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary' | 'info';
  onClick?: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
  onEditSave?: (updates: { title?: string; tooltip?: string }) => void;
}

const variantStyles = {
  default: {
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    border: 'border-border',
  },
  success: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  danger: {
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    border: 'border-destructive/20',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
    border: 'border-amber-200',
  },
  primary: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    border: 'border-primary/20',
  },
  info: {
    iconBg: 'bg-cyan-500/10',
    iconColor: 'text-cyan-600',
    border: 'border-cyan-200',
  },
};

const tooltipTexts: Record<string, string> = {
  'Saldo em Caixa': 'Saldo disponível em conta + títulos a receber - títulos a pagar. Representa sua liquidez real.',
  'Contas a Receber': 'Total de títulos abertos para cobrar. Inclui faturas, boletos e recebíveis com vencimento até 60 dias.',
  'Contas a Pagar': 'Total de compromissos financeiros. Inclui faturas de fornecedores, boletos, cheques e outras obrigações.',
  'Execução Orçamentária': 'Percentual de execução do orçamento. Compara despesas realizadas vs. orçadas para o período.',
};

export const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  change,
  trend,
  icon: Icon,
  tooltip,
  variant = 'default',
  onClick,
  isLoading,
  isEditMode = false,
  onEditSave,
}: KPICardProps) {
  const styles = variantStyles[variant];
  const tooltipContent = tooltip || tooltipTexts[title] || `Informações sobre ${title}`;
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editTooltip, setEditTooltip] = useState(tooltipContent);

  const handleSave = () => {
    onEditSave?.({ title: editTitle, tooltip: editTooltip });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(title);
    setEditTooltip(tooltipContent);
    setIsEditing(false);
  };

  return (
    <div 
      className={cn(
        'relative bg-card border rounded-xl',
        'h-[160px] p-5 flex flex-col justify-between',
        'shadow-sm',
        'transition-all duration-200',
        styles.border,
        onClick && !isEditMode && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/30',
        isEditMode && 'ring-2 ring-primary/20 ring-offset-2'
      )}
      onClick={!isEditMode && !isEditing ? onClick : undefined}
      role={onClick && !isEditMode ? 'button' : undefined}
      tabIndex={onClick && !isEditMode ? 0 : undefined}
      onKeyDown={onClick && !isEditMode ? (e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); } : undefined}
    >
      {/* Edit Mode Overlay */}
      {isEditMode && !isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 bg-primary/10 hover:bg-primary/20 text-primary z-10"
          onClick={(e) => {
            e.stopPropagation();
            setIsEditing(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}

      {/* Inline Edit Form */}
      {isEditing && (
        <div className="absolute inset-0 bg-card rounded-xl p-4 z-20 flex flex-col gap-3">
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Título do KPI"
            className="h-9 text-sm font-semibold"
          />
          <Input
            value={editTooltip}
            onChange={(e) => setEditTooltip(e.target.value)}
            placeholder="Descrição / Tooltip"
            className="h-9 text-sm flex-1"
          />
          <div className="flex gap-2 mt-auto">
            <Button size="sm" className="flex-1 h-8" onClick={handleSave}>
              <Check className="h-3.5 w-3.5 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="outline" className="flex-1 h-8" onClick={handleCancel}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* Header: Label + Tooltip + Icon */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
            {title}
          </span>
          <TooltipIcon content={tooltipContent} position="top" />
        </div>
        
        {Icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
            styles.iconBg
          )}>
            <Icon className={cn('h-5 w-5', styles.iconColor)} />
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex-1 flex items-center">
        {isLoading ? (
          <div className="h-10 w-32 bg-muted animate-pulse rounded" />
        ) : (
          <p className="text-3xl font-bold text-foreground font-mono leading-tight tracking-tight">
            {value}
          </p>
        )}
      </div>

      {/* Footer: Trend or Status */}
      <div className="flex items-center gap-2 min-h-[20px]">
        {change && trend && (
          <div className="flex items-center gap-1">
            {trend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-600">
                  {change}
                </span>
              </>
            )}
            {trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-destructive" />
                <span className="text-xs font-semibold text-destructive">
                  {change}
                </span>
              </>
            )}
            {trend === 'neutral' && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">
                  {change}
                </span>
              </>
            )}
          </div>
        )}
        
        {subtitle && !change && (
          <span className="text-xs text-muted-foreground">{subtitle}</span>
        )}
        
        {subtitle && change && (
          <span className="text-xs text-muted-foreground ml-2">{subtitle}</span>
        )}
      </div>
    </div>
  );
});

KPICard.displayName = 'KPICard';

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  return (
    <div className={cn(
      'grid gap-4 sm:gap-6',
      'grid-cols-1 sm:grid-cols-2',
      columns >= 3 && 'lg:grid-cols-3',
      columns >= 4 && 'xl:grid-cols-4',
      columns >= 5 && '2xl:grid-cols-5',
      columns >= 6 && '2xl:grid-cols-6'
    )}>
      {children}
    </div>
  );
}
