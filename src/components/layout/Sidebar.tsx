import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebar } from '@/contexts/SidebarContext';
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
  ChevronLeft,
  ChevronRight,
  Link2,
  BookOpen,
  FileSpreadsheet,
  Bot,
  MessageSquare,
  Zap,
  Inbox,
  BarChart3,
  PieChart,
  TrendingUp,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: BookOpen, label: 'Lançamentos', href: '/lancamentos' },
  { icon: ArrowDownCircle, label: 'Contas a Receber', href: '/contas-receber' },
  { icon: ArrowUpCircle, label: 'Contas a Pagar', href: '/contas-pagar' },
  { icon: Wallet, label: 'Fluxo de Caixa', href: '/fluxo-caixa' },
  { icon: FileText, label: 'DRE', href: '/dre' },
  { icon: Target, label: 'Metas', href: '/metas' },
  { icon: CreditCard, label: 'Cartões', href: '/cartoes' },
];

const dashboards = [
  { icon: BarChart3, label: 'Executivo', href: '/dashboards/executive' },
  { icon: Wallet, label: 'Fluxo de Caixa', href: '/dashboards/cashflow' },
  { icon: ArrowDownCircle, label: 'Contas a Receber', href: '/dashboards/ar' },
  { icon: ArrowUpCircle, label: 'Contas a Pagar', href: '/dashboards/ap' },
  { icon: Target, label: 'Orçamento', href: '/dashboards/budget' },
];

const reports = [
  { icon: PieChart, label: 'Relatórios', href: '/reports' },
  { icon: TrendingUp, label: 'Drill-down', href: '/reports/drilldown' },
];

const autopilot = [
  { icon: Bot, label: 'IA Autopilot', href: '/autopilot/pendencias' },
  { icon: MessageSquare, label: 'WhatsApp', href: '/autopilot/whatsapp' },
  { icon: Zap, label: 'Regras', href: '/autopilot/regras' },
  { icon: Inbox, label: 'Inbox', href: '/autopilot/inbox' },
];

const integracoes = [
  { icon: Link2, label: 'Integrações', href: '/integracoes' },
  { icon: Bot, label: 'IA (ChatGPT)', href: '/integracoes/ia' },
  { icon: FileSpreadsheet, label: 'Importar/Exportar', href: '/importar-exportar' },
];

const cadastros = [
  { icon: FolderTree, label: 'Plano de Contas', href: '/cadastros/plano-contas' },
  { icon: Building2, label: 'Centros de Custo', href: '/cadastros/centros-custo' },
  { icon: Users, label: 'Clientes/Fornecedores', href: '/cadastros/clientes-fornecedores' },
  { icon: Wallet, label: 'Contas/Cartões', href: '/cadastros/carteiras' },
  { icon: Settings, label: 'Dimensões', href: '/cadastros/dimensoes' },
];

const adminItems = [
  { icon: Settings, label: 'Configurações', href: '/admin' },
];

interface NavLinkProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}

function NavLink({ href, icon: Icon, label, isActive, collapsed }: NavLinkProps) {
  const linkContent = (
    <Link
      to={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-2',
        isActive
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return linkContent;
}

export function Sidebar() {
  const location = useLocation();
  const { currentCompany, companies, setCurrentCompany, signOut, user } = useAuth();
  const { collapsed, toggle } = useSidebar();

  const isActive = (href: string, exact = true) =>
    exact ? location.pathname === href : location.pathname.startsWith(href);

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className={cn(
          'flex h-16 items-center border-b border-sidebar-border',
          collapsed ? 'justify-center px-2' : 'gap-3 px-4'
        )}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          {!collapsed && (
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
          )}
        </div>

        {/* Collapse button */}
        <div className={cn('p-2', collapsed ? 'flex justify-center' : 'flex justify-end')}>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-8 w-8 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Dashboards
              </p>
            )}
            {dashboards.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Relatórios
              </p>
            )}
            {reports.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href, false)}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                IA Autopilot
              </p>
            )}
            {autopilot.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href, false)}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Integrações
              </p>
            )}
            {integracoes.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href) || location.pathname.startsWith(item.href + '/')}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Cadastros
              </p>
            )}
            {cadastros.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>

          <div className="pt-4">
            {!collapsed && (
              <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
                Administração
              </p>
            )}
            {adminItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                isActive={isActive(item.href) || location.pathname.startsWith(item.href + '/')}
                collapsed={collapsed}
              />
            ))}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-sidebar-border p-2">
          <div className={cn(
            'flex items-center rounded-lg p-2',
            collapsed ? 'justify-center' : 'gap-3'
          )}>
            <div className="h-8 w-8 shrink-0 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
              </div>
            )}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-sidebar-foreground/70 hover:text-sidebar-foreground"
                  onClick={signOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side={collapsed ? 'right' : 'top'}>
                Sair
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
}
