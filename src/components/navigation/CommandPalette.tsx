import { useState, useEffect, useMemo } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { useNavigation } from '@/contexts/NavigationContext';
import { useNavigationItems } from '@/hooks/useNavigation';
import {
  LayoutDashboard, ReceiptText, ArrowDownToLine, ArrowUpFromLine,
  Wallet, TrendingUp, Target, CreditCard, BookOpen, Landmark,
  FileCheck2, BarChart3, Gauge, LineChart, PieChart,
  FileBarChart, Calculator, Sparkles, Inbox,
  Bot, Database, Network, Users,
  Layers, Plug, ArrowLeftRight, Settings, Search,
  Plus, Upload, Download, Link2, Activity,
  AlertTriangle, Shield, FileSpreadsheet, Home, Star,
  ShoppingCart, Package, Briefcase, Boxes, Truck, DollarSign, Scale,
  ClipboardList, Building2, Banknote, RefreshCw,
  Send, MessageSquare, BellRing, Brain, Lightbulb, Globe, Zap,
  CircleDollarSign,
  type LucideIcon
} from 'lucide-react';

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard, ReceiptText, ArrowDownToLine, ArrowUpFromLine,
  Wallet, TrendingUp, Target, CreditCard, BookOpen, Landmark,
  FileCheck2, BarChart3, Gauge, LineChart, PieChart,
  FileBarChart, Calculator, Sparkles, Inbox,
  Bot, Database, Network, Users, Layers, Plug, ArrowLeftRight, 
  Settings, Search, Plus, Upload, Download, Link2, Activity,
  AlertTriangle, Shield, FileSpreadsheet, Home, Star,
  ShoppingCart, Package, Briefcase, Boxes, Truck, DollarSign, Scale,
  ClipboardList, Building2, Banknote, RefreshCw,
  Send, MessageSquare, BellRing, Brain, Lightbulb, Globe, Zap,
  CircleDollarSign,
};

const getIcon = (iconName: string) => iconMap[iconName] || Search;

const staticNavItems = [
  { key: 'produtos', label: 'Produtos', route: '/cadastros/produtos', icon: 'Package', category: 'Catálogo' },
  { key: 'posicao-caixa', label: 'Posição de Caixa', route: '/tesouraria/posicao', icon: 'Wallet', category: 'Financeiro' },
  { key: 'contas-receber', label: 'Contas a Receber', route: '/ar', icon: 'TrendingUp', category: 'Financeiro' },
  { key: 'contas-pagar', label: 'Contas a Pagar', route: '/ap', icon: 'ArrowDownToLine', category: 'Financeiro' },
  { key: 'fluxo-caixa', label: 'Fluxo de Caixa', route: '/fluxo-caixa', icon: 'TrendingUp', category: 'Financeiro' },
  { key: 'metas-financeiras', label: 'Metas Financeiras', route: '/metas-financeiras', icon: 'Target', category: 'Planejamento' },
  { key: 'livro-diario', label: 'Livro Diário', route: '/controladoria-livro-diario', icon: 'BookOpen', category: 'Contabilidade' },
  { key: 'balanco-patrimonial', label: 'Balanço Patrimonial', route: '/controladoria-balanco', icon: 'Scale', category: 'Contabilidade' },
  { key: 'dre', label: 'DRE (Resultado)', route: '/controladoria-dre', icon: 'PieChart', category: 'Contabilidade' },
  { key: 'nfe', label: 'NF-e', route: '/fiscal/nfe', icon: 'FileBarChart', category: 'Fiscal' },
  { key: 'cfo-virtual', label: 'CFO Virtual', route: '/ia/cfo-virtual', icon: 'Brain', category: 'IA' },
  { key: 'analista-inteligente', label: 'Analista Inteligente', route: '/ia/analista', icon: 'Sparkles', category: 'IA' },
  { key: 'monitor-anomalias', label: 'Monitor de Anomalias', route: '/compliance/anomalias', icon: 'AlertTriangle', category: 'IA' },
  { key: 'dashboards', label: 'Dashboards', route: '/paineis', icon: 'BarChart3', category: 'Relatórios' },
  { key: 'clientes-fornecedores', label: 'Clientes/Fornecedores', route: '/cadastros/clientes-fornecedores', icon: 'Users', category: 'Cadastros' },
  { key: 'admin-geral', label: 'Administração', route: '/admin', icon: 'Settings', category: 'Sistema' },
];

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen, quickActions, navigateTo, activeProfile } = useNavigation();
  const { data: navItems } = useNavigationItems();
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!commandPaletteOpen) setSearch('');
  }, [commandPaletteOpen]);

  const allNavItems = useMemo(() => {
    const dbItems = (navItems || [])
      .filter(item => !item.hidden_by_default && item.route)
      .map(item => ({ key: item.key, label: item.label_default, route: item.route!, icon: item.icon, category: 'Navegação' }));
    const dbKeys = new Set(dbItems.map(i => i.key));
    return [...dbItems, ...staticNavItems.filter(i => !dbKeys.has(i.key))];
  }, [navItems]);

  const filteredNavItems = useMemo(() => {
    const searchLower = search.toLowerCase();
    return allNavItems.filter(item => 
      item.label.toLowerCase().includes(searchLower) || item.category.toLowerCase().includes(searchLower)
    ).slice(0, 15);
  }, [allNavItems, search]);

  const groupedNavItems = useMemo(() => {
    const groups: Record<string, typeof filteredNavItems> = {};
    filteredNavItems.forEach(item => { groups[item.category] = [...(groups[item.category] || []), item]; });
    return groups;
  }, [filteredNavItems]);

  const globalActions = useMemo(() => [
    { key: 'cp.new_goal', label: 'Nova Meta', route: '/metas-financeiras', icon: 'Target' },
    { key: 'cp.cfo_virtual', label: 'CFO Virtual', route: '/ia/cfo-virtual', icon: 'Brain' },
  ].filter(a => a.label.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput placeholder="Buscar telas, ações..." value={search} onValueChange={setSearch} />
      <CommandList className="max-h-[400px]">
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
        {globalActions.length > 0 && (
          <CommandGroup heading="Ações Rápidas">
            {globalActions.map(action => {
              const Icon = getIcon(action.icon);
              return (
                <CommandItem key={action.key} value={action.label} onSelect={() => navigateTo(action.route, action.key)}>
                  <Icon className="mr-2 h-4 w-4 text-primary" /><span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
        {globalActions.length > 0 && <CommandSeparator />}
        {Object.entries(groupedNavItems).map(([category, items]) => (
          <CommandGroup key={category} heading={category}>
            {items.map(item => {
              const Icon = getIcon(item.icon);
              return (
                <CommandItem key={item.key} value={`${item.label} ${item.category}`} onSelect={() => navigateTo(item.route, item.key)}>
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" /><span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
