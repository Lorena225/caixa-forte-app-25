import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Download,
  TrendingUp,
  Shield,
  Zap,
  Database,
  LayoutDashboard,
  DollarSign,
  FileText,
  Package,
  Truck,
  ShoppingCart,
  Users,
  Bot,
  BarChart3,
  Settings,
  Lock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

type ModuleStatus = 'implementado' | 'parcial' | 'ausente';

interface SubModule {
  name: string;
  status: ModuleStatus;
  observations: string;
  tables?: string[];
  routes?: string[];
}

interface ModuleGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  colorClass: string;
  submodules: SubModule[];
}

const STATUS_CONFIG: Record<ModuleStatus, { label: string; color: string; icon: React.ElementType; bgClass: string }> = {
  implementado: {
    label: 'Implementado',
    color: 'text-emerald-600',
    icon: CheckCircle2,
    bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  parcial: {
    label: 'Parcial',
    color: 'text-amber-600',
    icon: AlertCircle,
    bgClass: 'bg-amber-50 dark:bg-amber-950/30',
  },
  ausente: {
    label: 'Ausente',
    color: 'text-red-600',
    icon: XCircle,
    bgClass: 'bg-red-50 dark:bg-red-950/30',
  },
};

// Complete ERP Module Map
const MODULE_MAP: ModuleGroup[] = [
  {
    id: 'financeiro',
    name: 'Financeiro',
    icon: DollarSign,
    colorClass: 'text-menu-financeiro',
    submodules: [
      { name: 'Contas a Pagar (AP)', status: 'implementado', observations: 'CRUD completo, baixas, parcelamentos, integração contábil', tables: ['transactions'], routes: ['/ap'] },
      { name: 'Contas a Receber (AR)', status: 'implementado', observations: 'CRUD completo, cobrança, aging, integração contábil', tables: ['transactions'], routes: ['/ar'] },
      { name: 'Tesouraria', status: 'implementado', observations: 'Posição de caixa, caixa física, transferências, cheques', tables: ['cash_registers', 'bank_transfers', 'cheques'], routes: ['/tesouraria'] },
      { name: 'Gestão Bancária', status: 'implementado', observations: 'Múltiplas contas, extratos, conciliação automática/manual', tables: ['bank_accounts', 'bank_statements', 'bank_reconciliations'], routes: ['/tesouraria/conciliacao'] },
      { name: 'Fluxo de Caixa', status: 'implementado', observations: 'Projeção 90 dias, cenários, sazonalidade', tables: ['cash_positions'], routes: ['/fluxo-caixa'] },
      { name: 'CNAB 240/400', status: 'implementado', observations: 'Remessa e retorno, mapeamento de ocorrências', tables: ['cnab_files', 'cnab_remittances'], routes: ['/tesouraria/cnab'] },
      { name: 'Boletos', status: 'implementado', observations: 'Geração, registro, baixa automática', tables: ['boletos', 'boleto_events'], routes: ['/tesouraria/boletos'] },
      { name: 'Cartões', status: 'implementado', observations: 'Adquirentes, vendas, conciliação de recebíveis', tables: ['card_sales', 'card_receivables', 'card_settlements'], routes: ['/tesouraria/cartoes'] },
      { name: 'Empréstimos/Financiamentos', status: 'implementado', observations: 'SAC/Price, carência, geração automática de parcelas', tables: ['loan_contracts', 'loan_installments'], routes: ['/tesouraria/contratos'] },
      { name: 'Investimentos', status: 'parcial', observations: 'Cadastro básico, falta rentabilidade e movimentações detalhadas', tables: ['investments'], routes: ['/financeiro/investimentos'] },
      { name: 'Câmbio', status: 'ausente', observations: 'Necessário para operações internacionais', tables: [], routes: [] },
      { name: 'Orçamento Anual', status: 'implementado', observations: 'Budget master, linhas, revisões, cenários', tables: ['budget_master', 'budget_lines', 'budget_scenarios'], routes: ['/paineis/orcamento'] },
      { name: 'Rolling Forecast', status: 'implementado', observations: 'Previsão contínua com ponto de corte ajustável', tables: ['budget_forecasts'], routes: ['/financeiro/rolling-forecast'] },
      { name: 'Simulações What-If', status: 'implementado', observations: 'Análise de impacto de variáveis', tables: ['budget_simulations'], routes: ['/financeiro/simulacoes-orcamento'] },
    ],
  },
  {
    id: 'contabil',
    name: 'Contábil',
    icon: FileText,
    colorClass: 'text-menu-contabil',
    submodules: [
      { name: 'Plano de Contas', status: 'implementado', observations: 'Hierarquia multinível, contas redutoras', tables: ['accounts', 'account_categories'], routes: ['/cadastros/plano-contas'] },
      { name: 'Centros de Custo', status: 'implementado', observations: 'Hierarquia, responsáveis, fechamento', tables: ['cost_centers', 'cost_center_responsibles'], routes: ['/cadastros/centros-custo'] },
      { name: 'Lançamentos Contábeis', status: 'implementado', observations: 'Partida dobrada, estornos, reclassificações', tables: ['journal_entries', 'journal_entry_lines'], routes: ['/lancamentos'] },
      { name: 'Livro Diário', status: 'implementado', observations: 'Geração automática com filtros', tables: ['journal_entries'], routes: ['/relatorios/livro-diario'] },
      { name: 'Livro Razão', status: 'implementado', observations: 'Por conta e período', tables: ['journal_entries'], routes: ['/relatorios/livro-razao'] },
      { name: 'Balancete', status: 'implementado', observations: 'Saldos por conta e período', tables: [], routes: ['/relatorios/balancete'] },
      { name: 'Balanço Patrimonial', status: 'implementado', observations: 'Demonstrativo padrão CPC', tables: [], routes: ['/relatorios/balanco'] },
      { name: 'DRE', status: 'implementado', observations: 'Demonstração de resultado', tables: [], routes: ['/dre'] },
    ],
  },
  {
    id: 'fiscal',
    name: 'Fiscal',
    icon: FileText,
    colorClass: 'text-menu-fiscal',
    submodules: [
      { name: 'NF-e', status: 'implementado', observations: 'Emissão, cancelamento, inutilização, XML 4.00', tables: ['notas_fiscais', 'nf_items'], routes: ['/fiscal/nfe'] },
      { name: 'NFS-e', status: 'implementado', observations: 'Emissão para serviços', tables: ['nfse'], routes: ['/fiscal/nfse'] },
      { name: 'NFC-e', status: 'parcial', observations: 'Estrutura criada, falta integração SEFAZ', tables: [], routes: ['/fiscal/nfce'] },
      { name: 'SPED Fiscal', status: 'implementado', observations: 'Geração de blocos', tables: ['sped_jobs'], routes: ['/fiscal/sped-fiscal'] },
      { name: 'SPED Contábil', status: 'implementado', observations: 'ECD', tables: ['sped_jobs'], routes: ['/fiscal/sped-contabil'] },
      { name: 'Bloco K', status: 'parcial', observations: 'Estrutura básica, falta integração produção', tables: [], routes: ['/fiscal/sped'] },
      { name: 'Apuração de Impostos', status: 'implementado', observations: 'PIS, COFINS, ICMS, ISS, IRPJ, CSLL', tables: ['apuracoes_impostos'], routes: ['/fiscal/apuracao'] },
      { name: 'Obrigações Acessórias', status: 'implementado', observations: 'Calendário e alertas', tables: ['calendario_obrigacoes', 'tax_obligations'], routes: ['/fiscal/obrigacoes'] },
      { name: 'Certificados Digitais', status: 'implementado', observations: 'Gestão e alertas de vencimento', tables: ['certificados_digitais'], routes: ['/fiscal/certificados'] },
    ],
  },
  {
    id: 'compras',
    name: 'Compras',
    icon: ShoppingCart,
    colorClass: 'text-menu-compras',
    submodules: [
      { name: 'Requisições', status: 'ausente', observations: 'Necessário para workflow de aprovação', tables: [], routes: [] },
      { name: 'Cotações', status: 'implementado', observations: 'Múltiplos fornecedores, comparativo', tables: ['cotacoes', 'cotacoes_fornecedores', 'cotacoes_itens'], routes: ['/compras/cotacoes'] },
      { name: 'Pedidos de Compra', status: 'implementado', observations: 'CRUD completo, aprovação', tables: ['purchase_orders', 'purchase_order_items'], routes: ['/compras/pedidos'] },
      { name: 'Recebimento', status: 'parcial', observations: 'Estrutura básica, falta conferência física', tables: ['purchase_receipts'], routes: ['/compras/entradas'] },
      { name: 'Avaliação de Fornecedores', status: 'parcial', observations: 'Rating básico, falta histórico detalhado', tables: ['counterparties'], routes: ['/cadastros/clientes-fornecedores'] },
    ],
  },
  {
    id: 'vendas',
    name: 'Vendas',
    icon: TrendingUp,
    colorClass: 'text-menu-vendas',
    submodules: [
      { name: 'Cotações/Orçamentos', status: 'implementado', observations: 'Proposta comercial com validade', tables: ['sales_orders'], routes: ['/vendas/orcamentos'] },
      { name: 'Pedidos de Venda', status: 'implementado', observations: 'CRUD completo, conversão de orçamento', tables: ['sales_orders', 'sales_order_items'], routes: ['/vendas/pedidos'] },
      { name: 'Faturamento', status: 'implementado', observations: 'Geração de NF a partir de pedido', tables: ['customer_invoices'], routes: ['/vendas/faturamento'] },
      { name: 'Comissões', status: 'implementado', observations: 'Regras e cálculo automático', tables: ['commission_rules', 'commissions'], routes: ['/vendas/comissoes'] },
      { name: 'Metas de Vendas', status: 'parcial', observations: 'Estrutura básica, falta acompanhamento detalhado', tables: ['sales_goals'], routes: ['/metas'] },
      { name: 'Análise de Vendas', status: 'implementado', observations: 'Por vendedor, produto, região', tables: [], routes: ['/relatorios/analise-vendas'] },
      { name: 'PDV/Frente de Caixa', status: 'implementado', observations: 'Venda rápida, múltiplos pagamentos', tables: [], routes: ['/frente-caixa'] },
    ],
  },
  {
    id: 'estoque',
    name: 'Estoque',
    icon: Package,
    colorClass: 'text-menu-operacoes',
    submodules: [
      { name: 'Cadastro de Produtos', status: 'implementado', observations: 'SKU, categorias, dimensões', tables: ['products'], routes: ['/cadastros/produtos'] },
      { name: 'Movimentações', status: 'implementado', observations: 'Entrada, saída, transferência', tables: ['stock_movements'], routes: ['/estoque/movimentacoes'] },
      { name: 'Inventário', status: 'implementado', observations: 'Contagem física, ajustes', tables: ['inventories', 'inventory_items'], routes: ['/estoque/inventario'] },
      { name: 'Múltiplos Armazéns', status: 'parcial', observations: 'Estrutura criada, falta gestão completa', tables: ['warehouses'], routes: [] },
      { name: 'Lotes e Validade', status: 'parcial', observations: 'Campos existem, falta rastreabilidade completa', tables: ['stock_movements'], routes: [] },
    ],
  },
  {
    id: 'supplychain',
    name: 'Supply Chain / MRP',
    icon: Truck,
    colorClass: 'text-menu-compras',
    submodules: [
      { name: 'Curva ABC', status: 'ausente', observations: 'Classificação de materiais por criticidade', tables: [], routes: [] },
      { name: 'Previsão de Demanda', status: 'parcial', observations: 'Estrutura básica em demand_forecasts', tables: ['demand_forecasts'], routes: [] },
      { name: 'MRP/MRPII', status: 'ausente', observations: 'Planejamento de necessidades de materiais', tables: [], routes: [] },
      { name: 'Ponto de Pedido', status: 'parcial', observations: 'Campo min_stock em produtos', tables: ['products'], routes: [] },
      { name: 'Lead Time', status: 'parcial', observations: 'Campo em produtos, falta automação', tables: ['products'], routes: [] },
      { name: 'Fornecedores Críticos', status: 'ausente', observations: 'Identificação de dependências', tables: [], routes: [] },
    ],
  },
  {
    id: 'contratos',
    name: 'Contratos',
    icon: FileText,
    colorClass: 'text-menu-financeiro',
    submodules: [
      { name: 'Cadastro de Contratos', status: 'implementado', observations: 'Prazos, valores, condições', tables: ['contracts'], routes: ['/contratos'] },
      { name: 'Alertas de Vencimento', status: 'implementado', observations: 'Notificações automáticas', tables: ['contract_alerts'], routes: [] },
      { name: 'Renovação Automática', status: 'parcial', observations: 'Flag exists, falta workflow', tables: ['contracts'], routes: [] },
      { name: 'Contratos Recorrentes', status: 'implementado', observations: 'Geração de títulos periódicos', tables: ['contratos_recorrentes'], routes: [] },
    ],
  },
  {
    id: 'projetos',
    name: 'Projetos e OS',
    icon: LayoutDashboard,
    colorClass: 'text-menu-operacoes',
    submodules: [
      { name: 'Cadastro de Projetos', status: 'parcial', observations: 'Estrutura básica criada', tables: ['projects'], routes: [] },
      { name: 'Ordens de Serviço', status: 'ausente', observations: 'Necessário para controle operacional', tables: [], routes: [] },
      { name: 'Alocação de Recursos', status: 'ausente', observations: 'Pessoas, horas, custos', tables: [], routes: [] },
      { name: 'Faturamento por Projeto', status: 'ausente', observations: 'Integração com vendas', tables: [], routes: [] },
      { name: 'Custos por Projeto', status: 'parcial', observations: 'Via centro de custo', tables: ['cost_centers'], routes: [] },
    ],
  },
  {
    id: 'controladoria',
    name: 'Controladoria / Custeio',
    icon: BarChart3,
    colorClass: 'text-menu-contabil',
    submodules: [
      { name: 'Custeio ABC', status: 'parcial', observations: 'Atividades e direcionadores criados', tables: ['costing_activities', 'cost_drivers'], routes: [] },
      { name: 'Ponto de Equilíbrio', status: 'parcial', observations: 'Parâmetros básicos', tables: ['breakeven_params'], routes: [] },
      { name: 'Margem de Contribuição', status: 'ausente', observations: 'Análise por produto/serviço', tables: [], routes: [] },
      { name: 'Alavancagem Operacional', status: 'ausente', observations: 'GAO, GAF, GAT', tables: [], routes: [] },
      { name: 'Análise de Custos', status: 'implementado', observations: 'Dashboard básico', tables: [], routes: ['/financeiro/analise-custos'] },
    ],
  },
  {
    id: 'compliance',
    name: 'Compliance / Auditoria',
    icon: Shield,
    colorClass: 'text-menu-ia',
    submodules: [
      { name: 'Trilha de Auditoria', status: 'implementado', observations: 'Logs completos com hash chain', tables: ['audit_logs', 'audit_integrity_checks'], routes: ['/controladoria-auditoria'] },
      { name: 'Segregação de Funções', status: 'implementado', observations: 'Regras SoD configuráveis', tables: ['sod_rules', 'sod_violations'], routes: ['/admin/sod'] },
      { name: 'Aprovações Multinível', status: 'implementado', observations: 'Workflows configuráveis', tables: ['approval_workflows', 'approval_requests'], routes: [] },
      { name: 'Controles Internos', status: 'parcial', observations: 'Básico implementado, falta COSO completo', tables: [], routes: [] },
      { name: 'Detecção de Anomalias', status: 'implementado', observations: 'IA para fraudes e duplicidades', tables: ['anomaly_detections'], routes: ['/compliance/anomalias'] },
      { name: 'Relatórios de Compliance', status: 'implementado', observations: 'LGPD, SOX, Basel III', tables: ['compliance_reports'], routes: [] },
    ],
  },
  {
    id: 'bi',
    name: 'BI / Dashboards',
    icon: BarChart3,
    colorClass: 'text-menu-relatorios',
    submodules: [
      { name: 'Dashboard Executivo', status: 'implementado', observations: 'KPIs principais, personalizável', tables: [], routes: ['/paineis/executivo'] },
      { name: 'Dashboard AR', status: 'implementado', observations: 'Aging, inadimplência', tables: [], routes: ['/paineis/ar'] },
      { name: 'Dashboard AP', status: 'implementado', observations: 'Vencimentos, fornecedores', tables: [], routes: ['/paineis/ap'] },
      { name: 'Dashboard Fluxo de Caixa', status: 'implementado', observations: 'Projeção e histórico', tables: [], routes: ['/paineis/fluxo-caixa'] },
      { name: 'Dashboard Orçamentário', status: 'implementado', observations: 'Orçado x Realizado', tables: [], routes: ['/paineis/orcamento'] },
      { name: 'Balanced Scorecard', status: 'ausente', observations: 'BSC com 4 perspectivas', tables: [], routes: [] },
      { name: 'Análises Preditivas', status: 'parcial', observations: 'Previsão de fluxo implementada', tables: [], routes: [] },
    ],
  },
  {
    id: 'ia',
    name: 'IA & Automação',
    icon: Bot,
    colorClass: 'text-menu-ia',
    submodules: [
      { name: 'CFO Virtual', status: 'implementado', observations: 'Insights automáticos, linguagem natural', tables: ['cfo_insights'], routes: ['/ia/cfo-virtual'] },
      { name: 'Analista de Chat', status: 'implementado', observations: 'Consultas SQL via IA', tables: ['ai_analyst_conversations', 'ai_analyst_messages'], routes: ['/ia/chat'] },
      { name: 'Agente WhatsApp', status: 'implementado', observations: 'Comandos financeiros via mensagem', tables: ['ai_whatsapp_messages', 'whatsapp_connections'], routes: ['/ia/whatsapp'] },
      { name: 'Monitor Financeiro', status: 'implementado', observations: 'Alertas proativos de IA', tables: ['ai_monitor_alerts'], routes: ['/ia/monitor'] },
      { name: 'Automações', status: 'implementado', observations: 'Regras configuráveis', tables: ['automation_rules', 'automation_logs'], routes: ['/automacoes'] },
    ],
  },
  {
    id: 'cadastros',
    name: 'Cadastros Base',
    icon: Database,
    colorClass: 'text-menu-catalogo',
    submodules: [
      { name: 'Clientes', status: 'implementado', observations: 'Dados completos, limites de crédito', tables: ['clientes', 'counterparties'], routes: ['/cadastros/clientes-fornecedores'] },
      { name: 'Fornecedores', status: 'implementado', observations: 'Dados completos, rating', tables: ['counterparties'], routes: ['/cadastros/clientes-fornecedores'] },
      { name: 'Produtos', status: 'implementado', observations: 'SKU, categorias, tributação', tables: ['products'], routes: ['/cadastros/produtos'] },
      { name: 'Serviços', status: 'implementado', observations: 'Catálogo de serviços', tables: ['services'], routes: ['/cadastros/servicos'] },
      { name: 'Condições de Pagamento', status: 'implementado', observations: 'Prazos, parcelamentos', tables: ['condicoes_pagamento'], routes: [] },
      { name: 'Import/Export', status: 'implementado', observations: 'CSV, XLSX com validação', tables: [], routes: ['/importar-exportar'] },
    ],
  },
  {
    id: 'seguranca',
    name: 'Segurança',
    icon: Lock,
    colorClass: 'text-destructive',
    submodules: [
      { name: 'Autenticação', status: 'implementado', observations: 'Email/senha, MFA disponível', tables: [], routes: ['/auth'] },
      { name: 'RBAC', status: 'implementado', observations: 'Papéis e permissões granulares', tables: ['roles', 'permissions', 'user_roles'], routes: ['/admin/gestao-usuarios'] },
      { name: 'Multi-Tenant', status: 'implementado', observations: 'RLS em todas as tabelas', tables: ['companies', 'company_users'], routes: [] },
      { name: 'API Keys', status: 'implementado', observations: 'Chaves com escopos e rate limiting', tables: ['api_keys', 'api_logs'], routes: ['/developers/api-keys'] },
      { name: 'Logs de Sessão', status: 'implementado', observations: 'IP, device, duração', tables: ['user_sessions', 'security_events'], routes: [] },
    ],
  },
];

function calculateStats(modules: ModuleGroup[]) {
  let total = 0;
  let implemented = 0;
  let partial = 0;
  let missing = 0;

  modules.forEach((group) => {
    group.submodules.forEach((sub) => {
      total++;
      if (sub.status === 'implementado') implemented++;
      else if (sub.status === 'parcial') partial++;
      else missing++;
    });
  });

  return {
    total,
    implemented,
    partial,
    missing,
    implementedPercent: Math.round((implemented / total) * 100),
    partialPercent: Math.round((partial / total) * 100),
    missingPercent: Math.round((missing / total) * 100),
    overallScore: Math.round(((implemented + partial * 0.5) / total) * 100),
  };
}

function StatusBadge({ status }: { status: ModuleStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', config.color, config.bgClass)}>
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}

function ModuleCard({ group, expanded, onToggle }: { group: ModuleGroup; expanded: boolean; onToggle: () => void }) {
  const Icon = group.icon;
  const stats = useMemo(() => {
    const impl = group.submodules.filter((s) => s.status === 'implementado').length;
    const part = group.submodules.filter((s) => s.status === 'parcial').length;
    const total = group.submodules.length;
    return { impl, part, total, percent: Math.round(((impl + part * 0.5) / total) * 100) };
  }, [group]);

  return (
    <Collapsible open={expanded} onOpenChange={onToggle}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', group.colorClass, 'bg-current/10')}>
                  <Icon className={cn('h-5 w-5', group.colorClass)} />
                </div>
                <div>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <CardDescription>
                    {stats.impl} implementados, {stats.part} parciais de {stats.total}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-2xl font-bold text-foreground">{stats.percent}%</div>
                  <Progress value={stats.percent} className="w-24 h-2" />
                </div>
                {expanded ? <ChevronDown className="h-5 w-5 text-muted-foreground" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Submódulo</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 font-medium">Observações</th>
                  </tr>
                </thead>
                <tbody>
                  {group.submodules.map((sub, idx) => (
                    <tr key={idx} className="border-t border-border/50">
                      <td className="py-2 font-medium text-foreground">{sub.name}</td>
                      <td className="py-2">
                        <StatusBadge status={sub.status} />
                      </td>
                      <td className="py-2 text-muted-foreground">{sub.observations}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function ModuleMaturityReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | ModuleStatus>('all');

  const stats = useMemo(() => calculateStats(MODULE_MAP), []);

  const filteredModules = useMemo(() => {
    return MODULE_MAP.map((group) => ({
      ...group,
      submodules: group.submodules.filter((sub) => {
        const matchesSearch =
          sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          sub.observations.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || sub.status === filter;
        return matchesSearch && matchesFilter;
      }),
    })).filter((group) => group.submodules.length > 0);
  }, [searchQuery, filter]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedModules(new Set(MODULE_MAP.map((g) => g.id)));
  };

  const collapseAll = () => {
    setExpandedModules(new Set());
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <PageHeader
          title="Mapa de Maturidade do ERP"
          description="Visão completa de todos os módulos implementados, parciais e ausentes"
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">{stats.overallScore}%</div>
                <p className="text-sm text-muted-foreground mt-1">Maturidade Geral</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-foreground">{stats.total}</div>
                <p className="text-sm text-muted-foreground mt-1">Total de Módulos</p>
              </div>
            </CardContent>
          </Card>
          <Card className={STATUS_CONFIG.implementado.bgClass}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn('text-3xl font-bold', STATUS_CONFIG.implementado.color)}>{stats.implemented}</div>
                <p className="text-sm text-muted-foreground mt-1">Implementados ({stats.implementedPercent}%)</p>
              </div>
            </CardContent>
          </Card>
          <Card className={STATUS_CONFIG.parcial.bgClass}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn('text-3xl font-bold', STATUS_CONFIG.parcial.color)}>{stats.partial}</div>
                <p className="text-sm text-muted-foreground mt-1">Parciais ({stats.partialPercent}%)</p>
              </div>
            </CardContent>
          </Card>
          <Card className={STATUS_CONFIG.ausente.bgClass}>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className={cn('text-3xl font-bold', STATUS_CONFIG.ausente.color)}>{stats.missing}</div>
                <p className="text-sm text-muted-foreground mt-1">Ausentes ({stats.missingPercent}%)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar módulos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="implementado">Implementados</TabsTrigger>
              <TabsTrigger value="parcial">Parciais</TabsTrigger>
              <TabsTrigger value="ausente">Ausentes</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>
              Expandir Tudo
            </Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>
              Recolher Tudo
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Module List */}
        <div className="space-y-4">
          {filteredModules.map((group) => (
            <ModuleCard
              key={group.id}
              group={group}
              expanded={expandedModules.has(group.id)}
              onToggle={() => toggleModule(group.id)}
            />
          ))}
        </div>

        {/* Roadmap Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Roadmap de Melhorias
            </CardTitle>
            <CardDescription>Próximos passos recomendados para completar o ERP</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Prioridade Alta
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Completar módulo de Projetos e OS</li>
                  <li>• Implementar MRP/Supply Chain</li>
                  <li>• Adicionar Custeio ABC completo</li>
                  <li>• Balanced Scorecard</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Settings className="h-4 w-4 text-blue-500" />
                  Prioridade Média
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Requisições de Compra com workflow</li>
                  <li>• Operações de Câmbio</li>
                  <li>• NFC-e integração SEFAZ</li>
                  <li>• Gestão de múltiplos armazéns</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Futuro (Fora do Escopo Atual)
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• CRM Avançado</li>
                  <li>• RH / Folha de Pagamento</li>
                  <li>• Produção / Manufatura</li>
                  <li>• WMS Avançado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
