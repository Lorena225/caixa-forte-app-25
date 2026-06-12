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
  Plus,
  CreditCard,
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
  CheckCircle2,
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
  Cog,
  FolderKanban,
  Clock,
  Calendar,
  Smartphone,
  Gift,
  GitBranch,
  LayoutDashboard,
  Building,
  FileBarChart2,
  ArrowLeftRight,
  TableProperties,
  LayoutGrid,
  Truck,
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
type CategoryKey = 'inicio' | 'favoritos' | 'operacional' | 'financeiro' | 'controladoria' | 'inteligencia' | 'hcm' | 'qualidade' | 'configuracoes' | 'grupo';

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
  qualidade: {
    icon: 'text-orange-500',
    bg: 'bg-orange-50',
    border: 'border-l-orange-500',
    text: 'text-orange-600',
    hoverBg: 'hover:bg-orange-50/60'
  },
  configuracoes: {
    icon: 'text-slate-500',
    bg: 'bg-slate-50',
    border: 'border-l-slate-400',
    text: 'text-slate-600',
    hoverBg: 'hover:bg-slate-50/60'
  },
  grupo: {
    icon: 'text-indigo-500',
    bg: 'bg-indigo-50',
    border: 'border-l-indigo-500',
    text: 'text-indigo-600',
    hoverBg: 'hover:bg-indigo-50/60'
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
  {
    key: 'painel-individual',
    label: 'Meu Painel',
    icon: LayoutGrid,
    route: '/painel',
    category: 'inicio'
  },
  {
    key: 'favoritos',
    label: 'Favoritos',
    icon: Star,
    route: '/favoritos',
    category: 'favoritos'
  },

  // ─── 1. PROJETOS (core) ───────────────────────────────────────────────
  {
    key: 'projetos',
    label: 'Projetos',
    icon: FolderKanban,
    category: 'operacional',
    subGroups: [
      {
        key: 'projetos-gestao',
        label: 'Gestão',
        items: [
          { key: 'projetos-portfolio', label: 'Portfólio de Projetos', icon: FolderKanban, route: '/projetos' },
        ]
      },
    ]
  },

  // ─── 2. FINANCEIRO (core) ─────────────────────────────────────────────
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: DollarSign,
    category: 'financeiro',
    isHighlighted: true,
    subGroups: [
      {
        key: 'fin-receber',
        label: 'Contas a Receber',
        items: [
          { key: 'ar-index',   label: 'Painel AR',            icon: TrendingUp, route: '/ar' },
          { key: 'ar-boleto',  label: 'Emitir Boleto / PIX',  icon: FileText,   route: '/ar/emissao-boleto' },
          { key: 'ar-regua',   label: 'Cobrança Inteligente', icon: BellRing,   route: '/ar/regua-cobranca' },
          { key: 'cobranca',   label: 'Crédito & Negativação', icon: Shield,    route: '/cobranca' },
        ]
      },
      {
        key: 'fin-pagar',
        label: 'Contas a Pagar',
        items: [
          { key: 'ap-index',      label: 'Painel AP',        icon: TrendingDown,  route: '/ap' },
          { key: 'ap-nf',         label: 'Lançamento de NF', icon: Receipt,       route: '/ap/lancamento-nf' },
          { key: 'ap-aprovacoes', label: 'Aprovações',       icon: FileCheck,     route: '/ap/aprovacoes' },
          { key: 'ap-bordero',    label: 'Borderô & Pagamentos', icon: Send,      route: '/ap/bordero' },
        ]
      },
      {
        key: 'fin-caixa',
        label: 'Caixa & Bancos',
        items: [
          { key: 'posicao-caixa',  label: 'Posição de Caixa', icon: Wallet,         route: '/tesouraria/posicao' },
          { key: 'extratos',       label: 'Extratos',         icon: FileText,       route: '/tesouraria/extratos' },
          { key: 'conciliacao',    label: 'Conciliação',      icon: RefreshCw,      route: '/conciliacao' },
          { key: 'transferencias', label: 'Transferências',   icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
          { key: 'cnab',           label: 'CNAB',             icon: Send,           route: '/tesouraria/cnab' },
        ]
      },
      {
        key: 'fin-movimentos',
        label: 'Movimentos',
        items: [
          { key: 'lancamentos', label: 'Lançamentos',    icon: FileText,   route: '/lancamentos' },
          { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
          { key: 'cartoes',     label: 'Cartões',        icon: CreditCard, route: '/cartoes' },
        ]
      },
      {
        key: 'fin-emprestimos',
        label: 'Empréstimos',
        items: [
          { key: 'emp-contratos', label: 'Contratos',     icon: Building2, route: '/emprestimos' },
          { key: 'emp-novo',      label: 'Novo Contrato', icon: Plus,      route: '/emprestimos/novo' },
        ]
      },
    ]
  },

  // ─── 3. FATURAMENTO & CONTRATOS (suporte ao core) ─────────────────────
  {
    key: 'faturamento',
    label: 'Faturamento & Contratos',
    icon: RepeatIcon,
    category: 'qualidade',
    subGroups: [
      {
        key: 'fat-contratos',
        label: 'Receita Recorrente',
        items: [
          { key: 'contratos-recorrencia', label: 'Contratos & Recorrências', icon: RepeatIcon, route: '/contratos/recorrencia' },
          { key: 'nfse',                  label: 'Notas Fiscais (NFS-e)',    icon: FileText,   route: '/fiscal/nfse' },
          { key: 'emissor-notas',         label: 'Emissor de Notas',         icon: Send,       route: '/fiscal/emissor' },
        ]
      },
    ]
  },

  // ─── 4. CONTABILIDADE & FISCAL (core) ─────────────────────────────────
  {
    key: 'contabilidade-fiscal',
    label: 'Contabilidade & Fiscal',
    icon: Scale,
    category: 'controladoria',
    subGroups: [
      {
        key: 'ctb-escrituracao',
        label: 'Escrituração',
        items: [
          { key: 'ctb-lancamentos', label: 'Lançamentos Contábeis', icon: Receipt,  route: '/contabilidade/lancamentos' },
          { key: 'ctb-razao',       label: 'Livro Razão',           icon: BookOpen, route: '/contabilidade/razao' },
          { key: 'ctb-diario',      label: 'Livro Diário',          icon: BookOpen, route: '/contabilidade/diario' },
          { key: 'ctb-mapeamento',  label: 'Mapeamento De-Para',    icon: Network,  route: '/controladoria/mapeamento-contabil' },
        ]
      },
      {
        key: 'ctb-demonstrativos',
        label: 'Demonstrativos',
        items: [
          { key: 'ctb-dre',       label: 'DRE',                 icon: PieChart, route: '/contabilidade/dre' },
          { key: 'ctb-balanco',   label: 'Balanço Patrimonial', icon: Scale,    route: '/contabilidade/balanco' },
          { key: 'ctb-balancete', label: 'Balancete',           icon: FileText, route: '/contabilidade/balancete' },
          { key: 'ctb-fechamento', label: 'Fechamento',         icon: FileCheck, route: '/contabilidade/fechamento' },
        ]
      },
      {
        key: 'fiscal-apuracao',
        label: 'Fiscal',
        items: [
          { key: 'apuracao',         label: 'Apuração de Impostos', icon: Calculator,    route: '/fiscal/apuracao' },
          { key: 'motor-tributario', label: 'Motor Tributário',     icon: Cog,           route: '/fiscal/motor-tributario' },
          { key: 'obrigacoes',       label: 'Obrigações & SPED',    icon: ClipboardList, route: '/fiscal/obrigacoes' },
        ]
      },
      {
        key: 'ctb-compliance',
        label: 'Compliance',
        items: [
          { key: 'painel-fiscal', label: 'Painel Fiscal', icon: PieChart,      route: '/controladoria/dashboard-fiscal' },
          { key: 'alertas',       label: 'Alertas',       icon: AlertTriangle, route: '/controladoria-alertas' },
          { key: 'auditoria',     label: 'Auditoria',     icon: Shield,        route: '/controladoria-auditoria' },
        ]
      },
    ]
  },

  // ─── 5. ORÇAMENTO & FORECAST ──────────────────────────────────────────
  {
    key: 'orcamento-forecast',
    label: 'Orçamento & Forecast',
    icon: BarChart3,
    category: 'favoritos',
    subGroups: [
      {
        key: 'orc-planejamento',
        label: 'Planejamento',
        items: [
          { key: 'orcamento-real',    label: 'Orçado × Real',     icon: BarChart3,  route: '/financeiro/orcamento-real' },
          { key: 'rolling-forecast',  label: 'Rolling Forecast',  icon: TrendingUp, route: '/financeiro/rolling-forecast' },
          { key: 'simulacoes-whatif', label: 'Simulações What-If', icon: Calculator, route: '/financeiro/simulacoes-orcamento' },
          { key: 'gestao-metas',      label: 'Gestão por Metas',  icon: Target,     route: '/metas/gestao' },
        ]
      },
    ]
  },

  // ─── 6. COPILOT IA (diferencial transversal) ──────────────────────────
  {
    key: 'copilot-ia',
    label: 'Copilot IA',
    icon: Brain,
    category: 'inteligencia',
    isHighlighted: true,
    subGroups: [
      {
        key: 'ia-agentes',
        label: 'Agentes',
        items: [
          { key: 'cfo-virtual',  label: 'CFO Virtual',           icon: Brain,         route: '/ia/cfo-virtual' },
          { key: 'meus-agentes', label: 'Meus Agentes Digitais', icon: Bot,           route: '/ia/agentes' },
          { key: 'agente-whatsapp', label: 'Agente WhatsApp',    icon: MessageSquare, route: '/ia/whatsapp' },
        ]
      },
      {
        key: 'ia-operacao',
        label: 'Operação',
        items: [
          { key: 'caixa-decisoes', label: 'Caixa de Decisões',    icon: Lightbulb,     route: '/autopiloto/caixa-entrada' },
          { key: 'pendentes',      label: 'Pendentes de Aprovação', icon: Clock,       route: '/autopiloto/pendente' },
          { key: 'regras',         label: 'Regras de Automação',  icon: Zap,           route: '/autopiloto/regras' },
          { key: 'anomalias',      label: 'Monitor de Anomalias', icon: AlertTriangle, route: '/ia/anomalias' },
        ]
      },
      {
        key: 'ia-governanca',
        label: 'Governança',
        items: [
          { key: 'feed-inteligencia', label: 'Feed de Inteligência', icon: Sparkles, route: '/ia/feed' },
          { key: 'decisoes-log',      label: 'Log de Decisões',      icon: FileText, route: '/ia/decisoes-log' },
          { key: 'config-ia',         label: 'Configurações de IA',  icon: Settings, route: '/ia/configuracoes' },
        ]
      },
    ]
  },

  // ─── ADD-ON: GRUPO ECONÔMICO ──────────────────────────────────────────
  {
    key: 'grupo-economico',
    label: 'Grupo Econômico',
    icon: Building,
    category: 'grupo',
    subGroups: [
      {
        key: 'grupo-consolidacao',
        label: 'Consolidação',
        items: [
          { key: 'grupo-visao-geral',    label: 'Visão do Grupo',       icon: LayoutDashboard, route: '/grupo/visao-geral' },
          { key: 'grupo-empresas',       label: 'Empresas do Grupo',    icon: Building,        route: '/grupo/empresas' },
          { key: 'grupo-intercompany',   label: 'Intercompany',         icon: ArrowLeftRight,  route: '/grupo/intercompany' },
          { key: 'grupo-balancete',      label: 'Balancete Consolidado', icon: TableProperties, route: '/grupo/balancete' },
          { key: 'grupo-demonstrativos', label: 'Demonstrativos',       icon: FileBarChart2,   route: '/grupo/demonstrativos' },
          { key: 'grupo-cambio',         label: 'Taxas de Câmbio',      icon: DollarSign,      route: '/grupo/cambio' },
        ]
      },
    ]
  },

  // ─── ADD-ON: PESSOAS ──────────────────────────────────────────────────
  {
    key: 'pessoas',
    label: 'Pessoas',
    icon: Users,
    category: 'hcm',
    subGroups: [
      {
        key: 'pessoas-gestao',
        label: 'Gestão',
        items: [
          { key: 'colaboradores', label: 'Colaboradores',  icon: Users,         route: '/hcm/colaboradores' },
          { key: 'gestor-ponto',  label: 'Gestão de Ponto', icon: ClipboardList, route: '/hcm/gestor-ponto' },
          { key: 'banco-horas',   label: 'Banco de Horas', icon: Clock,         route: '/hcm/banco-horas' },
          { key: 'solicitacoes',  label: 'Solicitações',   icon: Calendar,      route: '/hcm/solicitacoes' },
        ]
      },
    ]
  },

  // ─── CADASTROS & CONFIGURAÇÕES ────────────────────────────────────────
  {
    key: 'cadastros',
    label: 'Cadastros',
    icon: ClipboardList,
    category: 'configuracoes',
    subGroups: [
      {
        key: 'cad-principais',
        label: 'Principais',
        items: [
          { key: 'clientes-fornecedores', label: 'Clientes & Fornecedores', icon: Users,         route: '/cadastros/clientes-fornecedores' },
          { key: 'servicos',              label: 'Serviços',                icon: Briefcase,     route: '/cadastros/servicos' },
          { key: 'plano-contas',          label: 'Plano de Contas',         icon: ClipboardList, route: '/cadastros/plano-contas' },
          { key: 'centros-custo',         label: 'Centros de Custo',        icon: Landmark,      route: '/cadastros/centros-custo' },
          { key: 'contas-bancarias',      label: 'Contas Bancárias',        icon: Building2,     route: '/cadastros/contas-bancarias' },
          { key: 'carteiras-cad',         label: 'Carteiras',               icon: Wallet,        route: '/cadastros/carteiras' },
          { key: 'estrutura-org',         label: 'Estrutura Organizacional', icon: Network,      route: '/operacional/estrutura' },
        ]
      },
    ]
  },
  {
    key: 'configuracoes',
    label: 'Configurações',
    icon: Settings,
    category: 'configuracoes',
    subGroups: [
      {
        key: 'config-sistema',
        label: 'Sistema',
        items: [
          { key: 'governanca',        label: 'Governança',             icon: Settings, route: '/configuracoes' },
          { key: 'admin',             label: 'Administração',          icon: UserCog,  route: '/admin' },
          { key: 'integracoes',       label: 'Integrações',            icon: Plug,     route: '/integracoes/configurar' },
          { key: 'open-banking',      label: 'Open Finance',           icon: Globe,    route: '/openfinance/conexoes' },
          { key: 'importar-exportar', label: 'Importar/Exportar',      icon: Upload,   route: '/importar-exportar' },
        ]
      },
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
