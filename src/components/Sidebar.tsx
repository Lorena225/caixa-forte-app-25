import { memo, useState, createContext, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  DollarSign,
  Settings,
  Menu,
  FileText,
  Users,
  CreditCard,
  Receipt,
  Wallet,
  TrendingUp,
  Calculator,
  PieChart,
  BookOpen,
  Landmark,
  Scale,
  ClipboardList,
  Building2,
  ArrowRightLeft,
  FileCheck,
  Banknote,
  RefreshCw,
  Target,
  RepeatIcon,
  UserCog,
  Upload,
  Bot,
  Brain,
  BellRing,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Gauge,
  Zap,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Sidebar collapse context
interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebarCollapse() {
  const context = useContext(SidebarContext);
  if (!context) {
    return { collapsed: false, setCollapsed: () => {}, toggleCollapsed: () => {} };
  }
  return context;
}

interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  children?: MenuItem[];
  colorClass?: string;
}

// Menu items with category color classes
const menuItems: MenuItem[] = [
  // 1. INÍCIO
  { key: 'inicio', label: 'Início', icon: Home, route: '/', colorClass: 'text-menu-inicio' },

  // 2. FINANCEIRO
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    colorClass: 'text-menu-financeiro',
    children: [
      { key: 'tesouraria', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
      { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
      { key: 'contas-receber', label: 'Contas a Receber', icon: Wallet, route: '/ar' },
      { key: 'contas-pagar', label: 'Contas a Pagar', icon: Receipt, route: '/ap' },
      { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
      { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
      { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
      { key: 'conciliacao', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
      { key: 'lancamentos', label: 'Lançamentos', icon: FileText, route: '/lancamentos' },
      { key: 'dre', label: 'DRE', icon: PieChart, route: '/dre' },
      { key: 'balanco', label: 'Balanço Patrimonial', icon: Scale, route: '/relatorios/balanco' },
      { key: 'centros-custo', label: 'Centros de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
      { key: 'por-empresa', label: 'Gestão por Empresa', icon: Building2, route: '/paineis' },
    ]
  },

  // 3. RH & DP
  {
    key: 'rh',
    label: 'RH & DP',
    icon: UserCog,
    colorClass: 'text-menu-cadastros',
    children: [
      { key: 'colaboradores', label: 'Colaboradores', icon: Users, route: '/hcm/colaboradores' },
      { key: 'folha', label: 'Folha de Pagamento', icon: Banknote, route: '/hcm/folha' },
      { key: 'ponto', label: 'Gestão de Ponto', icon: ClipboardList, route: '/hcm/gestor-ponto' },
      { key: 'holerites', label: 'Holerites', icon: FileText, route: '/hcm/holerites' },
      { key: 'banco-horas', label: 'Banco de Horas', icon: Calculator, route: '/hcm/banco-horas' },
      { key: 'beneficios', label: 'Benefícios', icon: Target, route: '/hcm/beneficios' },
      { key: 'solicitacoes', label: 'Solicitações', icon: ClipboardList, route: '/hcm/solicitacoes' },
      { key: 'portal-colab', label: 'Portal do Colaborador', icon: Users, route: '/hcm/portal' },
    ]
  },

  // 4. CADASTROS
  {
    key: 'cadastros',
    label: 'Cadastros',
    icon: ClipboardList,
    colorClass: 'text-menu-cadastros',
    children: [
      { key: 'clientes-fornecedores', label: 'Clientes / Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
      { key: 'plano-contas', label: 'Plano de Contas', icon: ClipboardList, route: '/cadastros/plano-contas' },
      { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'importar-exportar', label: 'Importar / Exportar', icon: Upload, route: '/importar-exportar' },
    ]
  },

  // 6. IA & AUTOMAÇÃO
  {
    key: 'ia-automacao',
    label: 'IA & Automação',
    icon: Bot,
    colorClass: 'text-menu-ia',
    children: [
      { key: 'ia-cfo', label: 'CFO Virtual', icon: Target, route: '/ia/cfo-virtual' },
      { key: 'ia-analista', label: 'Analista Inteligente', icon: Brain, route: '/ia/analista' },
      { key: 'ia-monitor', label: 'Monitor Financeiro', icon: BellRing, route: '/ia/alertas' },
      { key: 'anomalias', label: 'Monitor de Anomalias', icon: AlertTriangle, route: '/compliance/anomalias' },
      { key: 'ia-whatsapp', label: 'Agente WhatsApp', icon: MessageSquare, route: '/ia/whatsapp' },
      { key: 'ia-mensagens', label: 'Mensagens', icon: BellRing, route: '/autopiloto/caixa-entrada' },
      { key: 'ia-decisoes', label: 'Decisões da IA', icon: Sparkles, route: '/autopiloto/decisoes' },
      { key: 'simulacoes-cenarios', label: 'Simulações & Cenários', icon: Calculator, route: '/financeiro/simulacoes' },
      { key: 'tempo-real', label: 'Finanças Tempo Real', icon: Gauge, route: '/financeiro/tempo-real' },
      { key: 'automacao-rh', label: 'Automação RH', icon: Zap, route: '/autopiloto/regras' },
      { key: 'ia-logs', label: 'Logs & Auditoria', icon: FileText, route: '/ia/logs' },
      { key: 'ia-config', label: 'Configurações de IA', icon: Settings, route: '/ia/configuracoes' },
    ]
  },

  // 7. CONFIGURAÇÕES
  { key: 'configuracoes', label: 'Configurações', icon: Settings, route: '/configuracoes', colorClass: 'text-menu-config' },
];

// Color map for active states using CSS variable classes
const categoryColorMap: Record<string, { bg: string; border: string; text: string }> = {
  inicio: { bg: 'bg-menu-inicio/10', border: 'border-l-menu-inicio', text: 'text-menu-inicio' },
  financeiro: { bg: 'bg-menu-financeiro/10', border: 'border-l-menu-financeiro', text: 'text-menu-financeiro' },
  rh: { bg: 'bg-menu-cadastros/10', border: 'border-l-menu-cadastros', text: 'text-menu-cadastros' },
  contratos: { bg: 'bg-menu-contabil/10', border: 'border-l-menu-contabil', text: 'text-menu-contabil' },
  cadastros: { bg: 'bg-menu-cadastros/10', border: 'border-l-menu-cadastros', text: 'text-menu-cadastros' },
  'ia-automacao': { bg: 'bg-menu-ia/10', border: 'border-l-menu-ia', text: 'text-menu-ia' },
  configuracoes: { bg: 'bg-menu-config/10', border: 'border-l-menu-config', text: 'text-menu-config' },
};

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

const SidebarContent = memo(function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<string[]>(['financeiro']);

  const toggleGroup = (key: string) => {
    if (collapsed) return; // Don't toggle groups when collapsed
    setOpenGroups(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const handleNavigate = (route: string) => {
    navigate(route);
    onNavigate?.();
  };

  const isActive = (route?: string) => route && location.pathname === route;
  const hasActiveChild = (item: MenuItem) => 
    item.children?.some(child => isActive(child.route));

  const getColorClasses = (key: string) => categoryColorMap[key] || categoryColorMap.inicio;

  // Render a menu item with tooltip when collapsed
  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const colors = getColorClasses(item.key);
    const itemActive = isActive(item.route);
    const hasActive = hasActiveChild(item);

    if (item.children && !collapsed) {
      const isOpen = openGroups.includes(item.key);

      return (
        <Collapsible key={item.key} open={isOpen} onOpenChange={() => toggleGroup(item.key)}>
          <CollapsibleTrigger asChild>
            <button className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
              'border-l-4 border-transparent',
              hasActive 
                ? cn(colors.bg, colors.border, colors.text, 'pl-2.5')
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
            )}>
              <item.icon className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-200',
                hasActive ? colors.text : item.colorClass
              )} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <div className="mt-1 space-y-0.5 pl-4">
              {item.children.map((child) => (
                <button
                  key={child.key}
                  onClick={() => child.route && handleNavigate(child.route)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200',
                    isActive(child.route) 
                      ? cn('font-semibold', colors.text, colors.bg)
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  )}
                >
                  <child.icon className={cn(
                    'h-4 w-4 shrink-0',
                    isActive(child.route) ? colors.text : 'text-gray-500'
                  )} />
                  <span className="truncate">{child.label}</span>
                </button>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Collapsed state with children - show tooltip with children
    if (item.children && collapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>
            <button 
              className={cn(
                'flex w-full items-center justify-center rounded-lg p-2.5 transition-all duration-200',
                'border-l-4 border-transparent',
                hasActive 
                  ? cn(colors.bg, colors.border, colors.text)
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-200',
                hasActive ? colors.text : item.colorClass
              )} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="p-0 w-56 bg-card border-border shadow-xl">
            <div className="py-2">
              <div className={cn('px-3 py-2 text-sm font-semibold border-b border-border', colors.text)}>
                {item.label}
              </div>
              <div className="py-1">
                {item.children.map((child) => (
                  <button
                    key={child.key}
                    onClick={() => child.route && handleNavigate(child.route)}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                      isActive(child.route) 
                        ? cn('font-medium', colors.text, colors.bg)
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <child.icon className="h-4 w-4 shrink-0" />
                    <span>{child.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    // Single item (no children)
    if (collapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={() => item.route && handleNavigate(item.route)}
              className={cn(
                'flex w-full items-center justify-center rounded-lg p-2.5 transition-all duration-200',
                'border-l-4 border-transparent',
                itemActive 
                  ? cn(colors.bg, colors.border, colors.text)
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-200',
                itemActive ? colors.text : item.colorClass
              )} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        key={item.key}
        onClick={() => item.route && handleNavigate(item.route)}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
          'border-l-4 border-transparent',
          itemActive 
            ? cn(colors.bg, colors.border, colors.text, 'pl-2.5')
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        <item.icon className={cn(
          'h-5 w-5 shrink-0 transition-colors duration-200',
          itemActive ? colors.text : item.colorClass
        )} />
        <span className="truncate">{item.label}</span>
      </button>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-white">
        {/* Menu Items */}
        <ScrollArea className="flex-1 py-2 sidebar-scroll">
          <div className={cn('space-y-0.5', collapsed ? 'px-1.5' : 'px-2')}>
            {menuItems.map((item) => renderMenuItem(item))}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  );
});

// Storage key for collapsed state
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed(prev => !prev);

  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed, toggleCollapsed }}>
      {/* Mobile Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="fixed left-4 top-4 z-50 h-10 w-10 bg-white shadow-md border border-gray-200 md:hidden hover:bg-gray-50"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 bg-white border-gray-200">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          'fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] border-r border-gray-200 bg-white shadow-sidebar md:block transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn(
            'absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50 transition-colors',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-gray-600" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-gray-600" />
          )}
        </Button>

        <SidebarContent collapsed={collapsed} />
      </aside>
    </SidebarContext.Provider>
  );
}

export default Sidebar;
