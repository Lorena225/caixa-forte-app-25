import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, User, LogOut, Settings, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { BrandLogo } from '@/components/common/BrandLogo';
import { UnifiedHelpPanel } from '@/components/common/UnifiedHelpPanel';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { cn } from '@/lib/utils';

const novoRegistroOptions = [
  { key: 'venda', label: 'Nova Venda', route: '/vendas/nova', icon: '🛒' },
  { key: 'produto', label: 'Novo Produto', route: '/cadastros/produtos', icon: '📦' },
  { key: 'cliente', label: 'Novo Cliente', route: '/cadastros/clientes-fornecedores', icon: '👤' },
  { key: 'pagar', label: 'Conta a Pagar', route: '/ap', icon: '💸' },
  { key: 'receber', label: 'Conta a Receber', route: '/ar', icon: '💰' },
  { key: 'pedido', label: 'Pedido de Compra', route: '/compras/pedidos', icon: '📋' },
];

// Generate a consistent color based on user email
function generateAvatarColor(email: string): string {
  const colors = [
    'bg-primary',
    'bg-menu-operacoes',
    'bg-menu-catalogo',
    'bg-menu-financeiro',
    'bg-menu-ia',
    'bg-menu-servicos',
    'bg-menu-integracoes',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const Header = memo(function Header() {
  const navigate = useNavigate();
  const { user, signOut, currentCompany } = useAuth();

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  const avatarColor = user?.email ? generateAvatarColor(user.email) : 'bg-primary';

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border bg-card shadow-sm"
      role="banner"
      aria-label="Barra de navegação principal"
    >
      <div className="flex h-full items-center px-4">
        {/* Left Section - Logo fixo na extremidade */}
        <div className="flex items-center gap-4 shrink-0">
          {/* App Logo */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer" 
            onClick={() => navigate('/')}
            role="button"
            aria-label="Ir para página inicial"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-md">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="hidden sm:block text-lg font-bold text-foreground tracking-tight">
              Caixa Forte
            </span>
          </div>
          
          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-border" />
          
          {/* Brand Logo with Company Selector */}
          <div className="hidden md:block">
            <BrandLogo />
          </div>
        </div>

        {/* Center Section - Global Search */}
        <div className="flex-1 flex justify-center px-4 md:px-8">
          <div className="hidden sm:block w-full max-w-lg">
            <GlobalSearch className="w-full" />
          </div>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" role="group" aria-label="Ações rápidas">
          {/* Mobile Search Button */}
          <div className="sm:hidden">
            <GlobalSearch />
          </div>

          {/* Novo Registro Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm"
                className={cn(
                  'gap-1.5 h-9 px-3 rounded-lg font-semibold text-sm',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 hover:shadow-md',
                  'active:scale-[0.98]',
                  'transition-all duration-200'
                )}
                aria-label="Criar novo registro"
                aria-haspopup="menu"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span className="hidden md:inline">Novo</span>
                <ChevronDown className="h-3.5 w-3.5 hidden sm:block opacity-70" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg z-[100]">
              <DropdownMenuLabel className="text-foreground font-semibold">Criar novo</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              {novoRegistroOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => navigate(option.route)}
                  className="gap-3 cursor-pointer text-foreground hover:bg-muted focus:bg-muted min-h-[44px]"
                >
                  <span aria-hidden="true" className="text-base">{option.icon}</span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Divider */}
          <div className="hidden sm:block h-7 w-px bg-border mx-1" />

          {/* Action Icons Group */}
          <div className="flex items-center gap-0.5">
            <NotificationCenter />
            <UnifiedHelpPanel />
          </div>

          {/* Divider before Avatar */}
          <div className="hidden sm:block h-7 w-px bg-border mx-1" />

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 rounded-full p-0 hover:bg-transparent"
                aria-label={`Menu do usuário: ${user?.email || 'Usuário'}`}
                aria-haspopup="menu"
              >
                <Avatar className={cn(
                  'h-9 w-9 border-2 border-border transition-all duration-200',
                  'hover:border-primary hover:shadow-md hover:scale-105'
                )}>
                  <AvatarImage src="" alt={user?.email || 'User'} />
                  <AvatarFallback className={cn(avatarColor, 'text-primary-foreground font-semibold text-sm')}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-card border-border shadow-lg z-[100]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-foreground leading-none truncate">{user?.email}</p>
                  {currentCompany && (
                    <p className="text-xs text-muted-foreground truncate">{currentCompany.name}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={() => navigate('/admin')} 
                className="gap-2 cursor-pointer text-foreground hover:bg-muted focus:bg-muted min-h-[44px]"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/admin/users')} 
                className="gap-2 cursor-pointer text-foreground hover:bg-muted focus:bg-muted min-h-[44px]"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem 
                onClick={signOut} 
                className="gap-2 cursor-pointer text-destructive hover:bg-destructive/10 focus:bg-destructive/10 min-h-[44px]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
});

export default Header;
