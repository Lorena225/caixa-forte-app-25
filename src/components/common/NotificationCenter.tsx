import { memo, useState } from 'react';
import { Bell, CheckCheck, X, AlertTriangle, Info, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type NotificationType = 'info' | 'warning' | 'success' | 'alert';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  action?: {
    label: string;
    route: string;
  };
}

interface NotificationCenterProps {
  className?: string;
}

// Mock notifications for demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Fatura vencendo hoje',
    message: 'A fatura #1234 do fornecedor ABC vence hoje. Valor: R$ 5.430,00',
    timestamp: new Date(),
    isRead: false,
    action: { label: 'Ver fatura', route: '/ap/1234' },
  },
  {
    id: '2',
    type: 'success',
    title: 'Pagamento confirmado',
    message: 'O pagamento de R$ 12.500,00 foi confirmado pelo banco.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isRead: false,
  },
  {
    id: '3',
    type: 'warning',
    title: 'Estoque baixo',
    message: '3 produtos estão com estoque abaixo do mínimo.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isRead: true,
    action: { label: 'Ver produtos', route: '/cadastros/produtos' },
  },
  {
    id: '4',
    type: 'info',
    title: 'Relatório disponível',
    message: 'O relatório mensal de vendas está pronto.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isRead: true,
  },
];

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  info: <Info className="h-4 w-4" />,
  warning: <AlertTriangle className="h-4 w-4" />,
  success: <TrendingUp className="h-4 w-4" />,
  alert: <Bell className="h-4 w-4" />,
};

const notificationColors: Record<NotificationType, string> = {
  info: 'bg-primary/10 text-primary',
  warning: 'bg-amber-500/10 text-amber-600',
  success: 'bg-emerald-500/10 text-emerald-600',
  alert: 'bg-destructive/10 text-destructive',
};

export const NotificationCenter = memo(function NotificationCenter({ className }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-10 w-10 min-w-[44px] min-h-[44px] rounded-full',
            'text-muted-foreground hover:text-primary hover:bg-muted/50',
            'transition-all duration-200',
            className
          )}
          aria-label={`Notificações${unreadCount > 0 ? ` (${unreadCount} não lidas)` : ''}`}
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              className={cn(
                'absolute -top-0.5 -right-0.5 flex items-center justify-center',
                'h-5 w-5 rounded-full bg-destructive text-destructive-foreground',
                'text-[10px] font-bold animate-in zoom-in-50'
              )}
              aria-hidden="true"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 bg-card border-border shadow-xl z-[100] p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <DropdownMenuLabel className="text-foreground font-semibold p-0">
            Notificações
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-destructive/10 text-destructive">
                {unreadCount} nova{unreadCount > 1 ? 's' : ''}
              </span>
            )}
          </DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-8 text-xs text-primary hover:text-primary hover:bg-primary/10"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <ScrollArea className="max-h-[400px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'flex gap-3 px-4 py-3 hover:bg-muted/50 transition-colors cursor-pointer group',
                    !notification.isRead && 'bg-primary/5'
                  )}
                  onClick={() => markAsRead(notification.id)}
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0',
                      notificationColors[notification.type]
                    )}
                  >
                    {notificationIcons[notification.type]}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm font-medium text-foreground truncate',
                        !notification.isRead && 'font-semibold'
                      )}>
                        {notification.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {notification.message}
                    </p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(notification.timestamp, { addSuffix: true, locale: ptBR })}
                      </span>
                      {notification.action && (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = notification.action!.route;
                          }}
                        >
                          {notification.action.label}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!notification.isRead && (
                    <div className="flex-shrink-0 self-center">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <DropdownMenuSeparator className="m-0" />
        <div className="p-2">
          <Button
            variant="ghost"
            className="w-full text-sm text-primary hover:text-primary hover:bg-primary/10"
            onClick={() => {
              setIsOpen(false);
              window.location.href = '/notificacoes';
            }}
          >
            Ver todas as notificações
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

export default NotificationCenter;
