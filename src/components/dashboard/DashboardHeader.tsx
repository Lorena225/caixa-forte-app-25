import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Calendar,
  RefreshCw,
  Pencil,
  Clock,
} from 'lucide-react';

type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface DashboardHeaderProps {
  userName: string;
  companyName?: string;
  periodLabel: string;
  periodType: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  autoRefresh: boolean;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefresh: () => void;
  onEditDashboard?: () => void;
  isRefreshing?: boolean;
  lastRefresh?: Date;
  className?: string;
}

export const DashboardHeader = memo(function DashboardHeader({
  userName,
  companyName,
  periodLabel,
  periodType,
  onPeriodChange,
  autoRefresh,
  onAutoRefreshChange,
  onRefresh,
  onEditDashboard,
  isRefreshing = false,
  lastRefresh,
  className,
}: DashboardHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col gap-4 md:flex-row md:items-center md:justify-between',
      'pb-6 mb-8 border-b border-border',
      className
    )}>
      {/* Left Section - Greeting */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-bold text-foreground leading-10 tracking-tight">
          Bem-vindo, {userName}
        </h1>
        <p className="text-sm text-muted-foreground leading-[21px]">
          {companyName ? `${companyName} • ${periodLabel}` : periodLabel}
        </p>
      </div>

      {/* Right Section - Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Selector */}
        <Select value={periodType} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
          <SelectTrigger 
            className="w-[160px] h-10 px-3 bg-background border border-border rounded-md text-sm text-foreground hover:border-muted-foreground/30 hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/10"
            aria-label="Selecionar período"
          >
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-background border border-border shadow-lg rounded-md z-50">
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
            <SelectItem value="custom">Período Customizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Auto-refresh Toggle */}
        <div 
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-md border cursor-pointer transition-all',
            autoRefresh 
              ? 'bg-background border-primary text-primary' 
              : 'bg-background border-border text-muted-foreground hover:border-muted-foreground/30'
          )}
          onClick={() => onAutoRefreshChange(!autoRefresh)}
          title="Auto-atualizar a cada 30 segundos"
        >
          <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} style={{ animationDuration: '3s' }} />
        </div>

        {/* Manual Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'w-10 h-10 text-muted-foreground hover:text-primary',
            isRefreshing && 'animate-spin'
          )}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar agora"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Last Update Time */}
        {lastRefresh && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{format(lastRefresh, 'HH:mm', { locale: ptBR })}</span>
          </div>
        )}

        {/* Edit Dashboard Button */}
        {onEditDashboard && (
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-3 bg-background border border-border rounded-md text-sm text-foreground hover:border-muted-foreground/30 hover:bg-muted/50"
            onClick={onEditDashboard}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        )}
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
