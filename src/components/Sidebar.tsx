import { memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
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
  FileBarChart,
  Layers,
  CircleDollarSign,
  Activity,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

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
  
  // 2. FAVORITOS
  { key: 'favoritos', label: 'Favoritos', icon: Star, route: '/favoritos', colorClass: 'text-menu-favoritos' },
  
  // 3. OPERAÇÕES
  {
    key: 'operacoes',
    label: 'Operações',
    icon: Activity,
    colorClass: 'text-menu-operacoes',
    children: [
      { key: 'pdv', label: 'PDV', icon: CreditCard, route: '/frente-caixa' },
      { key: 'nova-venda', label: 'Nova Venda', icon: Receipt, route: '/vendas/nova' },
      { key: 'estrutura-org', label: 'Estrutura Organizacional', icon: Network, route: '/operacional/estrutura' },
      { key: 'centros-custodia', label: 'Centros de Custódia', icon: FolderTree, route: '/operacional/centros-custodia' },
      { key: 'departamentos', label: 'Seções e Departamentos', icon: Building2, route: '/operacional/departamentos' },
      { key: 'responsaveis', label: 'Responsáveis por CC', icon: UserCheck, route: '/operacional/responsaveis' },
      { key: 'inventario', label: 'Inventário', icon: Package, route: '/estoque/inventario' },
      { key: 'movimentacoes', label: 'Movimentações', icon: TrendingUp, route: '/estoque/movimentacoes' },
    ]
  },
  
  // 4. CATÁLOGO
  {
    key: 'catalogo',
    label: 'Catálogo',
    icon: LayoutGrid,
    colorClass: 'text-menu-catalogo',
    children: [
      { key: 'lista-produtos', label: 'Lista de Produtos', icon: Package, route: '/cadastros/produtos' },
      { key: 'categorias', label: 'Categorias', icon: Boxes, route: '/cadastros/dimensoes' },
      { key: 'lista-servicos', label: 'Lista de Serviços', icon: Briefcase, route: '/cadastros/servicos' },
    ]
  },
  
  // 5. COMPRAS
  { 
    key: 'compras', 
    label: 'Compras', 
    icon: Truck,
    colorClass: 'text-menu-compras',
    children: [
      { key: 'pedidos-compra', label: 'Pedidos', icon: FileText, route: '/compras/pedidos' },
      { key: 'cotacoes', label: 'Cotações', icon: Calculator, route: '/compras/cotacoes' },
      { key: 'fornecedores', label: 'Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
    ]
  },
  
  // 6. FINANCEIRO
  { 
    key: 'financeiro', 
    label: 'Financeiro', 
    icon: DollarSign,
    colorClass: 'text-menu-financeiro',
    children: [
      { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
      { key: 'caixa-fisica', label: 'Caixa Física', icon: Banknote, route: '/tesouraria/caixa-fisica' },
      { key: 'tesouraria', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
      { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
      { key: 'contas-receber', label: 'Contas a Receber', icon: Wallet, route: '/ar' },
      { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
      { key: 'contas-pagar', label: 'Contas a Pagar', icon: Receipt, route: '/ap' },
      { key: 'cnab', label: 'CNAB', icon: Send, route: '/tesouraria/cnab' },
      { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
      { key: 'orcamento-real', label: 'Orçamento vs Real', icon: Target, route: '/financeiro/orcamento-real' },
      { key: 'rolling-forecast', label: 'Rolling Forecast', icon: TrendingUp, route: '/financeiro/rolling-forecast' },
      { key: 'simulacoes-whatif', label: 'Simulações What-If', icon: Calculator, route: '/financeiro/simulacoes-orcamento' },
      { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'conciliacao', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
    ]
  },
  
  // 7. CONTÁBIL & FISCAL
  {
    key: 'contabil-fiscal',
    label: 'Contábil & Fiscal',
    icon: BookOpen,
    colorClass: 'text-menu-contabil',
    children: [
      { key: 'livro-diario-ai', label: '📖 Livro Diário', icon: BookOpen, route: '/controladoria-livro-diario' },
      { key: 'balanco-ai', label: '📊 Balanço Patrimonial', icon: Scale, route: '/controladoria-balanco' },
      { key: 'dre-ai', label: '📈 DRE (Resultado)', icon: PieChart, route: '/controladoria-dre' },
      { key: 'balancete-ai', label: '✓ Balancete', icon: FileText, route: '/controladoria-balancete' },
      { key: 'lancamentos-contabeis', label: 'Lançamentos Contábeis', icon: FileText, route: '/contabilidade/lancamentos' },
      { key: 'reclassificacao', label: 'Reclassificação', icon: Scale, route: '/contabilidade/reclassificacao' },
      { key: 'nfe', label: 'NF-e', icon: FileText, route: '/fiscal/nfe' },
      { key: 'nfce', label: 'NFC-e', icon: Receipt, route: '/fiscal/nfce' },
      { key: 'cupom-fiscal', label: 'Cupom Fiscal', icon: Receipt, route: '/fiscal/cupom-fiscal' },
      { key: 'danfe', label: 'DANFE', icon: FileText, route: '/fiscal/danfe' },
      { key: 'analise-fiscal', label: 'Análise Fiscal', icon: PieChart, route: '/fiscal/analise' },
      { key: 'obrigacoes-fiscais', label: 'Obrigações Fiscais', icon: ClipboardList, route: '/controladoria-obrigacoes' },
      { key: 'mapeamento-contabil', label: 'Mapeamento Contábil', icon: Network, route: '/controladoria-mapeamento' },
      { key: 'alertas-compliance', label: 'Alertas Compliance', icon: AlertTriangle, route: '/controladoria-alertas' },
      { key: 'auditoria', label: 'Histórico & Auditoria', icon: Shield, route: '/controladoria-auditoria' },
    ]
  },
  
  // 8. RELATÓRIOS & BI
  {
    key: 'relatorios-bi',
    label: 'Relatórios & BI',
    icon: BarChart3,
    colorClass: 'text-menu-relatorios',
    children: [
      { key: 'dre', label: 'DRE', icon: PieChart, route: '/dre' },
      { key: 'balanco', label: 'Balanço Patrimonial', icon: Scale, route: '/relatorios/balanco' },
      { key: 'balancete', label: 'Balancete', icon: FileText, route: '/relatorios/balancete' },
      { key: 'livro-razao', label: 'Livro Razão', icon: BookOpen, route: '/relatorios/livro-razao' },
      { key: 'livro-diario', label: 'Livro Diário', icon: BookOpen, route: '/relatorios/livro-diario' },
      { key: 'ecf', label: 'ECF', icon: FileSpreadsheet, route: '/relatorios/ecf' },
      { key: 'analise-vendas', label: 'Análise de Vendas', icon: TrendingUp, route: '/relatorios/analise-vendas' },
      { key: 'analise-compras', label: 'Análise de Compras', icon: Truck, route: '/relatorios/analise-compras' },
      { key: 'dashboards', label: 'Dashboards', icon: BarChart3, route: '/paineis' },
    ]
  },
  
  // 9. CADASTROS
  {
    key: 'cadastros',
    label: 'Cadastros',
    icon: ClipboardList,
    colorClass: 'text-menu-cadastros',
    children: [
      { key: 'clientes-fornecedores', label: 'Clientes/Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
      { key: 'plano-contas', label: 'Plano de Contas', icon: ClipboardList, route: '/cadastros/plano-contas' },
      { key: 'centros-custo', label: 'Centros de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
      { key: 'contas-bancarias-cad', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'bancos-ref', label: 'Bancos (Referência)', icon: Landmark, route: '/cadastros/bancos-referencia' },
    ]
  },
  
  // 10. IA & AUTOMAÇÃO
  {
    key: 'ia-automacao',
    label: 'IA & Automação',
    icon: Bot,
    colorClass: 'text-menu-ia',
    children: [
      { key: 'ia-cfo', label: 'CFO Virtual', icon: Target, route: '/ia/cfo-virtual' },
      { key: 'ia-analista', label: 'Analista Inteligente', icon: Brain, route: '/ia/analista' },
      { key: 'ia-monitor', label: 'Monitor Financeiro', icon: BellRing, route: '/ia/alertas' },
      { key: 'ia-whatsapp', label: 'Agente WhatsApp', icon: MessageSquare, route: '/ia/whatsapp' },
      { key: 'ia-mensagens', label: 'Mensagens', icon: Inbox, route: '/autopiloto/caixa-entrada' },
      { key: 'ia-decisoes', label: 'Decisões da IA', icon: Sparkles, route: '/autopiloto/decisoes' },
      { key: 'ia-logs', label: 'Logs & Auditoria', icon: FileText, route: '/ia/logs' },
      { key: 'roadmap', label: 'Roadmap IA & Finance', icon: Lightbulb, route: '/inovacao' },
      { key: 'simulacoes-cenarios', label: 'Simulações & Cenários', icon: Calculator, route: '/financeiro/simulacoes' },
      { key: 'tempo-real', label: 'Finanças Tempo Real', icon: Gauge, route: '/financeiro/tempo-real' },
      { key: 'anomalias', label: 'Monitor Anomalias', icon: AlertTriangle, route: '/compliance/anomalias' },
      { key: 'ia-config', label: 'Configurações de IA', icon: Settings, route: '/ia/configuracoes' },
    ]
  },
  
  // 11. SERVIÇOS FINANCEIROS
  {
    key: 'servicos-financeiros',
    label: 'Serviços Financeiros',
    icon: CircleDollarSign,
    colorClass: 'text-menu-servicos',
    children: [
      { key: 'hub-servicos', label: 'Hub de Serviços', icon: Briefcase, route: '/embedded/servicos' },
      { key: 'antecipacao', label: 'Antecipação', icon: Wallet, route: '/embedded/antecipacao' },
      { key: 'of-conexoes', label: 'Conexões Bancárias', icon: Link2, route: '/openfinance/conexoes' },
      { key: 'of-pagamentos', label: 'Pagamentos Pix', icon: Zap, route: '/openfinance/pagamentos' },
      { key: 'open-banking', label: 'Open Banking', icon: Landmark, route: '/open-banking' },
      { key: 'conciliacao-auto', label: 'Conciliação Automática', icon: RefreshCw, route: '/conciliacao-automatica' },
      { key: 'nf-xml-auto', label: 'NF-e XML Auto', icon: FileText, route: '/nf-xml-auto' },
      { key: 'dashboard-compliance', label: 'Dashboard Caixa+Compliance', icon: Gauge, route: '/dashboard-caixa-compliance' },
    ]
  },
  
  // 12. INTEGRAÇÕES
  { 
    key: 'integracoes', 
    label: 'Integrações', 
    icon: Plug,
    colorClass: 'text-menu-integracoes',
    children: [
      { key: 'conexoes', label: 'Conexões', icon: Link2, route: '/integracoes/conexoes' },
      { key: 'config-integracoes', label: 'Configurar', icon: Settings, route: '/integracoes/configurar' },
    ]
  },
  
  // 13. CONFIGURAÇÕES
  { key: 'configuracoes', label: 'Configurações', icon: Settings, route: '/admin', colorClass: 'text-menu-config' },
];

// Color map for active states using CSS variable classes
const categoryColorMap: Record<string, { bg: string; border: string; text: string }> = {
  inicio: { bg: 'bg-menu-inicio/10', border: 'border-l-menu-inicio', text: 'text-menu-inicio' },
  favoritos: { bg: 'bg-menu-favoritos/10', border: 'border-l-menu-favoritos', text: 'text-menu-favoritos' },
  operacoes: { bg: 'bg-menu-operacoes/10', border: 'border-l-menu-operacoes', text: 'text-menu-operacoes' },
  catalogo: { bg: 'bg-menu-catalogo/10', border: 'border-l-menu-catalogo', text: 'text-menu-catalogo' },
  compras: { bg: 'bg-menu-compras/10', border: 'border-l-menu-compras', text: 'text-menu-compras' },
  financeiro: { bg: 'bg-menu-financeiro/10', border: 'border-l-menu-financeiro', text: 'text-menu-financeiro' },
  'contabil-fiscal': { bg: 'bg-menu-contabil/10', border: 'border-l-menu-contabil', text: 'text-menu-contabil' },
  'relatorios-bi': { bg: 'bg-menu-relatorios/10', border: 'border-l-menu-relatorios', text: 'text-menu-relatorios' },
  cadastros: { bg: 'bg-menu-cadastros/10', border: 'border-l-menu-cadastros', text: 'text-menu-cadastros' },
  'ia-automacao': { bg: 'bg-menu-ia/10', border: 'border-l-menu-ia', text: 'text-menu-ia' },
  'servicos-financeiros': { bg: 'bg-menu-servicos/10', border: 'border-l-menu-servicos', text: 'text-menu-servicos' },
  integracoes: { bg: 'bg-menu-integracoes/10', border: 'border-l-menu-integracoes', text: 'text-menu-integracoes' },
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

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Logo Header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4 bg-white">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-gray-800">Caixa Forte</span>
        )}
      </div>

      {/* Menu Items */}
      <ScrollArea className="flex-1 py-2 sidebar-scroll">
        <div className="space-y-0.5 px-2">
          {menuItems.map((item) => {
            const colors = getColorClasses(item.key);
            
            if (item.children) {
              const isOpen = openGroups.includes(item.key);
              const hasActive = hasActiveChild(item);

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
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          <ChevronDown className={cn(
                            'h-4 w-4 shrink-0 transition-transform duration-200',
                            isOpen && 'rotate-180'
                          )} />
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  {!collapsed && (
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
                  )}
                </Collapsible>
              );
            }

            // Single menu item (no children)
            const itemActive = isActive(item.route);
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
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
});

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
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
      <aside className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-64 border-r border-gray-200 bg-white shadow-sidebar md:block">
        <SidebarContent />
      </aside>
    </>
  );
}

export default Sidebar;
