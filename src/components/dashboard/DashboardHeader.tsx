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
    <div className="flex flex-row h-16 items-center justify-between px-4 py-2 bg-card border-b border-border gap-3 w-full">
      <div className="flex flex-row items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2 pl-1">
          <div className="w-7 h-7 bg-gradient-to-br from-primary to-primary/80 rounded-md flex items-center justify-center text-white font-bold text-xs">CF</div>
          <span className="font-semibold text-foreground text-sm hidden md:inline">Caixa Forte</span>
        </div>
        <button className="p-2 hover:bg-muted/50 rounded-lg transition-all">☰</button>
        <div className="h-8 w-px bg-border/30"></div>
        <button className="px-3 py-1.5 bg-primary text-white rounded-lg font-medium text-sm hover:bg-primary/90 transition-all">ED</button>
      </div>

      <div className="flex-grow max-w-md mx-2">
        <div className="relative">
          <input placeholder="Buscar..." className="w-full px-3 py-2 bg-muted border border-border/50 rounded-lg text-sm placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
        </div>
      </div>

      <div className="flex flex-row items-center gap-2 flex-shrink-0">
        <button className="px-3 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-xs hover:bg-primary/90 transition-all whitespace-nowrap">+ Novo</button>
        <button className="relative p-2 hover:bg-muted/50 rounded-lg transition-all">🔔<span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">2</span></button>
        <button className="p-2 hover:bg-muted/50 rounded-lg transition-all">❓</button>
        <button className="p-2 hover:bg-muted/50 rounded-lg transition-all">
          <div className="w-7 h-7 bg-gradient-to-br from-accent to-accent/80 text-accent-foreground rounded-full flex items-center justify-center font-bold text-xs">LO</div>
        </button>
      </div>
    </div>
  );
});

DashboardHeader.displayName = 'DashboardHeader';
