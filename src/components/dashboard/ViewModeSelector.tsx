import { memo } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Store, FileCheck, Settings2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export type ViewMode = 'executive' | 'operational' | 'controllership' | 'custom';

interface ViewModeConfig {
  id: ViewMode;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
}

export const VIEW_MODES: ViewModeConfig[] = [
  {
    id: 'executive',
    label: 'Visão Executiva (CFO)',
    description: 'KPIs estratégicos e projeções',
    icon: Briefcase,
    color: 'text-violet-600',
    bgGradient: 'from-violet-500/10 to-purple-500/10',
  },
  {
    id: 'operational',
    label: 'Operacional (PDV)',
    description: 'Vendas, estoque e movimentações',
    icon: Store,
    color: 'text-emerald-600',
    bgGradient: 'from-emerald-500/10 to-teal-500/10',
  },
  {
    id: 'controllership',
    label: 'Controladoria',
    description: 'Compliance, aging e DRE',
    icon: FileCheck,
    color: 'text-blue-600',
    bgGradient: 'from-blue-500/10 to-cyan-500/10',
  },
  {
    id: 'custom',
    label: 'Personalizado',
    description: 'Sua configuração customizada',
    icon: Settings2,
    color: 'text-amber-600',
    bgGradient: 'from-amber-500/10 to-orange-500/10',
  },
];

interface ViewModeSelectorProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  className?: string;
}

export const ViewModeSelector = memo(function ViewModeSelector({
  currentMode,
  onModeChange,
  className,
}: ViewModeSelectorProps) {
  const currentConfig = VIEW_MODES.find(m => m.id === currentMode) || VIEW_MODES[0];
  const Icon = currentConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'relative overflow-hidden rounded-xl border-border/50 h-11 px-4',
            'bg-gradient-to-r hover:shadow-md transition-all duration-300',
            currentConfig.bgGradient,
            className
          )}
        >
          <motion.div
            key={currentMode}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2"
          >
            <Icon className={cn('w-4 h-4', currentConfig.color)} />
            <span className="font-medium text-foreground hidden sm:inline">{currentConfig.label}</span>
            <span className="font-medium text-foreground sm:hidden">{currentConfig.label.split(' ')[0]}</span>
          </motion.div>
          <ChevronDown className="w-4 h-4 ml-2 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 p-2 bg-card border border-border shadow-xl z-50">
        {VIEW_MODES.map((mode) => {
          const ModeIcon = mode.icon;
          const isActive = currentMode === mode.id;
          
          return (
            <DropdownMenuItem
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all',
                isActive 
                  ? `bg-gradient-to-r ${mode.bgGradient} border border-border/50` 
                  : 'hover:bg-muted/50'
              )}
            >
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                `bg-gradient-to-br ${mode.bgGradient}`
              )}>
                <ModeIcon className={cn('w-5 h-5', mode.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'font-medium text-sm',
                  isActive ? mode.color : 'text-foreground'
                )}>
                  {mode.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {mode.description}
                </p>
              </div>
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className={cn('w-2 h-2 rounded-full mt-1', mode.color.replace('text-', 'bg-'))}
                />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default ViewModeSelector;
