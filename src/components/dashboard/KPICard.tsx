import { memo, ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { TooltipIcon } from '@/components/common/TooltipIcon';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon | ReactNode;
  tooltip?: string;
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'primary' | 'info';
  onClick?: () => void;
  isLoading?: boolean;
}

const variantStyles = {
  default: {
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-500',
  },
  success: {
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-500',
  },
  danger: {
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500',
  },
  warning: {
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-500',
  },
  primary: {
    iconBg: 'bg-blue-50',
    iconColor: 'text-primary',
  },
  info: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
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
}: KPICardProps) {
  const styles = variantStyles[variant];
  const tooltipContent = tooltip || tooltipTexts[title] || `Informações sobre ${title}`;

  // Render icon based on type
  const renderIcon = () => {
    if (!Icon) return null;
    
    // If it's a Lucide icon component
    if (typeof Icon === 'function') {
      const IconComponent = Icon as LucideIcon;
      return <IconComponent className={cn('h-5 w-5', styles.iconColor)} />;
    }
    
    // If it's a ReactNode (emoji or custom element)
    return <span className="text-xl">{Icon}</span>;
  };

  return (
    <div 
      className={cn(
        'kpi-card relative bg-white border border-gray-200 rounded-xl',
        'h-[160px] p-5 flex flex-col justify-between',
        'shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 hover:border-gray-300'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Header: Label + Tooltip + Icon */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="kpi-label text-[13px] font-semibold text-gray-500 uppercase tracking-[0.5px]">
            {title}
          </span>
          <TooltipIcon content={tooltipContent} position="top" />
        </div>
        
        {Icon && (
          <div className={cn(
            'w-10 h-10 rounded-lg flex items-center justify-center',
            styles.iconBg
          )}>
            {renderIcon()}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex-1 flex items-center">
        {isLoading ? (
          <div className="h-10 w-32 bg-gray-100 animate-pulse rounded" />
        ) : (
          <p className="kpi-value text-[32px] font-bold text-gray-900 font-mono leading-tight tracking-tight">
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
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-[13px] font-semibold text-emerald-500">
                  {change}
                </span>
              </>
            )}
            {trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-[13px] font-semibold text-red-500">
                  {change}
                </span>
              </>
            )}
            {trend === 'neutral' && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-500" />
                <span className="text-[13px] font-semibold text-gray-500">
                  {change}
                </span>
              </>
            )}
          </div>
        )}
        
        {subtitle && !change && (
          <span className="text-xs text-gray-400">{subtitle}</span>
        )}
        
        {subtitle && change && (
          <span className="text-xs text-gray-400 ml-2">{subtitle}</span>
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
      'grid gap-6',
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
