import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Plus, FileSpreadsheet, Inbox, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateAction {
  label: string;
  route: string;
  icon: 'Upload' | 'Plus' | 'FileSpreadsheet' | 'Inbox';
}

interface EmptyStateProps {
  title?: string;
  description?: string;
  actions?: EmptyStateAction[];
  icon?: ReactNode;
  className?: string;
}

const iconMap = {
  Upload,
  Plus,
  FileSpreadsheet,
  Inbox,
};

const defaultActions: EmptyStateAction[] = [
  { label: 'Importar extrato', route: '/importar-exportar?tab=extrato', icon: 'Upload' },
  { label: 'Criar título (AP/AR)', route: '/lancamentos?action=new', icon: 'Plus' },
  { label: 'Importar planilha', route: '/importar-exportar?tab=planilhas', icon: 'FileSpreadsheet' },
];

export function EmptyState({
  title = 'Sem dados no período',
  description = 'Sem movimentações ou cadastros suficientes no período selecionado. Você pode importar extrato, criar títulos ou importar planilha.',
  actions = defaultActions,
  icon,
  className,
}: EmptyStateProps) {
  const navigate = useNavigate();

  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 rounded-full bg-muted p-4">
          {icon || <FileQuestion className="h-8 w-8 text-muted-foreground" />}
        </div>
        <h3 className="mb-2 text-lg font-semibold">{title}</h3>
        <p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
        <div className="flex flex-wrap justify-center gap-3">
          {actions.map((action) => {
            const Icon = iconMap[action.icon];
            return (
              <Button
                key={action.route}
                variant="outline"
                onClick={() => navigate(action.route)}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {action.label}
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyTableState({
  title = 'Nenhum registro encontrado',
  description = 'Não há registros para exibir com os filtros aplicados.',
  actions,
}: EmptyStateProps) {
  return (
    <EmptyState
      title={title}
      description={description}
      actions={actions}
      icon={<Inbox className="h-8 w-8 text-muted-foreground" />}
    />
  );
}
