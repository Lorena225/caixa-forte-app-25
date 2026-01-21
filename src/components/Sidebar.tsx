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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

interface MenuItem {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  route?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  // 1. INÍCIO
  { key: 'inicio', label: 'Início', icon: Home, route: '/' },
  
  // 2. FAVORITOS
  { key: 'favoritos', label: 'Favoritos', icon: Star, route: '/favoritos' },
  
  // 3. OPERAÇÕES (NOVO AGRUPADOR)
  {
    key: 'operacoes',
    label: 'Operações',
    icon: Activity,
    children: [
      // Frente de Caixa
      { key: 'pdv', label: 'PDV', icon: CreditCard, route: '/frente-caixa' },
      { key: 'nova-venda', label: 'Nova Venda', icon: Receipt, route: '/vendas/nova' },
      // Operacional
      { key: 'estrutura-org', label: 'Estrutura Organizacional', icon: Network, route: '/operacional/estrutura' },
      { key: 'centros-custodia', label: 'Centros de Custódia', icon: FolderTree, route: '/operacional/centros-custodia' },
      { key: 'departamentos', label: 'Seções e Departamentos', icon: Building2, route: '/operacional/departamentos' },
      { key: 'responsaveis', label: 'Responsáveis por CC', icon: UserCheck, route: '/operacional/responsaveis' },
      // Estoque
      { key: 'inventario', label: 'Inventário', icon: Package, route: '/estoque/inventario' },
      { key: 'movimentacoes', label: 'Movimentações', icon: TrendingUp, route: '/estoque/movimentacoes' },
    ]
  },
  
  // 4. CATÁLOGO (NOVO AGRUPADOR)
  {
    key: 'catalogo',
    label: 'Catálogo',
    icon: LayoutGrid,
    children: [
      // Produtos
      { key: 'lista-produtos', label: 'Lista de Produtos', icon: Package, route: '/cadastros/produtos' },
      { key: 'categorias', label: 'Categorias', icon: Boxes, route: '/cadastros/dimensoes' },
      // Serviços
      { key: 'lista-servicos', label: 'Lista de Serviços', icon: Briefcase, route: '/cadastros/servicos' },
    ]
  },
  
  // 5. COMPRAS
  { 
    key: 'compras', 
    label: 'Compras', 
    icon: Truck,
    children: [
      { key: 'pedidos-compra', label: 'Pedidos', icon: FileText, route: '/compras/pedidos' },
      { key: 'cotacoes', label: 'Cotações', icon: Calculator, route: '/compras/cotacoes' },
      { key: 'fornecedores', label: 'Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
    ]
  },
  
  // 6. FINANCEIRO (REORGANIZADO EM SUBGRUPOS LÓGICOS)
  { 
    key: 'financeiro', 
    label: 'Financeiro', 
    icon: DollarSign,
    children: [
      // CAIXA & TESOURARIA
      { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
      { key: 'caixa-fisica', label: 'Caixa Física', icon: Banknote, route: '/tesouraria/caixa-fisica' },
      { key: 'tesouraria', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
      { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
      // RECEBIMENTOS
      { key: 'contas-receber', label: 'Contas a Receber', icon: Wallet, route: '/ar' },
      { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
      // PAGAMENTOS
      { key: 'contas-pagar', label: 'Contas a Pagar', icon: Receipt, route: '/ap' },
      { key: 'cnab', label: 'CNAB', icon: Send, route: '/tesouraria/cnab' },
      // PLANEJAMENTO FINANCEIRO
      { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
      { key: 'orcamento-real', label: 'Orçamento vs Real', icon: Target, route: '/financeiro/orcamento-real' },
      { key: 'rolling-forecast', label: 'Rolling Forecast', icon: TrendingUp, route: '/financeiro/rolling-forecast' },
      { key: 'simulacoes-whatif', label: 'Simulações What-If', icon: Calculator, route: '/financeiro/simulacoes-orcamento' },
      // CONTAS BANCÁRIAS
      { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'conciliacao', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
    ]
  },
  
  // 7. CONTÁBIL & FISCAL (NOVO AGRUPADOR)
  {
    key: 'contabil-fiscal',
    label: 'Contábil & Fiscal',
    icon: BookOpen,
    children: [
      // CONTABILIDADE
      { key: 'lancamentos-contabeis', label: 'Lançamentos Contábeis', icon: FileText, route: '/contabilidade/lancamentos' },
      { key: 'reclassificacao', label: 'Reclassificação', icon: Scale, route: '/contabilidade/reclassificacao' },
      // FISCAL
      { key: 'nfe', label: 'NF-e', icon: FileText, route: '/fiscal/nfe' },
      { key: 'nfce', label: 'NFC-e', icon: Receipt, route: '/fiscal/nfce' },
      { key: 'cupom-fiscal', label: 'Cupom Fiscal', icon: Receipt, route: '/fiscal/cupom-fiscal' },
      { key: 'danfe', label: 'DANFE', icon: FileText, route: '/fiscal/danfe' },
      { key: 'analise-fiscal', label: 'Análise Fiscal', icon: PieChart, route: '/fiscal/analise' },
    ]
  },
  
  // 8. RELATÓRIOS & BI (NOVO AGRUPADOR)
  {
    key: 'relatorios-bi',
    label: 'Relatórios & BI',
    icon: BarChart3,
    children: [
      // FINANCEIROS PADRÃO
      { key: 'dre', label: 'DRE', icon: PieChart, route: '/dre' },
      { key: 'balanco', label: 'Balanço Patrimonial', icon: Scale, route: '/relatorios/balanco' },
      { key: 'balancete', label: 'Balancete', icon: FileText, route: '/relatorios/balancete' },
      { key: 'livro-razao', label: 'Livro Razão', icon: BookOpen, route: '/relatorios/livro-razao' },
      { key: 'livro-diario', label: 'Livro Diário', icon: BookOpen, route: '/relatorios/livro-diario' },
      { key: 'ecf', label: 'ECF', icon: FileSpreadsheet, route: '/relatorios/ecf' },
      // ANÁLISES OPERACIONAIS
      { key: 'analise-vendas', label: 'Análise de Vendas', icon: TrendingUp, route: '/relatorios/analise-vendas' },
      { key: 'analise-compras', label: 'Análise de Compras', icon: Truck, route: '/relatorios/analise-compras' },
      // DASHBOARDS
      { key: 'dashboards', label: 'Dashboards', icon: BarChart3, route: '/paineis' },
    ]
  },
  
  // 9. CADASTROS (SIMPLIFICADO)
  {
    key: 'cadastros',
    label: 'Cadastros',
    icon: ClipboardList,
    children: [
      { key: 'clientes-fornecedores', label: 'Clientes/Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
      { key: 'plano-contas', label: 'Plano de Contas', icon: ClipboardList, route: '/cadastros/plano-contas' },
      { key: 'centros-custo', label: 'Centros de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
      { key: 'contas-bancarias-cad', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'bancos-ref', label: 'Bancos (Referência)', icon: Landmark, route: '/cadastros/bancos-referencia' },
    ]
  },
  
  // 10. IA & AUTOMAÇÃO (NOVO AGRUPADOR ÚNICO PARA TODA IA)
  {
    key: 'ia-automacao',
    label: 'IA & Automação',
    icon: Bot,
    children: [
      // ASSISTENTES IA
      { key: 'ia-cfo', label: 'CFO Virtual', icon: Target, route: '/ia/cfo-virtual' },
      { key: 'ia-analista', label: 'Analista Inteligente', icon: Brain, route: '/ia/analista' },
      { key: 'ia-monitor', label: 'Monitor Financeiro', icon: BellRing, route: '/ia/alertas' },
      { key: 'ia-whatsapp', label: 'Agente WhatsApp', icon: MessageSquare, route: '/ia/whatsapp' },
      // INBOX & DECISÕES
      { key: 'ia-mensagens', label: 'Mensagens', icon: Inbox, route: '/autopiloto/caixa-entrada' },
      { key: 'ia-decisoes', label: 'Decisões da IA', icon: Sparkles, route: '/autopiloto/decisoes' },
      { key: 'ia-logs', label: 'Logs & Auditoria', icon: FileText, route: '/ia/logs' },
      // PLANEJAMENTO INTELIGENTE
      { key: 'roadmap', label: 'Roadmap IA & Finance', icon: Lightbulb, route: '/inovacao' },
      { key: 'simulacoes-cenarios', label: 'Simulações & Cenários', icon: Calculator, route: '/financeiro/simulacoes' },
      { key: 'tempo-real', label: 'Finanças Tempo Real', icon: Gauge, route: '/financeiro/tempo-real' },
      { key: 'anomalias', label: 'Monitor Anomalias', icon: AlertTriangle, route: '/compliance/anomalias' },
      // CONFIGURAÇÕES DE IA
      { key: 'ia-config', label: 'Configurações de IA', icon: Settings, route: '/ia/configuracoes' },
    ]
  },
  
  // 11. SERVIÇOS FINANCEIROS (NOVO AGRUPADOR)
  {
    key: 'servicos-financeiros',
    label: 'Serviços Financeiros',
    icon: CircleDollarSign,
    children: [
      { key: 'hub-servicos', label: 'Hub de Serviços', icon: Briefcase, route: '/embedded/servicos' },
      { key: 'antecipacao', label: 'Antecipação', icon: Wallet, route: '/embedded/antecipacao' },
      // Open Finance
      { key: 'of-conexoes', label: 'Conexões Bancárias', icon: Link2, route: '/openfinance/conexoes' },
      { key: 'of-pagamentos', label: 'Pagamentos Pix', icon: Zap, route: '/openfinance/pagamentos' },
    ]
  },
  
  // 12. INTEGRAÇÕES
  { 
    key: 'integracoes', 
    label: 'Integrações', 
    icon: Plug,
    children: [
      { key: 'conexoes', label: 'Conexões', icon: Link2, route: '/integracoes/conexoes' },
      { key: 'config-integracoes', label: 'Configurar', icon: Settings, route: '/integracoes/configurar' },
    ]
  },
  
  // 13. CONFIGURAÇÕES & ADMINISTRAÇÃO
  {
    key: 'config-admin',
    label: 'Configurações',
    icon: Settings,
    children: [
      // EMPRESA
      { key: 'dados-empresa', label: 'Dados da Empresa', icon: Building2, route: '/admin/empresa' },
      // ACESSO & CONTROLE
      { key: 'config-usuarios', label: 'Usuários', icon: Users, route: '/settings/usuarios' },
      { key: 'config-papeis', label: 'Papéis', icon: Shield, route: '/settings/papeis' },
      { key: 'config-permissoes', label: 'Permissões', icon: Key, route: '/settings/permissoes' },
      { key: 'gestao-usuarios', label: 'Gestão de Usuários', icon: UserCog, route: '/admin/gestao-usuarios' },
      { key: 'admin-papeis', label: 'Papéis e Permissões', icon: Shield, route: '/admin/permissoes' },
      { key: 'admin-seguranca', label: 'Segurança', icon: Shield, route: '/admin/seguranca' },
      // ADMINISTRAÇÃO
      { key: 'admin-config', label: 'Todas Configurações', icon: Settings, route: '/admin' },
    ]
  },
];

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

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0085FF]">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold text-sidebar-foreground">Caixa Forte</span>
        )}
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {menuItems.map((item) => {
            if (item.children) {
              const isOpen = openGroups.includes(item.key);
              const hasActive = hasActiveChild(item);

              return (
                <Collapsible key={item.key} open={isOpen} onOpenChange={() => toggleGroup(item.key)}>
                  <CollapsibleTrigger asChild>
                    <button className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      hasActive ? 'bg-sidebar-accent text-sidebar-primary' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}>
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </>
                      )}
                    </button>
                  </CollapsibleTrigger>
                  {!collapsed && (
                    <CollapsibleContent className="pl-4">
                      <div className="mt-1 space-y-1 border-l border-sidebar-border pl-4">
                        {item.children.map((child) => (
                          <button
                            key={child.key}
                            onClick={() => child.route && handleNavigate(child.route)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                              isActive(child.route) ? 'bg-sidebar-primary/20 text-sidebar-primary font-medium' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                            )}
                          >
                            <child.icon className="h-4 w-4 shrink-0" />
                            <span>{child.label}</span>
                          </button>
                        ))}
                      </div>
                    </CollapsibleContent>
                  )}
                </Collapsible>
              );
            }

            return (
              <button
                key={item.key}
                onClick={() => item.route && handleNavigate(item.route)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive(item.route) ? 'bg-sidebar-primary/20 text-sidebar-primary' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      <div className="border-t border-sidebar-border p-3">
        <button
          onClick={() => handleNavigate('/admin')}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Settings className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Configurações</span>}
        </button>
      </div>
    </div>
  );
});

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="fixed left-4 top-4 z-50 h-10 w-10 bg-background shadow-md border md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[280px] p-0 bg-sidebar border-sidebar-border">
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de Navegação</SheetTitle>
          </SheetHeader>
          <SidebarContent onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-64 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarContent />
      </aside>
    </>
  );
}

export default Sidebar;
