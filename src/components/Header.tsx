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
import { HelpMenu } from '@/components/common/HelpMenu';
import { SmartHelpPanel } from '@/components/common/SmartHelpPanel';
import { NotificationCenter } from '@/components/common/NotificationCenter';
import { GlobalSearch } from '@/components/common/GlobalSearch';
import { useSidebarCollapse } from '@/components/SidebarEnterprise';
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
  const { collapsed } = useSidebarCollapse();

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  const avatarColor = user?.email ? generateAvatarColor(user.email) : 'bg-primary';

  return (
    <header 
      className="fixed top-0 right-0 left-0 z-50 h-16 border-b border-border bg-card shadow-sm"
      role="banner"
      aria-label="Barra de navegação principal"
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left Section - Logo + Brand Logo + Company Selector */}
        <div className={cn(
          'flex items-center gap-3 transition-all duration-300',
          collapsed ? 'md:ml-16' : 'md:ml-[280px]'
        )}>
          {/* Mobile hamburger space */}
          <div className="w-10 md:hidden" />
          
          {/* App Logo - Desktop only */}
          <div className="hidden md:flex items-center gap-2.5 mr-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-sm">
              <Sparkles className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-foreground tracking-tight">Caixa Forte</span>
          </div>
          
          {/* Divider */}
          <div className="hidden md:block h-8 w-px bg-border" />
          
          {/* Brand Logo with Company Selector */}
          <BrandLogo />
        </div>

        {/* Center Section - Global Search (hidden on mobile) */}
        <div className="hidden md:flex flex-1 justify-center max-w-xl mx-4">
          <GlobalSearch className="w-full max-w-md" />
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label="Ações rápidas">
          {/* Mobile Search Button */}
          <div className="md:hidden">
            <GlobalSearch />
          </div>

          {/* Novo Registro Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className={cn(
                  'gap-1.5 h-9 sm:h-10 px-2.5 sm:px-4 rounded-lg font-semibold text-sm',
                  'bg-primary text-primary-foreground',
                  'hover:bg-primary/90 hover:shadow-md',
                  'active:scale-[0.98]',
                  'transition-all duration-200',
                  'min-w-[40px] min-h-[40px] sm:min-w-[44px] sm:min-h-[44px]'
                )}
                aria-label="Criar novo registro"
                aria-haspopup="menu"
              >
                <Plus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                <span className="hidden lg:inline">Novo</span>
                <ChevronDown className="h-3.5 w-3.5 hidden sm:block" aria-hidden="true" />
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
          <div className="hidden sm:block h-6 w-px bg-border mx-1" />

          {/* Notification Center */}
          <NotificationCenter />

          {/* Smart Help Panel - Manual do Usuário */}
          <SmartHelpPanel />

          {/* Help Menu - Suporte */}
          <HelpMenu />

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-9 w-9 sm:h-10 sm:w-10 min-w-[36px] min-h-[36px] sm:min-w-[44px] sm:min-h-[44px] rounded-full p-0 hover:bg-transparent ml-1"
                aria-label={`Menu do usuário: ${user?.email || 'Usuário'}`}
                aria-haspopup="menu"
              >
                <Avatar className={cn(
                  'h-9 w-9 sm:h-10 sm:w-10 border-2 border-border transition-all duration-200',
                  'hover:border-primary hover:shadow-md hover:scale-105'
                )}>
                  <AvatarImage src="" alt={user?.email || 'User'} />
                  <AvatarFallback className={cn(avatarColor, 'text-white font-semibold text-sm')}>
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
