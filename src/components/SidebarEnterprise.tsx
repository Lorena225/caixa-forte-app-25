import { memo, useState, createContext, useContext, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  Star,
  Bot,
  ShoppingCart,
  Package,
  Briefcase,
  DollarSign,
  Boxes,
  BarChart3,
  Plug,
  Settings,
  Menu,
  Sparkles,
  FileText,
  Users,
  CreditCard,
  Truck,
  Receipt,
  Wallet,
  TrendingUp,
  Calculator,
  PieChart,
  Link2,
  BookOpen,
  Landmark,
  FileSpreadsheet,
  Scale,
  ClipboardList,
  Network,
  Building2,
  FolderTree,
  UserCheck,
  ArrowRightLeft,
  FileCheck,
  Banknote,
  RefreshCw,
  Send,
  MessageSquare,
  BellRing,
  Brain,
  Lightbulb,
  Globe,
  Zap,
  AlertTriangle,
  Gauge,
  Coins,
  Target,
  Shield,
  UserCog,
  Key,
  Inbox,
  LayoutGrid,
  RepeatIcon,
  FileBarChart,
  Layers,
  CircleDollarSign,
  Activity,
  Upload,
  Search,
  Eye,
  TrendingDown,
  FolderKanban,
  type LucideIcon,
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
  icon: LucideIcon;
  route?: string;
  children?: MenuItem[];
  colorClass?: string;
  highlight?: boolean;
}

// ============ NOVA ESTRUTURA HIERÁRQUICA ENTERPRISE ============

const menuItems: MenuItem[] = [
  // 1. INÍCIO
  { 
    key: 'inicio', 
    label: 'Início', 
    icon: Home, 
    route: '/', 
    colorClass: 'text-menu-inicio' 
  },
  
  // 2. FAVORITOS
  { 
    key: 'favoritos', 
    label: 'Favoritos', 
    icon: Star, 
    route: '/favoritos', 
    colorClass: 'text-menu-favoritos' 
  },

  // 3. OPERACIONAL
  {
    key: 'operacional',
    label: 'Operacional',
    icon: Activity,
    colorClass: 'text-menu-operacoes',
    children: [
      { key: 'pdv', label: 'PDV', icon: CreditCard, route: '/frente-caixa' },
      { key: 'vendas', label: 'Vendas', icon: ShoppingCart, route: '/vendas/nova' },
      { key: 'crm', label: 'CRM (Dashboard)', icon: Users, route: '/crm' },
      { key: 'crm-pipeline', label: 'CRM — Pipeline', icon: FolderTree, route: '/crm/pipeline' },
      { key: 'crm-leads', label: 'CRM — Leads', icon: Users, route: '/crm/leads' },
      { key: 'crm-comissoes', label: 'CRM — Comissões', icon: DollarSign, route: '/crm/comissoes' },
      { key: 'crm-metas', label: 'CRM — Metas', icon: Target, route: '/crm/metas' },
      { key: 'catalogo-produtos', label: 'Produtos', icon: Package, route: '/cadastros/produtos' },
      { key: 'catalogo-categorias', label: 'Categorias', icon: Boxes, route: '/cadastros/dimensoes' },
      { key: 'catalogo-servicos', label: 'Serviços', icon: Briefcase, route: '/cadastros/servicos' },
      { key: 'inventario', label: 'Inventário', icon: Package, route: '/estoque/inventario' },
      { key: 'movimentacoes', label: 'Movimentações', icon: TrendingUp, route: '/estoque/movimentacoes' },
      { key: 'estrutura-org', label: 'Estrutura Organizacional', icon: Network, route: '/operacional/estrutura' },
      { key: 'centros-custodia', label: 'Centros de Custódia', icon: FolderTree, route: '/operacional/centros-custodia' },
      { key: 'departamentos', label: 'Departamentos', icon: Building2, route: '/operacional/departamentos' },
      { key: 'responsaveis-cc', label: 'Responsáveis por CC', icon: UserCheck, route: '/operacional/responsaveis' },
      { key: 'projetos', label: 'Projetos', icon: FolderKanban, route: '/projetos' },
      { key: 'gestor-ponto', label: 'Gestão de Ponto', icon: ClipboardList, route: '/hcm/gestor-ponto' },
    ]
  },

  // 4. FINANCEIRO
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    colorClass: 'text-menu-financeiro',
    children: [
      // Gestão de Caixa (subgrupo)
      { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
      { key: 'caixa-fisica', label: 'Caixa Física', icon: Banknote, route: '/tesouraria/caixa-fisica' },
      { key: 'tesouraria', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
      { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
      { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      // Contas a Pagar/Receber
      { key: 'contas-receber', label: 'Contas a Receber', icon: TrendingUp, route: '/ar' },
      { key: 'contas-pagar', label: 'Contas a Pagar', icon: TrendingDown, route: '/ap' },
      // Ciclo de Caixa
      { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
      { key: 'conciliacao', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
      { key: 'cnab', label: 'CNAB', icon: Send, route: '/tesouraria/cnab' },
      { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
      // Planejamento
      { key: 'metas-financeiras', label: 'Metas Financeiras', icon: Target, route: '/metas-financeiras' },
      { key: 'orcamento-real', label: 'Orçamento vs Real', icon: Target, route: '/financeiro/orcamento-real' },
      { key: 'rolling-forecast', label: 'Rolling Forecast', icon: TrendingUp, route: '/financeiro/rolling-forecast' },
      { key: 'simulacoes-whatif', label: 'Simulações What-If', icon: Calculator, route: '/financeiro/simulacoes-orcamento' },
      { key: 'contratos-recorrencia', label: 'Contratos & Recorrência', icon: RepeatIcon, route: '/contratos/recorrencia' },
    ]
  },

  // 6. CONTROLADORIA & FISCAL
  {
    key: 'controladoria-fiscal',
    label: 'Controladoria & Fiscal',
    icon: BookOpen,
    colorClass: 'text-menu-contabil',
    children: [
      // Contabilidade
      { key: 'livro-diario', label: 'Livro Diário', icon: BookOpen, route: '/controladoria-livro-diario' },
      { key: 'balanco-patrimonial', label: 'Balanço Patrimonial', icon: Scale, route: '/controladoria-balanco' },
      { key: 'dre', label: 'DRE (Resultado)', icon: PieChart, route: '/controladoria-dre' },
      { key: 'balancete', label: 'Balancete', icon: FileText, route: '/controladoria-balancete' },
      { key: 'lancamentos-contabeis', label: 'Lançamentos Contábeis', icon: FileText, route: '/contabilidade/lancamentos' },
      { key: 'reclassificacao', label: 'Reclassificação', icon: Scale, route: '/contabilidade/reclassificacao' },
      // Fiscal
      { key: 'nfe', label: 'NF-e', icon: FileText, route: '/fiscal/nfe' },
      { key: 'nfce', label: 'NFC-e', icon: Receipt, route: '/fiscal/nfce' },
      { key: 'cupom-fiscal', label: 'Cupom Fiscal', icon: Receipt, route: '/fiscal/cupom-fiscal' },
      { key: 'danfe', label: 'DANFE', icon: FileText, route: '/fiscal/danfe' },
      { key: 'analise-fiscal', label: 'Análise Fiscal', icon: PieChart, route: '/fiscal/analise' },
      { key: 'obrigacoes-fiscais', label: 'Obrigações Fiscais', icon: ClipboardList, route: '/controladoria-obrigacoes' },
      // Auditoria & Compliance
      { key: 'mapeamento-contabil', label: 'Mapeamento Contábil', icon: Network, route: '/controladoria-mapeamento' },
      { key: 'alertas-compliance', label: 'Alertas Compliance', icon: AlertTriangle, route: '/controladoria-alertas' },
      { key: 'auditoria', label: 'Histórico & Auditoria', icon: Shield, route: '/controladoria-auditoria' },
    ]
  },

  // 7. INTELIGÊNCIA (IA) - DESTAQUE ESPECIAL
  {
    key: 'inteligencia-ia',
    label: 'Inteligência (IA)',
    icon: Bot,
    colorClass: 'text-menu-ia',
    highlight: true,
    children: [
      { key: 'cfo-virtual', label: 'CFO Virtual', icon: Brain, route: '/ia/cfo-virtual' },
      { key: 'analista-inteligente', label: 'Analista Inteligente', icon: Sparkles, route: '/ia/analista' },
      { key: 'monitor-anomalias', label: 'Monitor de Anomalias', icon: AlertTriangle, route: '/compliance/anomalias' },
      { key: 'agente-whatsapp', label: 'Agente WhatsApp', icon: MessageSquare, route: '/ia/whatsapp' },
      { key: 'monitor-financeiro', label: 'Monitor Financeiro', icon: BellRing, route: '/ia/alertas' },
      { key: 'decisoes-ia', label: 'Decisões da IA', icon: Lightbulb, route: '/autopiloto/decisoes' },
      { key: 'simulacoes-cenarios', label: 'Simulações & Cenários', icon: Calculator, route: '/financeiro/simulacoes' },
      { key: 'tempo-real', label: 'Finanças Tempo Real', icon: Gauge, route: '/financeiro/tempo-real' },
      { key: 'roadmap-ia', label: 'Roadmap IA & Finance', icon: Lightbulb, route: '/inovacao' },
      { key: 'logs-ia', label: 'Logs & Auditoria IA', icon: FileText, route: '/ia/logs' },
      { key: 'caixa-entrada', label: 'Caixa de Entrada', icon: Inbox, route: '/autopiloto/caixa-entrada' },
      { key: 'config-ia', label: 'Configurações de IA', icon: Settings, route: '/ia/configuracoes' },
    ]
  },

  // 8. RELATÓRIOS & BI
  {
    key: 'relatorios-bi',
    label: 'Relatórios & BI',
    icon: BarChart3,
    colorClass: 'text-menu-relatorios',
    children: [
      { key: 'dre-relatorio', label: 'DRE', icon: PieChart, route: '/dre' },
      { key: 'balanco-relatorio', label: 'Balanço Patrimonial', icon: Scale, route: '/relatorios/balanco' },
      { key: 'balancete-relatorio', label: 'Balancete', icon: FileText, route: '/relatorios/balancete' },
      { key: 'livro-razao', label: 'Livro Razão', icon: BookOpen, route: '/relatorios/livro-razao' },
      { key: 'livro-diario-rel', label: 'Livro Diário', icon: BookOpen, route: '/relatorios/livro-diario' },
      { key: 'ecf', label: 'ECF', icon: FileSpreadsheet, route: '/relatorios/ecf' },
      { key: 'analise-vendas', label: 'Análise de Vendas', icon: TrendingUp, route: '/relatorios/analise-vendas' },
      { key: 'analise-compras', label: 'Análise de Compras', icon: Truck, route: '/relatorios/analise-compras' },
      { key: 'dashboards', label: 'Dashboards', icon: BarChart3, route: '/paineis' },
    ]
  },

  // 9. CONFIGURAÇÕES & ECOSSISTEMA
  {
    key: 'configuracoes-ecossistema',
    label: 'Configurações',
    icon: Settings,
    colorClass: 'text-menu-config',
    children: [
      // Cadastros
      { key: 'clientes-fornecedores', label: 'Clientes/Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
      { key: 'plano-contas', label: 'Plano de Contas', icon: ClipboardList, route: '/cadastros/plano-contas' },
      { key: 'centros-custo', label: 'Centros de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
      { key: 'bancos-ref', label: 'Bancos (Referência)', icon: Landmark, route: '/cadastros/bancos-referencia' },
      { key: 'importar-exportar', label: 'Importar/Exportar', icon: Upload, route: '/importar-exportar' },
      // Serviços Financeiros
      { key: 'hub-servicos', label: 'Hub de Serviços', icon: CircleDollarSign, route: '/embedded/servicos' },
      { key: 'antecipacao', label: 'Antecipação', icon: Wallet, route: '/embedded/antecipacao' },
      { key: 'conexoes-bancarias', label: 'Conexões Bancárias', icon: Link2, route: '/openfinance/conexoes' },
      { key: 'pagamentos-pix', label: 'Pagamentos Pix', icon: Zap, route: '/openfinance/pagamentos' },
      { key: 'open-banking', label: 'Open Banking', icon: Globe, route: '/open-banking' },
      { key: 'conciliacao-auto', label: 'Conciliação Automática', icon: RefreshCw, route: '/conciliacao-automatica' },
      // Integrações
      { key: 'conexoes-integ', label: 'Conexões', icon: Link2, route: '/integracoes/conexoes' },
      { key: 'config-integracoes', label: 'Configurar Integrações', icon: Plug, route: '/integracoes/configurar' },
      { key: 'governanca', label: 'Governança', icon: Settings, route: '/configuracoes' },
      { key: 'admin-geral', label: 'Administração', icon: UserCog, route: '/admin' },
    ]
  },
];

// Color map for active states using CSS variable classes
const categoryColorMap: Record<string, { bg: string; border: string; text: string }> = {
  inicio: { bg: 'bg-menu-inicio/10', border: 'border-l-menu-inicio', text: 'text-menu-inicio' },
  favoritos: { bg: 'bg-menu-favoritos/10', border: 'border-l-menu-favoritos', text: 'text-menu-favoritos' },
  operacional: { bg: 'bg-menu-operacoes/10', border: 'border-l-menu-operacoes', text: 'text-menu-operacoes' },
  suprimentos: { bg: 'bg-menu-compras/10', border: 'border-l-menu-compras', text: 'text-menu-compras' },
  financeiro: { bg: 'bg-menu-financeiro/10', border: 'border-l-menu-financeiro', text: 'text-menu-financeiro' },
  'controladoria-fiscal': { bg: 'bg-menu-contabil/10', border: 'border-l-menu-contabil', text: 'text-menu-contabil' },
  'inteligencia-ia': { bg: 'bg-violet-500/10', border: 'border-l-violet-500', text: 'text-violet-600' },
  'relatorios-bi': { bg: 'bg-menu-relatorios/10', border: 'border-l-menu-relatorios', text: 'text-menu-relatorios' },
  'configuracoes-ecossistema': { bg: 'bg-menu-config/10', border: 'border-l-menu-config', text: 'text-menu-config' },
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
    if (collapsed) return;
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

  // Auto-expand group containing active route
  useEffect(() => {
    menuItems.forEach(item => {
      if (item.children && hasActiveChild(item) && !openGroups.includes(item.key)) {
        setOpenGroups(prev => [...prev, item.key]);
      }
    });
  }, [location.pathname]);

  const renderMenuItem = (item: MenuItem, isChild = false) => {
    const colors = getColorClasses(item.key);
    const itemActive = isActive(item.route);
    const hasActive = hasActiveChild(item);
    const isHighlighted = item.highlight;

    if (item.children && !collapsed) {
      const isOpen = openGroups.includes(item.key);

      return (
        <Collapsible key={item.key} open={isOpen} onOpenChange={() => toggleGroup(item.key)}>
          <CollapsibleTrigger asChild>
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                'border-l-4 border-transparent',
                isHighlighted && 'bg-gradient-to-r from-violet-500/5 to-cyan-500/5',
                hasActive 
                  ? cn(colors.bg, colors.border, colors.text, 'pl-2.5')
                  : isHighlighted 
                    ? 'text-violet-600 hover:bg-violet-50' 
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-200',
                hasActive ? colors.text : isHighlighted ? 'text-violet-500' : item.colorClass
              )} />
              <span className="flex-1 text-left truncate">{item.label}</span>
              {isHighlighted && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-gradient-to-r from-violet-500 to-cyan-500 text-white rounded-full">
                  AI
                </span>
              )}
              <ChevronDown className={cn(
                'h-4 w-4 shrink-0 transition-transform duration-200',
                isOpen && 'rotate-180'
              )} />
            </motion.button>
          </CollapsibleTrigger>
          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-1 space-y-0.5 pl-4"
            >
              {item.children.map((child) => (
                <motion.button
                  key={child.key}
                  whileHover={{ x: 2 }}
                  onClick={() => child.route && handleNavigate(child.route)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-all duration-200',
                    isActive(child.route) 
                      ? cn('font-semibold', colors.text, colors.bg)
                      : isHighlighted 
                        ? 'text-gray-600 hover:bg-violet-50 hover:text-violet-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  )}
                >
                  <child.icon className={cn(
                    'h-4 w-4 shrink-0',
                    isActive(child.route) ? colors.text : 'text-gray-500'
                  )} />
                  <span className="truncate">{child.label}</span>
                </motion.button>
              ))}
            </motion.div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Collapsed state with children
    if (item.children && collapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>
            <button 
              className={cn(
                'flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-200',
                'border-l-4 border-transparent relative',
                isHighlighted && 'bg-gradient-to-r from-violet-500/10 to-cyan-500/10',
                hasActive 
                  ? cn(colors.bg, colors.border, colors.text)
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              )}
            >
              <item.icon className={cn(
                'h-5 w-5 shrink-0 transition-colors duration-200',
                hasActive ? colors.text : isHighlighted ? 'text-violet-500' : item.colorClass
              )} />
              {isHighlighted && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="p-0 w-56 bg-card border-border shadow-xl">
            <div className="py-2">
              <div className={cn(
                'px-3 py-2 text-sm font-semibold border-b border-border',
                isHighlighted ? 'text-violet-600 bg-violet-50' : colors.text
              )}>
                {item.label}
              </div>
              <div className="py-1 max-h-64 overflow-y-auto">
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
                'flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-200',
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
      <motion.button
        key={item.key}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => item.route && handleNavigate(item.route)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
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
      </motion.button>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-sidebar">
        {/* Search Hint */}
        {!collapsed && (
          <div className="px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground bg-muted/50 rounded-lg">
              <Search className="h-3.5 w-3.5" />
              <span>Pressione</span>
              <kbd className="px-1.5 py-0.5 bg-background rounded text-[10px] font-mono border">⌘K</kbd>
              <span>para buscar</span>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <ScrollArea className="flex-1 py-2 sidebar-scroll">
          <div className={cn('space-y-1', collapsed ? 'px-1.5' : 'px-2')}>
            {menuItems.map((item) => renderMenuItem(item))}
          </div>
        </ScrollArea>

        {/* Version Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Vitrio v2.0</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});

// Storage key for collapsed state
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function SidebarEnterprise() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });

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
        <SheetContent side="left" className="w-[300px] p-0 bg-sidebar border-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: collapsed ? 64 : 280 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] border-r border-border bg-sidebar shadow-sidebar md:block'
        )}
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn(
            'absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border border-border bg-background shadow-sm hover:bg-muted transition-colors',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          )}
        </Button>

        <SidebarContent collapsed={collapsed} />
      </motion.aside>
    </SidebarContext.Provider>
  );
}

export { SidebarContext };
export default SidebarEnterprise;
