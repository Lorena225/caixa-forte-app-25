import { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    card: '',
    icon: 'text-muted-foreground',
    value: '',
  },
  success: {
    card: 'kpi-card-success',
    icon: 'text-success',
    value: 'text-success',
  },
  danger: {
    card: 'kpi-card-danger',
    icon: 'text-destructive',
    value: 'text-destructive',
  },
  warning: {
    card: 'kpi-card-warning',
    icon: 'text-warning',
    value: 'text-warning',
  },
  primary: {
    card: 'kpi-card-primary',
    icon: 'text-primary',
    value: 'text-primary',
  },
  info: {
    card: '',
    icon: 'text-info',
    value: 'text-info',
  },
};

export function KPICard({
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
        'kpi-card transition-all duration-200',
        styles.card,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]'
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm truncate pr-2">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn('h-4 w-4 shrink-0', styles.icon)} />}
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="h-7 w-20 bg-muted animate-pulse rounded sm:h-8 sm:w-24" />
        ) : (
          <div className={cn(
            'text-lg font-bold sm:text-xl md:text-2xl truncate',
            styles.value
          )}>
            {value}
          </div>
        )}
        {(change || subtitle) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            {change && (
              <span className={cn(
                'text-[10px] font-medium sm:text-xs',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {change}
              </span>
            )}
            {subtitle && (
              <span className="text-[10px] text-muted-foreground sm:text-xs truncate">
                {subtitle}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'grid-cols-1 xs:grid-cols-2',
    3: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-1 xs:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-3 sm:gap-4', gridCols[columns])}>
      {children}
    </div>
  );
}
