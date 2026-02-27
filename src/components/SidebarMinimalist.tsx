import { memo, useState, createContext, useContext, useEffect } from 'react';
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
  Kanban,
  Boxes,
  BarChart3,
  Plug,
  Settings,
  Menu,
  Sparkles,
  FileText,
  Users,
  UserPlus,
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
  Target,
  Shield,
  UserCog,
  Inbox,
  Activity,
  Upload,
  Search,
  RepeatIcon,
  TrendingDown,
  Layers,
  CircleDollarSign,
  Store,
  Factory,
  Cog,
  Route as RouteIcon,
  Clock,
  Calendar,
  Smartphone,
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

// ============ CATEGORY COLOR DEFINITIONS ============
type CategoryKey = 'inicio' | 'favoritos' | 'operacional' | 'suprimentos' | 'producao' | 'financeiro' | 'controladoria' | 'inteligencia' | 'hcm' | 'configuracoes';

const categoryColors: Record<CategoryKey, { icon: string; bg: string; border: string; text: string; hoverBg: string }> = {
  inicio: { 
    icon: 'text-blue-500', 
    bg: 'bg-blue-50', 
    border: 'border-l-blue-500', 
    text: 'text-blue-600',
    hoverBg: 'hover:bg-blue-50/60'
  },
  favoritos: { 
    icon: 'text-amber-500', 
    bg: 'bg-amber-50', 
    border: 'border-l-amber-500', 
    text: 'text-amber-600',
    hoverBg: 'hover:bg-amber-50/60'
  },
  operacional: { 
    icon: 'text-emerald-500', 
    bg: 'bg-emerald-50', 
    border: 'border-l-emerald-500', 
    text: 'text-emerald-600',
    hoverBg: 'hover:bg-emerald-50/60'
  },
  suprimentos: { 
    icon: 'text-orange-500', 
    bg: 'bg-orange-50', 
    border: 'border-l-orange-500', 
    text: 'text-orange-600',
    hoverBg: 'hover:bg-orange-50/60'
  },
  producao: { 
    icon: 'text-indigo-500', 
    bg: 'bg-indigo-50', 
    border: 'border-l-indigo-500', 
    text: 'text-indigo-600',
    hoverBg: 'hover:bg-indigo-50/60'
  },
  financeiro: { 
    icon: 'text-green-500', 
    bg: 'bg-green-50', 
    border: 'border-l-green-500', 
    text: 'text-green-600',
    hoverBg: 'hover:bg-green-50/60'
  },
  controladoria: { 
    icon: 'text-sky-500', 
    bg: 'bg-sky-50', 
    border: 'border-l-sky-500', 
    text: 'text-sky-600',
    hoverBg: 'hover:bg-sky-50/60'
  },
  inteligencia: { 
    icon: 'text-violet-500', 
    bg: 'bg-violet-50', 
    border: 'border-l-violet-500', 
    text: 'text-violet-600',
    hoverBg: 'hover:bg-violet-50/60'
  },
  hcm: { 
    icon: 'text-rose-500', 
    bg: 'bg-rose-50', 
    border: 'border-l-rose-500', 
    text: 'text-rose-600',
    hoverBg: 'hover:bg-rose-50/60'
  },
  configuracoes: { 
    icon: 'text-slate-500', 
    bg: 'bg-slate-50', 
    border: 'border-l-slate-400', 
    text: 'text-slate-600',
    hoverBg: 'hover:bg-slate-50/60'
  },
};

// ============ SUB-ITEM TYPE ============
interface SubItem {
  key: string;
  label: string;
  icon: LucideIcon;
  route: string;
}

// ============ SUB-GROUP TYPE (Level 2) ============
interface SubGroup {
  key: string;
  label: string;
  items: SubItem[];
}

// ============ MAIN MENU ITEM (Level 1) ============
interface MenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  route?: string;
  category: CategoryKey;
  subGroups?: SubGroup[];
  isHighlighted?: boolean;
}

// ============ HIERARCHICAL MENU STRUCTURE ============
const menuItems: MenuItem[] = [
  // INÍCIO
  { 
    key: 'inicio', 
    label: 'Início', 
    icon: Home, 
    route: '/', 
    category: 'inicio'
  },
  
  // FAVORITOS
  { 
    key: 'favoritos', 
    label: 'Favoritos', 
    icon: Star, 
    route: '/favoritos', 
    category: 'favoritos'
  },

  // 🚀 OPERACIONAL
  {
    key: 'operacional',
    label: 'Operacional',
    icon: Activity,
    category: 'operacional',
    subGroups: [
      {
        key: 'vendas-pdv',
        label: 'Vendas & PDV',
        items: [
          { key: 'pdv', label: 'PDV', icon: Store, route: '/frente-caixa' },
          { key: 'nova-venda', label: 'Nova Venda', icon: ShoppingCart, route: '/vendas/nova' },
        ]
      },
      {
        key: 'crm',
        label: 'CRM',
        items: [
          { key: 'crm-dashboard', label: 'Dashboard', icon: Users, route: '/crm' },
          { key: 'crm-pipeline', label: 'Pipeline', icon: Kanban, route: '/crm/pipeline' },
          { key: 'crm-leads', label: 'Leads', icon: UserPlus, route: '/crm/leads' },
          { key: 'crm-comissoes', label: 'Comissões', icon: DollarSign, route: '/crm/comissoes' },
          { key: 'crm-metas', label: 'Metas', icon: Target, route: '/crm/metas' },
        ]
      },
      {
        key: 'estoque',
        label: 'Estoque',
        items: [
          { key: 'estoque-central', label: 'Central de Estoque', icon: Package, route: '/estoque' },
          { key: 'movimentacoes', label: 'Movimentações', icon: ArrowRightLeft, route: '/estoque/movimentacoes' },
          { key: 'inventario', label: 'Inventário', icon: ClipboardList, route: '/estoque/inventario' },
        ]
      },
      {
        key: 'catalogo',
        label: 'Catálogo',
        items: [
          { key: 'produtos', label: 'Produtos', icon: Package, route: '/cadastros/produtos' },
          { key: 'servicos', label: 'Serviços', icon: Briefcase, route: '/cadastros/servicos' },
        ]
      },
      {
        key: 'logistica',
        label: 'Logística',
        items: [
          { key: 'centros-custodia', label: 'Centros de Custódia', icon: FolderTree, route: '/operacional/centros-custodia' },
          { key: 'estrutura-org', label: 'Estrutura Organizacional', icon: Network, route: '/operacional/estrutura' },
          { key: 'departamentos', label: 'Departamentos', icon: Building2, route: '/operacional/departamentos' },
        ]
      }
    ]
  },

  // 📦 SUPRIMENTOS
  {
    key: 'suprimentos',
    label: 'Suprimentos',
    icon: Truck,
    category: 'suprimentos',
    subGroups: [
      {
        key: 'compras',
        label: 'Compras',
        items: [
          { key: 'pedidos-compra', label: 'Pedidos', icon: FileText, route: '/compras/pedidos' },
          { key: 'cotacoes', label: 'Cotações', icon: Calculator, route: '/compras/cotacoes' },
          { key: 'entradas', label: 'Entradas', icon: Package, route: '/compras/entradas' },
          { key: 'fornecedores', label: 'Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores?tipo=fornecedor' },
        ]
      }
    ]
  },

  // 🏭 PCP & MRP (PRODUÇÃO)
  {
    key: 'producao',
    label: 'PCP & MRP',
    icon: Factory,
    category: 'producao',
    subGroups: [
      {
        key: 'producao-ordens',
        label: 'Produção',
        items: [
          { key: 'ordens-producao', label: 'Ordens de Produção', icon: Factory, route: '/producao/ordens' },
          { key: 'apontamento', label: 'Apontamento', icon: ClipboardList, route: '/producao/apontamento' },
        ]
      },
      {
        key: 'engenharia',
        label: 'Engenharia',
        items: [
          { key: 'bom-estrutura', label: 'BOM (Estrutura)', icon: Layers, route: '/producao/engenharia' },
          { key: 'centros-trabalho', label: 'Centros de Trabalho', icon: RouteIcon, route: '/producao/centros-trabalho' },
        ]
      },
      {
        key: 'planejamento-mrp',
        label: 'Planejamento',
        items: [
          { key: 'mrp', label: 'MRP', icon: Calculator, route: '/producao/mrp' },
          { key: 'requisicoes-compra', label: 'Requisições', icon: FileText, route: '/producao/requisicoes' },
        ]
      },
      {
        key: 'custeio',
        label: 'Custeio',
        items: [
          { key: 'custeio-industrial', label: 'Custeio Industrial', icon: BarChart3, route: '/producao/custeio' },
        ]
      }
    ]
  },

  // 💰 FINANCEIRO
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    category: 'financeiro',
    subGroups: [
      {
        key: 'tesouraria',
        label: 'Tesouraria',
        items: [
          { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
          { key: 'caixa-fisica', label: 'Caixa Física', icon: Banknote, route: '/tesouraria/caixa-fisica' },
          { key: 'tesouraria-geral', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
          { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
          { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
        ]
      },
      {
        key: 'ciclo-credito',
        label: 'Ciclo de Crédito',
        items: [
          { key: 'contas-receber', label: 'Contas a Receber', icon: TrendingUp, route: '/ar' },
          { key: 'contas-pagar', label: 'Contas a Pagar', icon: TrendingDown, route: '/ap' },
          { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
        ]
      },
      {
        key: 'conciliacao',
        label: 'Conciliação',
        items: [
          { key: 'conciliacao-bancaria', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
          { key: 'cnab', label: 'CNAB', icon: Send, route: '/tesouraria/cnab' },
        ]
      },
      {
        key: 'contratos',
        label: 'Contratos & Projetos',
        items: [
          { key: 'contratos-recorrencia', label: 'Gestão de Contratos', icon: RepeatIcon, route: '/contratos/recorrencia' },
          { key: 'gestao-projetos', label: 'Gestão de Projetos', icon: FolderTree, route: '/projetos/gestao' },
        ]
      },
      {
        key: 'planejamento',
        label: 'Planejamento',
        items: [
          { key: 'metas-financeiras', label: 'Metas', icon: Target, route: '/metas-financeiras' },
          { key: 'orcamento-real', label: 'Orçamento vs Real', icon: BarChart3, route: '/financeiro/orcamento-real' },
          { key: 'rolling-forecast', label: 'Rolling Forecast', icon: TrendingUp, route: '/financeiro/rolling-forecast' },
          { key: 'simulacoes-whatif', label: 'Simulações What-If', icon: Calculator, route: '/financeiro/simulacoes-orcamento' },
        ]
      }
    ]
  },

  // ⚖️ CONTROLADORIA & FISCAL
  {
    key: 'controladoria',
    label: 'Controladoria & Fiscal',
    icon: BookOpen,
    category: 'controladoria',
    subGroups: [
      {
        key: 'contabilidade',
        label: 'Contabilidade',
        items: [
          { key: 'livro-diario', label: 'Livro Diário', icon: BookOpen, route: '/controladoria-livro-diario' },
          { key: 'balanco-patrimonial', label: 'Balanço Patrimonial', icon: Scale, route: '/controladoria-balanco' },
          { key: 'dre', label: 'DRE (Resultado)', icon: PieChart, route: '/controladoria-dre' },
          { key: 'balancete', label: 'Balancete', icon: FileText, route: '/controladoria-balancete' },
          { key: 'lancamentos', label: 'Lançamentos', icon: FileText, route: '/contabilidade/lancamentos' },
          { key: 'mapeamento-contabil', label: 'Mapeamento De-Para', icon: Network, route: '/controladoria/mapeamento-contabil' },
        ]
      },
      {
        key: 'fiscal',
        label: 'Emissor Fiscal',
        items: [
          { key: 'emissor-notas', label: 'Emissor de Notas', icon: FileText, route: '/fiscal/emissor' },
          { key: 'motor-tributario', label: 'Motor Tributário', icon: Calculator, route: '/fiscal/motor-tributario' },
          { key: 'obrigacoes', label: 'Obrigações', icon: ClipboardList, route: '/controladoria-obrigacoes' },
        ]
      },
      {
        key: 'compliance',
        label: 'Compliance',
        items: [
          { key: 'dashboard-fiscal', label: 'Painel Fiscal', icon: PieChart, route: '/controladoria/dashboard-fiscal' },
          { key: 'alertas', label: 'Alertas', icon: AlertTriangle, route: '/controladoria-alertas' },
          { key: 'auditoria', label: 'Auditoria', icon: Shield, route: '/controladoria-auditoria' },
        ]
      }
    ]
  },

  // 🤖 INTELIGÊNCIA (IA)
  {
    key: 'inteligencia',
    label: 'Inteligência (IA)',
    icon: Bot,
    category: 'inteligencia',
    isHighlighted: true,
    subGroups: [
      {
        key: 'agentes',
        label: 'Agentes',
        items: [
          { key: 'meus-agentes', label: 'Meus Agentes Digitais', icon: Bot, route: '/ia/agentes' },
          { key: 'cfo-virtual', label: 'CFO Virtual', icon: Brain, route: '/ia/cfo-virtual' },
          { key: 'agente-whatsapp', label: 'Agente WhatsApp', icon: MessageSquare, route: '/ia/whatsapp' },
        ]
      },
      {
        key: 'monitoramento',
        label: 'Monitoramento',
        items: [
          { key: 'feed-inteligencia', label: 'Feed de Inteligência', icon: Sparkles, route: '/ia/feed' },
          { key: 'anomalias', label: 'Monitor de Anomalias', icon: AlertTriangle, route: '/ia/anomalias' },
          { key: 'tempo-real', label: 'Finanças Tempo Real', icon: Gauge, route: '/financeiro/tempo-real' },
          { key: 'decisoes-log', label: 'Log de Decisões', icon: FileText, route: '/ia/decisoes-log' },
        ]
      },
      {
        key: 'estrategia',
        label: 'Estratégia',
        items: [
          { key: 'decisoes-ia', label: 'Decisões', icon: Lightbulb, route: '/autopiloto/decisoes' },
          { key: 'simulacoes', label: 'Simulações', icon: Calculator, route: '/financeiro/simulacoes' },
          { key: 'config-ia', label: 'Configurações de IA', icon: Settings, route: '/ia/configuracoes' },
        ]
      }
    ]
  },

  // 👥 HCM & DEPARTAMENTO PESSOAL
  {
    key: 'hcm',
    label: 'HCM & DP',
    icon: UserCheck,
    category: 'hcm',
    subGroups: [
      {
        key: 'gestao-pessoas',
        label: 'Gestão de Pessoas',
        items: [
          { key: 'hcm-dashboard', label: 'Dashboard', icon: BarChart3, route: '/hcm' },
          { key: 'hcm-colaboradores', label: 'Colaboradores', icon: Users, route: '/hcm/colaboradores' },
          { key: 'hcm-people-analytics', label: 'People Analytics', icon: PieChart, route: '/hcm/people-analytics' },
        ]
      },
      {
        key: 'dp-operacional',
        label: 'Departamento Pessoal',
        items: [
          { key: 'hcm-folha', label: 'Folha Inteligente', icon: DollarSign, route: '/hcm/folha' },
          { key: 'hcm-ponto', label: 'Integrações Ponto', icon: Clock, route: '/hcm/integracoes-ponto' },
        ]
      },
    ]
  },

  // ⚙️ CONFIGURAÇÕES
  {
    key: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    category: 'configuracoes',
    subGroups: [
      {
        key: 'cadastros',
        label: 'Cadastros',
        items: [
          { key: 'clientes-fornecedores', label: 'Clientes/Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
          { key: 'plano-contas', label: 'Plano de Contas', icon: ClipboardList, route: '/cadastros/plano-contas' },
          { key: 'centros-custo', label: 'Centros de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
        ]
      },
      {
        key: 'banking-api',
        label: 'Banking/API',
        items: [
          { key: 'open-banking', label: 'Open Banking', icon: Globe, route: '/open-banking' },
          { key: 'pix', label: 'Pix', icon: Zap, route: '/openfinance/pagamentos' },
          { key: 'antecipacao', label: 'Antecipação', icon: CircleDollarSign, route: '/embedded/antecipacao' },
          { key: 'conexoes-bancarias', label: 'Conexões', icon: Link2, route: '/openfinance/conexoes' },
        ]
      },
      {
        key: 'sistema',
        label: 'Sistema',
        items: [
          { key: 'importar-exportar', label: 'Importar/Exportar', icon: Upload, route: '/importar-exportar' },
          { key: 'governanca', label: 'Governança', icon: Settings, route: '/configuracoes' },
          { key: 'admin', label: 'Administração', icon: UserCog, route: '/admin' },
          { key: 'integracoes', label: 'Configurar Integrações', icon: Plug, route: '/integracoes/configurar' },
        ]
      }
    ]
  },
];

// ============ SIDEBAR CONTENT COMPONENT ============
interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

const SidebarContent = memo(function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [openCategory, setOpenCategory] = useState<string | null>('financeiro');
  const [openSubGroups, setOpenSubGroups] = useState<string[]>([]);

  const handleCategoryToggle = (key: string) => {
    if (collapsed) return;
    // Accordion: only one category open at a time
    setOpenCategory(prev => prev === key ? null : key);
    setOpenSubGroups([]);
  };

  const handleSubGroupToggle = (key: string) => {
    setOpenSubGroups(prev => 
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

  const hasActiveInSubGroup = (subGroup: SubGroup) => 
    subGroup.items.some(item => isActive(item.route));

  const hasActiveInCategory = (item: MenuItem) => {
    if (item.route) return isActive(item.route);
    return item.subGroups?.some(sg => hasActiveInSubGroup(sg)) ?? false;
  };

  // Auto-expand category containing active route
  useEffect(() => {
    menuItems.forEach(item => {
      if (hasActiveInCategory(item) && openCategory !== item.key) {
        setOpenCategory(item.key);
        // Also expand the subgroup containing active item
        item.subGroups?.forEach(sg => {
          if (hasActiveInSubGroup(sg) && !openSubGroups.includes(sg.key)) {
            setOpenSubGroups(prev => [...prev, sg.key]);
          }
        });
      }
    });
  }, [location.pathname]);

  const getColors = (category: CategoryKey) => categoryColors[category];

  // ============ RENDER SUB-ITEM (Level 3) ============
  const renderSubItem = (item: SubItem, colors: typeof categoryColors[CategoryKey]) => {
    const active = isActive(item.route);
    
    return (
      <motion.button
        key={item.key}
        whileHover={{ x: 2 }}
        onClick={() => handleNavigate(item.route)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-[13px] transition-all duration-150',
          'border-l-2 border-transparent ml-3',
          active 
            ? cn('font-medium', colors.text, colors.bg, colors.border)
            : cn('text-slate-600 hover:text-slate-900', colors.hoverBg)
        )}
      >
        <item.icon className={cn(
          'h-3.5 w-3.5 shrink-0',
          active ? colors.text : 'text-slate-400'
        )} />
        <span className="truncate">{item.label}</span>
      </motion.button>
    );
  };

  // ============ RENDER SUB-GROUP (Level 2) ============
  const renderSubGroup = (subGroup: SubGroup, colors: typeof categoryColors[CategoryKey], categoryHighlighted?: boolean) => {
    const isOpen = openSubGroups.includes(subGroup.key);
    const hasActive = hasActiveInSubGroup(subGroup);

    return (
      <div key={subGroup.key} className="mt-1">
        <button
          onClick={() => handleSubGroupToggle(subGroup.key)}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors',
            'ml-2 rounded-md',
            hasActive ? colors.text : 'text-slate-400 hover:text-slate-600',
            hasActive && 'bg-white/50'
          )}
        >
          <span className="flex-1 text-left">{subGroup.label}</span>
          <ChevronDown className={cn(
            'h-3 w-3 shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )} />
        </button>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="relative pl-2 mt-1 space-y-0.5">
                {/* Vertical hierarchy line */}
                <div className={cn(
                  'absolute left-4 top-0 bottom-0 w-px',
                  categoryHighlighted ? 'bg-violet-200' : 'bg-slate-200'
                )} />
                {subGroup.items.map(item => renderSubItem(item, colors))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // ============ RENDER MAIN MENU ITEM (Level 1) ============
  const renderMenuItem = (item: MenuItem) => {
    const colors = getColors(item.category);
    const isOpen = openCategory === item.key;
    const hasActive = hasActiveInCategory(item);
    const isHighlighted = item.isHighlighted;

    // Single route item (no subgroups)
    if (item.route && !item.subGroups) {
      const active = isActive(item.route);
      
      if (collapsed) {
        return (
          <Tooltip key={item.key} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleNavigate(item.route!)}
                className={cn(
                  'flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-150',
                  'border-l-3 border-transparent',
                  active 
                    ? cn(colors.bg, colors.border, colors.text)
                    : cn('text-slate-500', colors.hoverBg)
                )}
              >
                <item.icon className={cn('h-5 w-5', active ? colors.text : colors.icon)} />
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
          onClick={() => handleNavigate(item.route!)}
          className={cn(
            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-150',
            'border-l-3 border-transparent',
            active 
              ? cn(colors.bg, colors.border, 'font-medium', colors.text)
              : cn('text-slate-700 font-normal', colors.hoverBg)
          )}
        >
          <item.icon className={cn('h-5 w-5 shrink-0', active ? colors.text : colors.icon)} />
          <span className="truncate">{item.label}</span>
        </motion.button>
      );
    }

    // Category with subgroups
    if (collapsed) {
      return (
        <Tooltip key={item.key} delayDuration={0}>
          <TooltipTrigger asChild>
            <button 
              className={cn(
                'flex w-full items-center justify-center rounded-xl p-2.5 transition-all duration-150 relative',
                'border-l-3 border-transparent',
                isHighlighted && 'bg-gradient-to-r from-violet-50/80 to-fuchsia-50/80',
                hasActive 
                  ? cn(colors.bg, colors.border, colors.text)
                  : cn('text-slate-500', colors.hoverBg)
              )}
            >
              <item.icon className={cn('h-5 w-5', hasActive ? colors.text : colors.icon)} />
              {isHighlighted && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-violet-500 rounded-full animate-pulse" />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start" className="p-0 w-60 bg-white border shadow-xl rounded-xl overflow-hidden">
            <div className="py-2">
              <div className={cn(
                'px-3 py-2 text-sm font-semibold border-b',
                isHighlighted ? 'text-violet-600 bg-violet-50' : colors.text
              )}>
                {item.label}
              </div>
              <div className="py-1 max-h-72 overflow-y-auto">
                {item.subGroups?.map(sg => (
                  <div key={sg.key} className="px-2 py-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1">
                      {sg.label}
                    </div>
                    {sg.items.map((subItem) => (
                      <button
                        key={subItem.key}
                        onClick={() => handleNavigate(subItem.route)}
                        className={cn(
                          'flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors',
                          isActive(subItem.route) 
                            ? cn('font-medium', colors.text, colors.bg)
                            : cn('text-slate-600', colors.hoverBg)
                        )}
                      >
                        <subItem.icon className="h-4 w-4 shrink-0" />
                        <span>{subItem.label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible key={item.key} open={isOpen} onOpenChange={() => handleCategoryToggle(item.key)}>
        <CollapsibleTrigger asChild>
          <motion.button 
            whileHover={{ scale: 1.005 }}
            whileTap={{ scale: 0.995 }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150',
              'border-l-3 border-transparent',
              isHighlighted && 'bg-gradient-to-r from-violet-50/60 to-fuchsia-50/60',
              hasActive 
                ? cn(colors.bg, colors.border, colors.text)
                : cn('text-slate-800', colors.hoverBg)
            )}
          >
            <item.icon className={cn('h-5 w-5 shrink-0', hasActive ? colors.text : colors.icon)} />
            <span className="flex-1 text-left truncate">{item.label}</span>
            {isHighlighted && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white rounded-full uppercase tracking-wider">
                IA
              </span>
            )}
            <ChevronDown className={cn(
              'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )} />
          </motion.button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              'mt-1 pb-2 ml-2 border-l',
              isHighlighted ? 'border-violet-200' : 'border-slate-200'
            )}
          >
            {item.subGroups?.map(sg => renderSubGroup(sg, colors, isHighlighted))}
          </motion.div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-white">
        {/* Spacer top */}
        <div className="h-2" />

        {/* Menu Items */}
        <ScrollArea className="flex-1 py-2">
          <div className={cn('space-y-1', collapsed ? 'px-1.5' : 'px-2')}>
            {menuItems.map(item => renderMenuItem(item))}
          </div>
        </ScrollArea>

        {/* Version Footer */}
        {!collapsed && (
          <div className="px-4 py-3 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              <span>Caixa Forte v2.0</span>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
});

// Storage key for collapsed state
const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed';

export function SidebarMinimalist() {
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
            className="fixed left-4 top-4 z-50 h-10 w-10 bg-white shadow-md border border-slate-200 md:hidden hover:bg-slate-50"
          >
            <Menu className="h-5 w-5 text-slate-700" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] p-0 bg-white border-slate-200">
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
          'fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] border-r border-slate-200 bg-white shadow-sm md:block'
        )}
      >
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className={cn(
            'absolute -right-3 top-4 z-50 h-6 w-6 rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-colors',
          )}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5 text-slate-400" />
          )}
        </Button>

        <SidebarContent collapsed={collapsed} />
      </motion.aside>
    </SidebarContext.Provider>
  );
}

export { SidebarContext };
export default SidebarMinimalist;
