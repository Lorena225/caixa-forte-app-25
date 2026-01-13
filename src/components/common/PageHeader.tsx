import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: ReactNode;
  };
  children?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, action, children, className }: PageHeaderProps) {
  return (
    <div className={cn(
      'flex flex-col gap-3 pb-4 sm:pb-6',
      'md:flex-row md:items-center md:justify-between',
      className
    )}>
      {/* Title Section */}
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold tracking-tight md:text-2xl truncate">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2 md:line-clamp-1">
            {description}
          </p>
        )}
      </div>
      
      {/* Actions Section */}
      {(children || action) && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {children}
          {action && (
            <Button onClick={action.onClick} size="sm" className="gap-2">
              {action.icon || <Plus className="h-4 w-4" />}
              <span className="hidden xs:inline">{action.label}</span>
              <span className="xs:hidden">Novo</span>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
