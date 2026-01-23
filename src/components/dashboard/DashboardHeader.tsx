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
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl sm:text-[28px] font-bold text-foreground leading-tight tracking-tight">
          Bem-vindo, {userName}
        </h1>
        <p className="text-sm text-muted-foreground leading-normal">
          {companyName ? `${companyName} • ${periodLabel}` : periodLabel}
        </p>
      </div>

      {/* Right Section - Controls */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Period Selector */}
        <Select value={periodType} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
          <SelectTrigger 
            className="w-[140px] sm:w-[160px] h-9 sm:h-10 px-3 bg-card border border-border rounded-lg text-sm text-foreground hover:border-primary/50 hover:bg-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-colors"
            aria-label="Selecionar período"
          >
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border border-border shadow-lg rounded-lg z-[100]">
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
            <SelectItem value="custom">Período Customizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Auto-refresh Toggle */}
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'h-9 w-9 sm:h-10 sm:w-10 rounded-lg transition-all',
            autoRefresh 
              ? 'bg-primary/10 border-primary text-primary hover:bg-primary/20' 
              : 'border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50'
          )}
          onClick={() => onAutoRefreshChange(!autoRefresh)}
          title="Auto-atualizar a cada 5 minutos"
          aria-label={autoRefresh ? 'Desativar auto-atualização' : 'Ativar auto-atualização'}
        >
          <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} style={{ animationDuration: '3s' }} />
        </Button>

        {/* Manual Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-muted-foreground hover:text-primary hover:bg-muted/50',
            isRefreshing && 'animate-spin'
          )}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Atualizar agora"
          aria-label="Atualizar dados"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        {/* Last Update Time */}
        {lastRefresh && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground px-2 py-1 rounded bg-muted/30">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(lastRefresh, 'HH:mm', { locale: ptBR })}</span>
          </div>
        )}

        {/* Edit Dashboard Button */}
        {onEditDashboard && (
          <Button
            variant="outline"
            size="sm"
            className="h-9 sm:h-10 px-3 sm:px-4 border-border text-sm font-medium text-foreground hover:border-primary/50 hover:bg-muted/50 transition-colors"
            onClick={onEditDashboard}
          >
            <Pencil className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
        )}
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
