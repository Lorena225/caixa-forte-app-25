import { memo } from 'react';
import { LucideIcon, TrendingUp, TrendingDown, ArrowRight, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: LucideIcon;
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
    iconColor: 'text-[#0066CC]',
  },
  info: {
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-500',
  },
};

export const KPICard = memo(function KPICard({
  title,
  value,
  subtitle,
  change,
  trend,
  icon: Icon,
  variant = 'default',
  onClick,
  isLoading,
}: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <Card 
      className={cn(
        'relative bg-white border border-gray-200 rounded-xl p-5 transition-all duration-200',
        'shadow-[0_1px_3px_rgba(0,0,0,0.05)]',
        onClick && 'cursor-pointer hover:shadow-[0_4px_6px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 hover:border-gray-300'
      )}
      onClick={onClick}
    >
      {/* Icon in top right */}
      {Icon && (
        <div className={cn(
          'absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200',
          styles.iconBg
        )}>
          <Icon className={cn('h-[18px] w-[18px]', styles.iconColor)} />
        </div>
      )}

      {/* Info icon */}
      <button 
        className="absolute top-4 right-14 text-gray-400 hover:text-[#0066CC] transition-colors"
        onClick={(e) => { e.stopPropagation(); }}
        aria-label="Mais informações"
      >
        <Info className="h-5 w-5" />
      </button>

      <CardContent className="p-0 space-y-2">
        {/* Label */}
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider leading-[18px]">
          {title}
        </p>

        {/* Value */}
        {isLoading ? (
          <div className="h-9 w-28 bg-gray-100 animate-pulse rounded" />
        ) : (
          <p className="text-[28px] font-bold text-gray-900 font-mono leading-9 tracking-tight">
            {value}
          </p>
        )}

        {/* Variation/Status */}
        {change && (
          <div className="flex items-center gap-1">
            {trend === 'up' && (
              <>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-[13px] font-semibold text-emerald-500 leading-5">
                  {change}
                </span>
              </>
            )}
            {trend === 'down' && (
              <>
                <TrendingDown className="h-4 w-4 text-red-500" />
                <span className="text-[13px] font-semibold text-red-500 leading-5">
                  {change}
                </span>
              </>
            )}
            {trend === 'neutral' && (
              <>
                <ArrowRight className="h-4 w-4 text-gray-500" />
                <span className="text-[13px] font-semibold text-gray-500 leading-5">
                  {change}
                </span>
              </>
            )}
          </div>
        )}

        {/* Subtitle/Description */}
        {subtitle && (
          <p className="text-xs text-gray-400 leading-[18px]">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
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
      'grid gap-4',
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
