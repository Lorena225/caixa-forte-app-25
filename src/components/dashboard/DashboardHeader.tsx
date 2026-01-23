import { memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    <div className={cn('mb-6', className)}>
      {/* Title and Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Painel Executivo
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Olá, {userName}! {companyName && <span className="text-primary font-medium">• {companyName}</span>}
          </p>
        </div>

        {/* Period and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <Select value={periodType} onValueChange={(value) => onPeriodChange(value as PeriodType)}>
            <SelectTrigger className="w-[140px] h-9 bg-card border-border text-sm">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="week">Esta Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Trimestre</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
            </SelectContent>
          </Select>

          {/* Auto Refresh Toggle */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
            <Switch
              id="auto-refresh"
              checked={autoRefresh}
              onCheckedChange={onAutoRefreshChange}
              className="scale-90"
            />
            <Label htmlFor="auto-refresh" className="text-xs text-muted-foreground cursor-pointer">
              Auto
            </Label>
          </div>

          {/* Refresh Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-9 w-9 p-0 border-border"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Atualizar dados</p>
              {lastRefresh && (
                <p className="text-xs text-muted-foreground">
                  Última: {format(lastRefresh, 'HH:mm', { locale: ptBR })}
                </p>
              )}
            </TooltipContent>
          </Tooltip>

          {/* Edit Dashboard Button */}
          {onEditDashboard && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditDashboard}
              className="h-9 gap-1.5 border-border"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          )}
        </div>
      </div>

      {/* Period Label Badge */}
      <div className="flex items-center gap-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
          <Clock className="h-3.5 w-3.5" />
          {periodLabel}
        </div>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
