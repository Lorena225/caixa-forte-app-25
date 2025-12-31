import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  FileText,
  Target,
  Users,
  Building2,
  CreditCard,
  FolderTree,
  Settings,
  LogOut,
  ChevronDown,
  Link2,
  BookOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: BookOpen, label: 'Lançamentos', href: '/lancamentos' },
  { icon: ArrowDownCircle, label: 'Contas a Receber', href: '/contas-receber' },
  { icon: ArrowUpCircle, label: 'Contas a Pagar', href: '/contas-pagar' },
  { icon: Wallet, label: 'Fluxo de Caixa', href: '/fluxo-caixa' },
  { icon: FileText, label: 'DRE', href: '/dre' },
  { icon: Target, label: 'Metas', href: '/metas' },
  { icon: CreditCard, label: 'Cartões', href: '/cartoes' },
  { icon: Link2, label: 'Integrações', href: '/integracoes' },
];

const cadastros = [
  { icon: FolderTree, label: 'Plano de Contas', href: '/cadastros/plano-contas' },
  { icon: Building2, label: 'Centros de Custo', href: '/cadastros/centros-custo' },
  { icon: Users, label: 'Clientes/Fornecedores', href: '/cadastros/clientes-fornecedores' },
  { icon: Wallet, label: 'Contas/Cartões', href: '/cadastros/carteiras' },
];

export function Sidebar() {
  const location = useLocation();
  const { currentCompany, companies, setCurrentCompany, signOut, user } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-sidebar-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-sidebar-foreground truncate">
              Financeiro
            </h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 text-xs text-sidebar-foreground/70 hover:text-sidebar-foreground">
                  <span className="truncate max-w-[120px]">{currentCompany?.name || 'Selecionar'}</span>
                  <ChevronDown className="h-3 w-3" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {companies.map((company) => (
                  <DropdownMenuItem
                    key={company.id}
                    onClick={() => setCurrentCompany(company)}
                  >
                    {company.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="pt-4">
            <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
              Cadastros
            </p>
            {cadastros.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  location.pathname === item.href
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              onClick={signOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
