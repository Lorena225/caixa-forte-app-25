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
  { key: 'inicio', label: 'Início', icon: Home, route: '/' },
  { key: 'favoritos', label: 'Favoritos', icon: Star, route: '/favoritos' },
  { key: 'ai-captura', label: 'Conta AI Captura', icon: Bot, route: '/autopiloto/caixa-entrada' },
  { 
    key: 'frente-caixa', 
    label: 'Frente de Caixa', 
    icon: ShoppingCart,
    children: [
      { key: 'pdv', label: 'PDV', icon: CreditCard, route: '/frente-caixa' },
      { key: 'nova-venda', label: 'Nova Venda', icon: Receipt, route: '/vendas/nova' },
    ]
  },
  { 
    key: 'produtos', 
    label: 'Produtos', 
    icon: Package,
    children: [
      { key: 'lista-produtos', label: 'Lista de Produtos', icon: Package, route: '/cadastros/produtos' },
      { key: 'categorias', label: 'Categorias', icon: Boxes, route: '/cadastros/dimensoes' },
    ]
  },
  { 
    key: 'servicos', 
    label: 'Serviços', 
    icon: Briefcase,
    children: [
      { key: 'lista-servicos', label: 'Lista de Serviços', icon: FileText, route: '/cadastros/servicos' },
    ]
  },
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
  { 
    key: 'financeiro', 
    label: 'Financeiro', 
    icon: DollarSign,
    children: [
      { key: 'contas-pagar', label: 'Contas a Pagar', icon: Receipt, route: '/ap' },
      { key: 'contas-receber', label: 'Contas a Receber', icon: Wallet, route: '/ar' },
      { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
      { key: 'tesouraria', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
      { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'conciliacao', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
      { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
      { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
      { key: 'cnab', label: 'CNAB', icon: Send, route: '/tesouraria/cnab' },
      { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
      { key: 'caixa-fisica', label: 'Caixa Física', icon: Banknote, route: '/tesouraria/caixa-fisica' },
    ]
  },
  { 
    key: 'contabil', 
    label: 'Contábil', 
    icon: BookOpen,
    children: [
      { key: 'plano-contas', label: 'Plano de Contas', icon: ClipboardList, route: '/cadastros/plano-contas' },
      { key: 'centros-custo', label: 'Centro de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
      { key: 'lancamentos-contabeis', label: 'Lançamentos Contábeis', icon: FileText, route: '/contabilidade/lancamentos' },
      { key: 'reclassificacao', label: 'Reclassificação', icon: Scale, route: '/contabilidade/reclassificacao' },
    ]
  },
  { 
    key: 'operacional', 
    label: 'Operacional', 
    icon: Network,
    children: [
      { key: 'estrutura-org', label: 'Estrutura Organizacional', icon: Network, route: '/operacional/estrutura' },
      { key: 'centros-custodia', label: 'Centros de Custódia', icon: FolderTree, route: '/operacional/centros-custodia' },
      { key: 'departamentos', label: 'Seções e Departamentos', icon: Building2, route: '/operacional/departamentos' },
      { key: 'responsaveis', label: 'Responsáveis por CC', icon: UserCheck, route: '/operacional/responsaveis' },
    ]
  },
  {
    key: 'estoque', 
    label: 'Estoque', 
    icon: Boxes,
    children: [
      { key: 'inventario', label: 'Inventário', icon: Package, route: '/estoque/inventario' },
      { key: 'movimentacoes', label: 'Movimentações', icon: TrendingUp, route: '/estoque/movimentacoes' },
    ]
  },
  { 
    key: 'fiscal', 
    label: 'Fiscal', 
    icon: FileSpreadsheet,
    children: [
      { key: 'nfe', label: 'NF-e', icon: FileText, route: '/fiscal/nfe' },
      { key: 'nfce', label: 'NFC-e', icon: Receipt, route: '/fiscal/nfce' },
      { key: 'cupom-fiscal', label: 'Cupom Fiscal', icon: Receipt, route: '/fiscal/cupom-fiscal' },
      { key: 'danfe', label: 'DANFE', icon: FileText, route: '/fiscal/danfe' },
      { key: 'analise-fiscal', label: 'Análise Fiscal', icon: PieChart, route: '/fiscal/analise' },
    ]
  },
  { 
    key: 'relatorios', 
    label: 'Relatórios', 
    icon: BarChart3,
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
  { 
    key: 'integracoes', 
    label: 'Integrações', 
    icon: Plug,
    children: [
      { key: 'conexoes', label: 'Conexões', icon: Link2, route: '/integracoes/conexoes' },
      { key: 'config-integracoes', label: 'Configurar', icon: Settings, route: '/integracoes/configurar' },
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
