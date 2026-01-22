import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Zap,
  Wallet,
  FileText,
  Ticket,
  ClipboardList,
  LucideIcon,
} from 'lucide-react';

interface QuickAction {
  icon: LucideIcon;
  label: string;
  route: string;
}

const defaultActions: QuickAction[] = [
  { icon: Wallet, label: 'Lançar Conta', route: '/lancamentos' },
  { icon: FileText, label: 'Emitir NF-e', route: '/fiscal/nfe' },
  { icon: Ticket, label: 'Gerar Boleto', route: '/cobranca/boletos' },
  { icon: ClipboardList, label: 'Novo Orçamento', route: '/vendas/orcamentos' },
];

interface QuickActionsPanelProps {
  actions?: QuickAction[];
  className?: string;
}

export const QuickActionsPanel = memo(function QuickActionsPanel({ 
  actions = defaultActions,
  className 
}: QuickActionsPanelProps) {
  const navigate = useNavigate();

  return (
    <Card className={cn(
      'bg-white border border-border rounded-xl',
      'shadow-xs hover:shadow-md transition-shadow',
      'min-h-[240px]',
      className
    )}>
      <CardHeader className="flex flex-row items-center gap-3 pb-4 mb-4 border-b border-border">
        <Zap className="h-5 w-5 text-warning" />
        <h3 className="text-base font-semibold text-foreground">
          Ações Rápidas
        </h3>
      </CardHeader>

      <CardContent className="pt-0 space-y-2.5">
        {actions.map((action, index) => (
          <Button
            key={index}
            variant="outline"
            className={cn(
              'w-full h-10 justify-start gap-2.5 px-4',
              'bg-muted/50 border-border rounded-lg',
              'text-sm font-medium text-muted-foreground',
              'transition-all duration-200',
              'hover:bg-muted hover:border-muted-foreground/20 hover:text-foreground',
              'active:bg-primary/10 active:border-primary active:text-primary'
            )}
            onClick={() => navigate(action.route)}
          >
            <action.icon className="h-4 w-4 shrink-0" />
            {action.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
});

QuickActionsPanel.displayName = 'QuickActionsPanel';
