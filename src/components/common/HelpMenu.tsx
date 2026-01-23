import { memo } from 'react';
import { HelpCircle, BookOpen, MessageCircle, Headphones } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface HelpMenuItem {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
}

interface HelpMenuProps {
  className?: string;
}

export const HelpMenu = memo(function HelpMenu({ className }: HelpMenuProps) {
  const helpItems: HelpMenuItem[] = [
    {
      key: 'docs',
      label: 'Documentação',
      description: 'Guias e tutoriais do sistema',
      icon: <BookOpen className="h-4 w-4" />,
      action: () => window.open('/docs', '_blank'),
    },
    {
      key: 'ticket',
      label: 'Abrir Chamado',
      description: 'Suporte técnico especializado',
      icon: <Headphones className="h-4 w-4" />,
      action: () => window.open('/suporte/novo-chamado', '_self'),
    },
    {
      key: 'chat',
      label: 'Iniciar Chat',
      description: 'Converse com nosso assistente',
      icon: <MessageCircle className="h-4 w-4" />,
      action: () => {
        // Trigger chat widget or navigate to chat
        const event = new CustomEvent('open-support-chat');
        window.dispatchEvent(event);
      },
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-10 w-10 min-w-[44px] min-h-[44px] rounded-full',
            'text-muted-foreground hover:text-primary hover:bg-muted/50',
            'transition-all duration-200',
            'border border-transparent hover:border-border',
            className
          )}
          aria-label="Menu de ajuda"
          aria-haspopup="menu"
        >
          <HelpCircle className="h-5 w-5" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="w-64 bg-card border-border shadow-lg z-[100]"
      >
        <DropdownMenuLabel className="text-foreground font-semibold">
          Como podemos ajudar?
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border" />
        {helpItems.map((item) => (
          <DropdownMenuItem
            key={item.key}
            onClick={item.action}
            className={cn(
              'flex items-start gap-3 cursor-pointer py-3 px-3',
              'text-foreground hover:bg-muted focus:bg-muted',
              'min-h-[52px]'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
              {item.icon}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium">{item.label}</span>
              <span className="text-xs text-muted-foreground">{item.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-border" />
        <div className="px-3 py-2">
          <p className="text-xs text-muted-foreground text-center">
            Pressione <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">?</kbd> para atalhos
          </p>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default HelpMenu;
