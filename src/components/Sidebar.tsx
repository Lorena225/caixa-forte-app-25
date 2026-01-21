import { memo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Star,
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
  ClipboardList,
  Building2,
  ArrowRightLeft,
  FileCheck,
  Banknote,
  RefreshCw,
  Send,
  MessageSquare,
  BellRing,
  Brain,
  Target,
  Shield,
  Key,
  Bot,
  Zap,
  LineChart,
  Activity,
  FileSearch,
  Lock,
  History,
  AlertTriangle,
  CheckCircle,
  Globe,
  Cpu,
  Layers,
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
  // 1. Início
  { key: 'inicio', label: 'Início', icon: Home, route: '/' },
  
  // 2. Favoritos
  { key: 'favoritos', label: 'Favoritos', icon: Star, route: '/favoritos' },
  
  // 3. Frente de Caixa (PDV, Vendas)
  { 
    key: 'frente-caixa', 
    label: 'Frente de Caixa', 
    icon: ShoppingCart,
    children: [
      { key: 'pdv', label: 'PDV', icon: CreditCard, route: '/frente-caixa' },
      { key: 'nova-venda', label: 'Nova Venda', icon: Receipt, route: '/vendas/nova' },
      { key: 'pedidos-venda', label: 'Pedidos', icon: FileText, route: '/vendas/pedidos' },
      { key: 'orcamentos', label: 'Orçamentos', icon: Calculator, route: '/vendas/orcamentos' },
    ]
  },
  
  // 4. Catálogo (Produtos + Serviços)
  { 
    key: 'catalogo', 
    label: 'Catálogo', 
    icon: Package,
    children: [
      { key: 'produtos', label: 'Produtos', icon: Package, route: '/cadastros/produtos' },
      { key: 'servicos', label: 'Serviços', icon: Briefcase, route: '/cadastros/servicos' },
      { key: 'categorias', label: 'Categorias', icon: Boxes, route: '/cadastros/dimensoes' },
      { key: 'estoque', label: 'Estoque', icon: Boxes, route: '/estoque' },
    ]
  },
  
  // 5. Compras (Pedidos, Cotações, Fornecedores)
  { 
    key: 'compras', 
    label: 'Compras', 
    icon: Truck,
    children: [
      { key: 'pedidos-compra', label: 'Pedidos', icon: FileText, route: '/compras/pedidos' },
      { key: 'cotacoes', label: 'Cotações', icon: Calculator, route: '/compras/cotacoes' },
      { key: 'entradas', label: 'Entradas', icon: ArrowRightLeft, route: '/compras/entradas' },
      { key: 'fornecedores', label: 'Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
    ]
  },
  
  // 6. Financeiro (Contas a Pagar/Receber, Fluxo, Tesouraria)
  { 
    key: 'financeiro', 
    label: 'Financeiro', 
    icon: DollarSign,
    children: [
      { key: 'contas-pagar', label: 'Contas a Pagar', icon: Receipt, route: '/ap' },
      { key: 'contas-receber', label: 'Contas a Receber', icon: Wallet, route: '/ar' },
      { key: 'fluxo-caixa', label: 'Fluxo de Caixa', icon: TrendingUp, route: '/fluxo-caixa' },
      { key: 'tesouraria', label: 'Tesouraria', icon: CreditCard, route: '/tesouraria' },
      { key: 'conciliacao', label: 'Conciliação Bancária', icon: RefreshCw, route: '/tesouraria/conciliacao' },
      { key: 'posicao-caixa', label: 'Posição de Caixa', icon: Wallet, route: '/tesouraria/posicao' },
      { key: 'transferencias', label: 'Transferências', icon: ArrowRightLeft, route: '/tesouraria/transferencias' },
      { key: 'cnab', label: 'CNAB', icon: Send, route: '/tesouraria/cnab' },
      { key: 'cheques', label: 'Cheques', icon: FileCheck, route: '/tesouraria/cheques' },
      { key: 'caixa-fisica', label: 'Caixa Física', icon: Banknote, route: '/tesouraria/caixa-fisica' },
      { key: 'orcamento-real', label: 'Orçamento vs Real', icon: Target, route: '/financeiro/orcamento-real' },
    ]
  },
  
  // 7. Cadastros (Clientes, Plano, Bancos & Contas)
  { 
    key: 'cadastros', 
    label: 'Cadastros', 
    icon: ClipboardList,
    children: [
      { key: 'clientes-fornecedores', label: 'Clientes/Fornecedores', icon: Users, route: '/cadastros/clientes-fornecedores' },
      { key: 'plano-contas', label: 'Plano de Contas', icon: BookOpen, route: '/cadastros/plano-contas' },
      { key: 'centros-custo', label: 'Centros de Custo', icon: Landmark, route: '/cadastros/centros-custo' },
      { key: 'contas-bancarias', label: 'Contas Bancárias', icon: Building2, route: '/cadastros/contas-bancarias' },
      { key: 'bancos-ref', label: 'Bancos (Referência)', icon: Landmark, route: '/cadastros/bancos-referencia' },
      { key: 'agencias', label: 'Agências', icon: Building2, route: '/cadastros/agencias' },
      { key: 'carteiras', label: 'Carteiras', icon: Wallet, route: '/cadastros/carteiras' },
    ]
  },
  
  // 8. 🤖 IA & AUTOMAÇÃO
  { 
    key: 'ia-automacao', 
    label: '🤖 IA & Automação', 
    icon: Bot,
    children: [
      { key: 'ia-inbox', label: 'Conta AI Captura', icon: MessageSquare, route: '/autopiloto/caixa-entrada' },
      { key: 'ia-assistente', label: 'Assistente IA', icon: Brain, route: '/ia/analista' },
      { key: 'ia-classificacao', label: 'Classificação Auto', icon: Cpu, route: '/ia/configuracoes' },
      { key: 'ia-previsao', label: 'Previsão & Forecast', icon: TrendingUp, route: '/financeiro/rolling-forecast' },
      { key: 'ia-whatsapp', label: 'Agente WhatsApp', icon: MessageSquare, route: '/ia/whatsapp' },
      { key: 'ia-alertas', label: 'Monitor & Alertas', icon: BellRing, route: '/ia/alertas' },
      { key: 'ia-cfo', label: 'CFO Virtual', icon: Target, route: '/ia/cfo-virtual' },
      { key: 'automacoes', label: 'Automações', icon: Zap, route: '/automacoes' },
      { key: 'jobs', label: 'Jobs & Processos', icon: Activity, route: '/admin/jobs' },
    ]
  },
  
  // 9. 📊 RELATÓRIOS & BI
  { 
    key: 'relatorios-bi', 
    label: '📊 Relatórios & BI', 
    icon: BarChart3,
    children: [
      { key: 'central-relatorios', label: 'Central de Relatórios', icon: FileText, route: '/relatorios' },
      { key: 'dre', label: 'DRE', icon: PieChart, route: '/dre' },
      { key: 'balanco', label: 'Balanço Patrimonial', icon: Layers, route: '/relatorios/balanco' },
      { key: 'balancete', label: 'Balancete', icon: FileSpreadsheet, route: '/relatorios/balancete' },
      { key: 'livro-razao', label: 'Livro Razão', icon: BookOpen, route: '/relatorios/livro-razao' },
      { key: 'livro-diario', label: 'Livro Diário', icon: BookOpen, route: '/relatorios/livro-diario' },
      { key: 'analise-vendas', label: 'Análise de Vendas', icon: TrendingUp, route: '/relatorios/analise-vendas' },
      { key: 'analise-compras', label: 'Análise de Compras', icon: Truck, route: '/relatorios/analise-compras' },
      { key: 'dashboards', label: 'Dashboards', icon: LineChart, route: '/paineis' },
      { key: 'performance', label: 'Performance', icon: Activity, route: '/admin/performance' },
    ]
  },
  
  // 10. 🔒 SEGURANÇA & AUDITORIA
  { 
    key: 'seguranca-auditoria', 
    label: '🔒 Segurança & Auditoria', 
    icon: Shield,
    children: [
      { key: 'audit-logs', label: 'Logs de Auditoria', icon: History, route: '/admin/audit-logs' },
      { key: 'compliance', label: 'Compliance', icon: CheckCircle, route: '/admin/audit-compliance' },
      { key: 'integridade', label: 'Integridade de Dados', icon: FileSearch, route: '/admin/seguranca' },
      { key: 'anomalias', label: 'Detecção de Anomalias', icon: AlertTriangle, route: '/compliance/anomalias' },
      { key: 'security-dashboard', label: 'Dashboard Segurança', icon: Lock, route: '/admin/security-dashboard' },
      { key: 'ia-logs', label: 'Logs IA', icon: Bot, route: '/ia/logs' },
    ]
  },
  
  // 11. ⚙️ CONFIGURAÇÕES (5 abas)
  { 
    key: 'configuracoes', 
    label: '⚙️ Configurações', 
    icon: Settings,
    children: [
      // Empresa
      { key: 'config-empresa', label: 'Empresa', icon: Building2, route: '/admin/empresa' },
      { key: 'config-branding', label: 'Marca & Aparência', icon: Sparkles, route: '/admin/branding' },
      // Acesso
      { key: 'config-usuarios', label: 'Usuários', icon: Users, route: '/settings/usuarios' },
      { key: 'config-papeis', label: 'Papéis', icon: Shield, route: '/settings/papeis' },
      { key: 'config-permissoes', label: 'Permissões', icon: Key, route: '/settings/permissoes' },
      // Fiscal
      { key: 'config-fiscal', label: 'Fiscal', icon: FileSpreadsheet, route: '/admin/fiscal' },
      { key: 'config-certificados', label: 'Certificados', icon: Lock, route: '/fiscal/certificados' },
      // Sistema
      { key: 'config-sistema', label: 'Sistema', icon: Cpu, route: '/admin' },
      { key: 'config-backup', label: 'Backup', icon: History, route: '/admin/backup' },
      // Integrações
      { key: 'config-integracoes', label: 'Integrações', icon: Plug, route: '/integracoes/conexoes' },
      { key: 'config-api', label: 'API & Webhooks', icon: Globe, route: '/desenvolvedores' },
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
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
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
