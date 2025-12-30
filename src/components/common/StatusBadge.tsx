import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  isOverdue?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  rascunho: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
  lancado: { label: 'Lançado', className: 'bg-warning/10 text-warning border-warning/20' },
  pago: { label: 'Pago', className: 'bg-success/10 text-success border-success/20' },
  cancelado: { label: 'Cancelado', className: 'bg-muted text-muted-foreground line-through' },
};

export function StatusBadge({ status, isOverdue }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.rascunho;
  
  if (isOverdue && status !== 'pago' && status !== 'cancelado') {
    return (
      <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
        Atrasado
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn(config.className)}>
      {config.label}
    </Badge>
  );
}
