import { memo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronDown, User, LogOut, Settings, Bell, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 z-30 h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between gap-4 px-4 md:px-6">
        {/* Logo (mobile only) */}
        <div className="flex items-center gap-2 md:hidden">
          <div className="ml-12 flex h-8 w-8 items-center justify-center rounded-lg bg-[#0085FF]">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Buscar produtos, clientes, vendas..."
              className="pl-10 bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-[#0085FF]"
            />
          </div>
        </form>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Novo Registro Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-[#0085FF] hover:bg-[#0070DD]">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Registro</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Criar novo</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {novoRegistroOptions.map((option) => (
                <DropdownMenuItem
                  key={option.key}
                  onClick={() => navigate(option.route)}
                  className="gap-3 cursor-pointer"
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              3
            </span>
          </Button>

          {/* User Avatar Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10 border-2 border-[#0085FF]/20">
                  <AvatarImage src="" alt={user?.email || 'User'} />
                  <AvatarFallback className="bg-[#0085FF]/10 text-[#0085FF] font-medium">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.email}</p>
                  {currentCompany && (
                    <p className="text-xs text-muted-foreground">{currentCompany.name}</p>
                  )}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/admin')} className="gap-2 cursor-pointer">
                <Settings className="h-4 w-4" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/users')} className="gap-2 cursor-pointer">
                <User className="h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="gap-2 cursor-pointer text-destructive">
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
