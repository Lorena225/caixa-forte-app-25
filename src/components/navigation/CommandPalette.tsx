import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  FileCheck2, BarChart3, Gauge, LineChart, ChartColumn, PieChart,
  FileBarChart, CalendarClock, Calculator, Sparkles, Inbox,
  MessageCircle, Bot, Wand2, Database, ListTree, Network, Users,
  Layers, Plug, ArrowLeftRight, Settings, PanelLeft, Search, Blocks,
  Plus, Upload, Download, CheckCircle2, Link2, FileUp, Activity,
  AlertTriangle, Lock, Shield, FileDown, FileSpreadsheet
} from 'lucide-react';

// Extended icon map for quick actions
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, ReceiptText, ArrowDownToLine, ArrowUpFromLine,
  Wallet, TrendingUp, Target, CreditCard, BookOpen, Landmark,
  FileCheck2, BarChart3, Gauge, LineChart, ChartColumn, PieChart,
  FileBarChart, CalendarClock, Calculator, Sparkles, Inbox,
  MessageCircle, Bot, Wand2, Database, ListTree, Network, Users,
  Layers, Plug, ArrowLeftRight, Settings, PanelLeft, Search, Blocks,
  Plus, Upload, Download, CheckCircle2, Link2, FileUp, Activity,
  AlertTriangle, Lock, Shield, FileDown, FileSpreadsheet
};

const getIcon = (iconName: string) => iconMap[iconName] || Search;

export function CommandPalette() {
  const navigate = useNavigate();
  const { 
    commandPaletteOpen, 
    setCommandPaletteOpen, 
    quickActions,
    navigateTo,
    activeProfile,
  } = useNavigation();
  const { data: navItems } = useNavigationItems();
  const [search, setSearch] = useState('');

  // Reset search when closing
  useEffect(() => {
    if (!commandPaletteOpen) {
      setSearch('');
    }
  }, [commandPaletteOpen]);

  // Filter navigation items
  const filteredNavItems = useMemo(() => {
    if (!navItems) return [];
    return navItems
      .filter(item => !item.hidden_by_default && item.route)
      .filter(item => 
        item.label_default.toLowerCase().includes(search.toLowerCase()) ||
        item.key.toLowerCase().includes(search.toLowerCase())
      )
      .slice(0, 10);
  }, [navItems, search]);

  // Filter quick actions
  const filteredActions = useMemo(() => {
    return quickActions.filter(action =>
      action.label.toLowerCase().includes(search.toLowerCase())
    );
  }, [quickActions, search]);

  // Global quick actions (always available)
  const globalActions = useMemo(() => [
    { key: 'cp.new_transaction', label: 'Novo Lançamento', route: '/lancamentos?action=new', icon: 'Plus' },
    { key: 'cp.new_ap', label: 'Novo Contas a Pagar', route: '/contas-pagar?action=new', icon: 'Plus' },
    { key: 'cp.new_ar', label: 'Novo Contas a Receber', route: '/contas-receber?action=new', icon: 'Plus' },
    { key: 'cp.import_statement', label: 'Importar Extrato', route: '/importar-exportar?tab=extrato', icon: 'Upload' },
    { key: 'cp.import_sheet', label: 'Importar Planilha', route: '/importar-exportar?tab=planilhas', icon: 'FileSpreadsheet' },
    { key: 'cp.export_report', label: 'Exportar Relatório', route: '/reports?export=1', icon: 'Download' },
    { key: 'cp.open_inbox', label: 'Abrir Inbox (Pendências)', route: '/autopilot/inbox', icon: 'Inbox' },
  ].filter(action => 
    action.label.toLowerCase().includes(search.toLowerCase())
  ), [search]);

  const handleSelect = (route: string, key?: string) => {
    navigateTo(route, key);
  };

  return (
    <CommandDialog open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen}>
      <CommandInput 
        placeholder="Buscar telas, ações ou cadastros..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

        {/* Profile Quick Actions */}
        {filteredActions.length > 0 && (
          <CommandGroup heading={`Ações Rápidas — ${activeProfile?.name || 'Perfil'}`}>
            {filteredActions.map((action) => {
              const Icon = getIcon(action.icon);
              return (
                <CommandItem
                  key={action.key}
                  value={action.label}
                  onSelect={() => handleSelect(action.route, action.key)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {filteredActions.length > 0 && <CommandSeparator />}

        {/* Global Quick Actions */}
        {globalActions.length > 0 && (
          <CommandGroup heading="Ações Globais">
            {globalActions.map((action) => {
              const Icon = getIcon(action.icon);
              return (
                <CommandItem
                  key={action.key}
                  value={action.label}
                  onSelect={() => handleSelect(action.route, action.key)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {globalActions.length > 0 && filteredNavItems.length > 0 && <CommandSeparator />}

        {/* Navigation Items */}
        {filteredNavItems.length > 0 && (
          <CommandGroup heading="Navegação">
            {filteredNavItems.map((item) => {
              const Icon = getIcon(item.icon);
              return (
                <CommandItem
                  key={item.key}
                  value={item.label_default}
                  onSelect={() => handleSelect(item.route!, item.key)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label_default}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{item.route}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
