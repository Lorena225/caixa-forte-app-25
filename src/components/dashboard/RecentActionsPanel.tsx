import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ClipboardList, Check, ChevronRight } from 'lucide-react';
import { showDevelopmentToast } from '@/utils/devFeedback';

interface RecentAction {
  id: string;
  description: string;
  timestamp: string;
  route?: string;
}

interface RecentActionsPanelProps {
  actions?: RecentAction[];
  className?: string;
}

const defaultActions: RecentAction[] = [
  { id: '1', description: 'Conciliação Bancária', timestamp: '2 horas atrás', route: '/tesouraria/conciliacao' },
  { id: '2', description: 'Folha de Pagamento', timestamp: '5 horas atrás' },
  { id: '3', description: 'Backup Automático', timestamp: '1 dia atrás', route: '/admin/backup' },
];

export const RecentActionsPanel = memo(function RecentActionsPanel({ 
  actions = defaultActions,
  className 
}: RecentActionsPanelProps) {
  const navigate = useNavigate();

  const handleActionClick = (action: RecentAction) => {
    if (action.route) {
      navigate(action.route);
    } else {
      showDevelopmentToast(action.description);
    }
  };

  return (
    <Card className={cn(
      'bg-white border border-border rounded-xl',
      'shadow-xs hover:shadow-md transition-shadow',
      'min-h-[240px]',
      className
    )}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4 mb-4 border-b border-border">
        <ClipboardList className="h-5 w-5 text-primary" />
        <h3 className="text-base font-semibold text-foreground">
          Últimas Ações
        </h3>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => handleActionClick(action)}
            className="w-full flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg border-b border-border/50 last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer text-left group"
          >
            {/* Check Icon */}
            <div className="w-6 h-6 rounded-full bg-success/10 flex items-center justify-center shrink-0">
              <Check className="h-3.5 w-3.5 text-success font-bold" />
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground leading-5 group-hover:text-primary transition-colors">
                {action.description}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {action.timestamp}
              </p>
            </div>

            {/* Arrow */}
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-1" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
});

RecentActionsPanel.displayName = 'RecentActionsPanel';
