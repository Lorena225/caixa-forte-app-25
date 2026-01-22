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
    <header className="fixed top-0 right-0 left-0 z-50 h-16 border-b border-gray-200 bg-white shadow-sm">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
        {/* Logo (mobile) + Desktop offset for sidebar */}
        <div className="flex items-center gap-3 md:ml-64">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 md:hidden ml-12">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
          </div>

          {/* Search - Desktop */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Buscar produtos, clientes, vendas..."
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-lg text-sm',
                  'bg-gray-50 border border-gray-200 text-gray-700',
                  'placeholder:text-gray-400',
                  'transition-all duration-200',
                  'hover:border-gray-300 hover:bg-white hover:shadow-sm',
                  'focus:border-primary focus:border-2 focus:bg-white focus:shadow-focus focus:outline-none'
                )}
              />
            </div>
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {/* Novo Registro Button with Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                className={cn(
                  'gap-2 h-10 px-4 rounded-lg font-semibold text-sm',
                  'bg-primary text-white',
                  'hover:bg-primary-dark hover:shadow-md',
                  'active:bg-[hsl(210,100%,26%)]',
                  'transition-all duration-200'
                )}
              >
                <Plus className="h-[18px] w-[18px]" />
                <span className="hidden sm:inline">Novo Registro</span>
                <ChevronDown className="h-[18px] w-[18px]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white border-gray-200 shadow-lg">
              <DropdownMenuLabel className="text-gray-700">Criar novo</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-200" />
              {novoRegistroOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => navigate(option.route)}
                  className="gap-3 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50"
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative h-10 w-10 rounded-lg text-gray-500 hover:text-primary hover:bg-gray-50 transition-colors duration-200"
          >
            <Bell className="h-6 w-6" />
            <span className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
              3
            </span>
          </Button>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 hover:bg-transparent">
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
                className="gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => navigate('/admin/users')} 
                className="gap-2 cursor-pointer text-gray-700 hover:bg-gray-50 hover:text-gray-900 focus:bg-gray-50"
              >
                <User className="h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-200" />
              <DropdownMenuItem 
                onClick={signOut} 
                className="gap-2 cursor-pointer text-destructive hover:bg-destructive-light hover:text-destructive focus:bg-destructive-light"
              >
                <LogOut className="h-4 w-4" />
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
