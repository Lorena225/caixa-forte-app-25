import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronDown, User, LogOut, Settings, Bell, Sparkles } from 'lucide-react';
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
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // TODO: Implement global search
      console.log('Searching for:', searchValue);
    }
  };

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'US';

  const avatarColor = user?.email ? generateAvatarColor(user.email) : 'bg-primary';

  return (
    <header 
      className="fixed top-0 right-0 left-0 z-50 h-14 sm:h-16 border-b border-gray-200 bg-white shadow-sm"
      role="banner"
      aria-label="Barra de navegação principal"
    >
      <div className="flex h-full items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6">
        {/* Logo (mobile) + Desktop offset for sidebar */}
        <div className="flex items-center gap-2 sm:gap-3 md:ml-64">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden ml-10 sm:ml-12">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
          </div>

          {/* Search - Desktop */}
          <form 
            onSubmit={handleSearch} 
            className="hidden md:flex flex-1 max-w-xl"
            role="search"
            aria-label="Busca global"
          >
            <div className="relative w-full">
              <Search 
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" 
                aria-hidden="true"
              />
              <input
                id="search"
                type="search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar produtos, clientes, vendas..."
                aria-label="Buscar produtos, clientes, vendas"
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-lg text-sm',
                  'bg-gray-50 border border-gray-200 text-gray-700',
                  'placeholder:text-gray-400',
                  'transition-all duration-200',
                  'hover:border-gray-300 hover:bg-white hover:shadow-sm',
                  'focus:border-primary focus:border-2 focus:bg-white focus:shadow-focus focus:outline-none',
                  'focus-visible:outline-none focus-visible:ring-0'
                )}
              />
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3" role="group" aria-label="Ações rápidas">
          {/* Novo Registro Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className={cn(
                  'gap-1 sm:gap-2 h-9 sm:h-10 px-2.5 sm:px-4 rounded-lg font-semibold text-xs sm:text-sm',
                  'bg-primary text-white',
                  'hover:bg-primary-dark hover:shadow-md',
                  'active:bg-[hsl(210,100%,26%)]',
                  'transition-all duration-200',
                  'min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0'
                )}
                aria-label="Criar novo registro"
                aria-haspopup="menu"
              >
                <Plus className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
                <span className="hidden sm:inline">Novo Registro</span>
                <ChevronDown className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg">
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
            <Bell className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
            <span 
              className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 flex h-4 w-4 sm:h-[18px] sm:w-[18px] items-center justify-center rounded-full bg-destructive text-[9px] sm:text-[10px] font-bold text-white"
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
                  'h-9 w-9 sm:h-10 sm:w-10 border-2 border-gray-200 transition-all duration-200',
                  'hover:border-primary hover:shadow-md'
                )}>
                  <AvatarImage src="" alt={user?.email || 'User'} />
                  <AvatarFallback className={cn(avatarColor, 'text-white font-semibold text-xs sm:text-sm')}>
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg">
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
