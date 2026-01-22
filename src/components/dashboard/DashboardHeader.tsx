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
      'pb-6 mb-8 border-b border-gray-200',
      className
    )}>
      {/* Left Section - Greeting */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[32px] font-bold text-gray-900 leading-[1.2] tracking-tight">
          Bem-vindo, {userName}
        </h1>
        <p className="text-sm text-gray-500 leading-[1.5]">
          {companyName ? `${companyName} • ${periodLabel}` : periodLabel}
        </p>
      </div>

      {/* Right Section - Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Period Selector */}
        <Select value={periodType} onValueChange={(v) => onPeriodChange(v as PeriodType)}>
          <SelectTrigger 
            className="w-[160px] h-10 px-3 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:border-gray-300 hover:bg-gray-50 focus:border-primary focus:ring-2 focus:ring-primary/10"
            aria-label="Selecionar período"
          >
            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-lg z-[100]">
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
            <SelectItem value="quarter">Últimos 3 Meses</SelectItem>
            <SelectItem value="year">Este Ano</SelectItem>
            <SelectItem value="custom">Período Customizado</SelectItem>
          </SelectContent>
        </Select>

        {/* Auto-refresh Toggle */}
        <button 
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-lg border cursor-pointer transition-all',
            autoRefresh 
              ? 'bg-blue-50 border-primary text-primary' 
              : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50'
          )}
          onClick={() => onAutoRefreshChange(!autoRefresh)}
          title="Auto-atualizar a cada 5 minutos"
          aria-label={autoRefresh ? 'Desativar auto-atualização' : 'Ativar auto-atualização'}
        >
          <RefreshCw className={cn('h-4 w-4', autoRefresh && 'animate-spin')} style={{ animationDuration: '3s' }} />
        </button>

        {/* Manual Refresh Button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'w-10 h-10 rounded-lg text-gray-400 hover:text-primary hover:bg-gray-50',
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
          <div className="flex items-center gap-1.5 text-xs text-gray-400 px-2">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(lastRefresh, 'HH:mm', { locale: ptBR })}</span>
          </div>
        )}

        {/* Edit Dashboard Button */}
        {onEditDashboard && (
          <Button
            variant="outline"
            size="sm"
            className="h-10 px-4 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-gray-300 hover:bg-gray-50"
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
