import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChevronDown, User, LogOut, Settings, Bell } from 'lucide-react';
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
      className="fixed top-0 right-0 left-0 z-50 h-16 border-b border-gray-200 bg-white"
      role="banner"
      aria-label="Barra de navegação principal"
    >
      <div className="flex h-full items-center justify-between px-4 md:px-6">
        {/* Left Section - Brand Logo */}
        <div className="flex items-center gap-4 md:ml-64">
          {/* Mobile hamburger space */}
          <div className="w-10 md:hidden" />
          
          {/* Brand Logo with Company Selector */}
          <BrandLogo />
        </div>

        {/* Center Section - Breadcrumb (optional, empty for now) */}
        <div className="hidden lg:flex flex-1 justify-center">
          {/* Reserved for breadcrumbs */}
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-2 sm:gap-3" role="group" aria-label="Ações rápidas">
          {/* Novo Registro Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className={cn(
                  'gap-1 sm:gap-2 h-10 px-3 sm:px-4 rounded-lg font-semibold text-sm',
                  'bg-primary text-white',
                  'hover:bg-primary-dark hover:shadow-md',
                  'active:bg-[hsl(210,100%,26%)]',
                  'transition-all duration-200',
                  'min-w-[44px] min-h-[44px]'
                )}
                aria-label="Criar novo registro"
                aria-haspopup="menu"
              >
                <Plus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                <span className="hidden sm:inline">Novo Registro</span>
                <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg z-[100]">
              <DropdownMenuLabel className="text-gray-700">Criar novo</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              {novoRegistroOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => navigate(option.route)}
                  className="gap-3 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 min-h-[44px]"
                >
                  <span aria-hidden="true">{option.icon}</span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-10 w-10 min-w-[44px] min-h-[44px] rounded-lg text-gray-500 hover:text-primary hover:bg-gray-50 transition-colors duration-200"
            aria-label="Notificações (3 novas)"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            <span 
              className="absolute -top-1 -right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              3
            </span>
          </Button>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="relative h-10 w-10 min-w-[44px] min-h-[44px] rounded-full p-0 hover:bg-transparent"
                aria-label={`Menu do usuário: ${user?.email || 'Usuário'}`}
                aria-haspopup="menu"
              >
                <Avatar className={cn(
                  'h-10 w-10 border-2 border-gray-200 transition-all duration-200',
                  'hover:border-primary hover:shadow-md'
                )}>
                  <AvatarImage src="" alt={user?.email || 'User'} />
                  <AvatarFallback className={cn(avatarColor, 'text-white font-semibold text-sm')}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg z-[100]">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold text-gray-800 leading-none">{user?.email}</p>
                  {currentCompany && (
                    <p className="text-xs text-gray-500">{currentCompany.name}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem 
                onClick={() => navigate('/admin')} 
                className="gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 min-h-[44px]"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/admin/users')} 
                className="gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50 min-h-[44px]"
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem 
                onClick={signOut} 
                className="gap-2 cursor-pointer text-destructive hover:bg-destructive-light hover:text-destructive focus:bg-destructive-light min-h-[44px]"
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
