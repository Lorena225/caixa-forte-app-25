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
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={cn('h-4 w-4', styles.icon)} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-8 w-24 bg-muted animate-pulse rounded" />
        ) : (
          <div className={cn('text-2xl font-bold', styles.value)}>
            {value}
          </div>
        )}
        {(change || subtitle) && (
          <div className="flex items-center gap-2 mt-1">
            {change && (
              <span className={cn(
                'text-xs font-medium',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-destructive',
                trend === 'neutral' && 'text-muted-foreground'
              )}>
                {change}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-muted-foreground">
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
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
    5: 'md:grid-cols-3 lg:grid-cols-5',
    6: 'md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns])}>
      {children}
    </div>
  );
}
