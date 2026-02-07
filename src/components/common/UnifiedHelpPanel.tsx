import { memo, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  Search, 
  BookOpen, 
  ExternalLink,
  DollarSign,
  Scale,
  Bot,
  Rocket,
  Package,
  Settings,
  Calculator,
  TrendingUp,
  Target,
  Wallet,
  CreditCard,
  Receipt,
  FileText,
  Shield,
  Brain,
  MessageSquare,
  Activity,
  Zap,
  ShoppingCart,
  Boxes,
  Building2,
  Users,
  Plug,
  Upload,
  Truck,
  Tag,
  BarChart3,
  PieChart,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface HelpTopic {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
}

interface HelpSubgroup {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  topics: HelpTopic[];
}

interface HelpCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  subgroups?: HelpSubgroup[];
  topics?: HelpTopic[];
}

// Help categories following the main menu hierarchy:
// Operacional > Suprimentos > Financeiro > Controladoria & Fiscal > Inteligência (IA) > Configurações
const helpCategories: HelpCategory[] = [
  {
    id: 'operacional',
    title: 'Operacional',
    icon: Rocket,
    color: 'text-emerald-500',
    subgroups: [
      {
        id: 'vendas-pdv',
        title: 'Vendas & PDV',
        icon: ShoppingCart,
        topics: [
          {
            id: 'pdv',
            title: 'PDV (Ponto de Venda)',
            description: 'Módulo de frente de caixa para vendas rápidas e recebimentos.',
            icon: ShoppingCart,
            keywords: ['pdv', 'venda', 'caixa', 'cupom', 'pagamento', 'frente de caixa'],
          },
          {
            id: 'orcamentos',
            title: 'Orçamentos e Propostas',
            description: 'Crie orçamentos para clientes e converta em vendas.',
            icon: FileText,
            keywords: ['orçamento', 'proposta', 'cotação', 'cliente'],
          },
          {
            id: 'clientes',
            title: 'Gestão de Clientes',
            description: 'Cadastro e histórico de relacionamento com clientes.',
            icon: Users,
            keywords: ['cliente', 'cadastro', 'crm', 'relacionamento'],
          },
        ],
      },
      {
        id: 'catalogo',
        title: 'Catálogo',
        icon: Tag,
        topics: [
          {
            id: 'produtos',
            title: 'Produtos e Serviços',
            description: 'Gerencie seu catálogo de produtos e tabelas de preço.',
            icon: Tag,
            keywords: ['produto', 'serviço', 'catálogo', 'preço', 'sku'],
          },
          {
            id: 'categorias',
            title: 'Categorias e Atributos',
            description: 'Organize produtos por categorias, marcas e atributos.',
            icon: Boxes,
            keywords: ['categoria', 'marca', 'atributo', 'classificação'],
          },
        ],
      },
      {
        id: 'logistica',
        title: 'Logística',
        icon: Truck,
        topics: [
          {
            id: 'inventario',
            title: 'Gestão de Inventário',
            description: 'Controle de estoque em tempo real: quantidades, lotes, validade.',
            icon: Boxes,
            keywords: ['inventário', 'estoque', 'contagem', 'produto', 'saldo'],
          },
          {
            id: 'movimentacoes',
            title: 'Movimentações de Estoque',
            description: 'Registre entradas, saídas, transferências e ajustes.',
            icon: Truck,
            keywords: ['movimentação', 'entrada', 'saída', 'transferência', 'ajuste'],
          },
          {
            id: 'centros-custodia',
            title: 'Centros de Custódia',
            description: 'Locais físicos de armazenamento: Matriz, Filiais, Armazéns.',
            icon: Building2,
            keywords: ['centro', 'custódia', 'armazém', 'filial', 'depósito'],
          },
          {
            id: 'estoque-minimo',
            title: 'Estoque Mínimo e Alertas',
            description: 'Configure níveis mínimos e receba alertas de ruptura.',
            icon: Activity,
            keywords: ['estoque mínimo', 'alerta', 'ruptura', 'reposição'],
          },
        ],
      },
    ],
  },
  {
    id: 'suprimentos',
    title: 'Suprimentos',
    icon: Package,
    color: 'text-orange-500',
    topics: [
      {
        id: 'fluxo-aquisicao',
        title: 'Fluxo de Aquisição Inteligente',
        description: 'Cotação → Pedido → Entrada: o ciclo completo de compras.',
        icon: Zap,
        keywords: ['fluxo', 'aquisição', 'cotação', 'pedido', 'entrada', 'compra'],
      },
      {
        id: 'cotacoes',
        title: 'Cotações',
        description: 'Compare preços de múltiplos fornecedores automaticamente.',
        icon: Calculator,
        keywords: ['cotação', 'preço', 'comparativo', 'melhor oferta'],
      },
      {
        id: 'compras',
        title: 'Pedidos de Compra',
        description: 'Gerencie todo o processo de aquisição de produtos.',
        icon: FileText,
        keywords: ['compra', 'pedido', 'requisição', 'aprovação', 'ordem'],
      },
      {
        id: 'entradas',
        title: 'Entradas de Mercadoria',
        description: 'Registro de recebimento que atualiza estoque e gera conta a pagar.',
        icon: Package,
        keywords: ['entrada', 'recebimento', 'estoque', 'nf-e', 'mercadoria'],
      },
      {
        id: 'fornecedores',
        title: 'Gestão de Fornecedores',
        description: 'Centralize informações e avalie desempenho de parceiros.',
        icon: Users,
        keywords: ['fornecedor', 'parceiro', 'avaliação', 'cadastro'],
      },
    ],
  },
  {
    id: 'financeiro',
    title: 'Financeiro',
    icon: DollarSign,
    color: 'text-green-500',
    topics: [
      {
        id: 'conciliacao',
        title: 'Conciliação Bancária',
        description: 'Compare transações do sistema com o extrato bancário para garantir precisão.',
        icon: Calculator,
        keywords: ['conciliação', 'banco', 'extrato', 'match', 'conferir'],
      },
      {
        id: 'fluxo-caixa',
        title: 'Fluxo de Caixa',
        description: 'Visualize entradas e saídas com projeções e análises de tendência.',
        icon: TrendingUp,
        keywords: ['fluxo', 'caixa', 'entrada', 'saída', 'saldo', 'projeção'],
      },
      {
        id: 'rolling-forecast',
        title: 'Rolling Forecast',
        description: 'Projeção contínua que atualiza previsões mantendo horizonte fixo de 12+ meses.',
        icon: Target,
        keywords: ['forecast', 'previsão', 'projeção', 'orçamento', 'cenário'],
      },
      {
        id: 'tesouraria',
        title: 'Tesouraria',
        description: 'Gerencie contas bancárias, aplicações e transferências em tempo real.',
        icon: Wallet,
        keywords: ['tesouraria', 'conta', 'banco', 'transferência', 'aplicação'],
      },
      {
        id: 'contas-receber',
        title: 'Contas a Receber',
        description: 'Gestão de valores a receber: vendas parceladas, boletos, Pix.',
        icon: TrendingUp,
        keywords: ['receber', 'cliente', 'boleto', 'parcelamento', 'inadimplência'],
      },
      {
        id: 'contas-pagar',
        title: 'Contas a Pagar',
        description: 'Organize pagamentos: fornecedores, impostos, folha, despesas.',
        icon: CreditCard,
        keywords: ['pagar', 'fornecedor', 'vencimento', 'pagamento', 'aprovação'],
      },
    ],
  },
  {
    id: 'controladoria-fiscal',
    title: 'Controladoria & Fiscal',
    icon: Scale,
    color: 'text-blue-500',
    topics: [
      {
        id: 'emissao-nfe',
        title: 'Emissão de NF-e',
        description: 'Emita notas fiscais eletrônicas modelo 55 e NFC-e modelo 65.',
        icon: Receipt,
        keywords: ['nota', 'fiscal', 'nfe', 'nfce', 'emissão', 'sefaz'],
      },
      {
        id: 'danfe',
        title: 'Geração de DANFE',
        description: 'Representação visual impressa da NF-e para acompanhamento.',
        icon: FileText,
        keywords: ['danfe', 'imprimir', 'pdf', 'nota'],
      },
      {
        id: 'compliance',
        title: 'Alertas de Compliance',
        description: 'Notificações inteligentes para prevenir problemas fiscais.',
        icon: Shield,
        keywords: ['compliance', 'alerta', 'fiscal', 'auditoria', 'sped'],
      },
      {
        id: 'contabilidade',
        title: 'Contabilidade',
        description: 'Livro Diário, Balanço Patrimonial, DRE e Balancete.',
        icon: BookOpen,
        keywords: ['contábil', 'balanço', 'dre', 'lançamento', 'partida dobrada'],
      },
      {
        id: 'dre-gerencial',
        title: 'DRE Gerencial',
        description: 'Demonstrativo de Resultado por centro de custo e projeto.',
        icon: BarChart3,
        keywords: ['dre', 'resultado', 'lucro', 'margem', 'gerencial'],
      },
      {
        id: 'orcamento',
        title: 'Orçamento Empresarial',
        description: 'Planeje e acompanhe metas financeiras por departamento.',
        icon: PieChart,
        keywords: ['orçamento', 'budget', 'meta', 'planejamento'],
      },
    ],
  },
  {
    id: 'inteligencia',
    title: 'Inteligência (IA)',
    icon: Bot,
    color: 'text-violet-500',
    topics: [
      {
        id: 'cfo-virtual',
        title: 'CFO Virtual',
        description: 'Assistente de IA que monitora e recomenda ações para otimizar finanças.',
        icon: Brain,
        keywords: ['cfo', 'ia', 'assistente', 'análise', 'recomendação', 'insight'],
      },
      {
        id: 'simulacoes',
        title: 'Simulações What-If',
        description: 'Projete impacto de decisões antes de executá-las.',
        icon: Target,
        keywords: ['simulação', 'what-if', 'cenário', 'projeção', 'impacto'],
      },
      {
        id: 'monitoramento',
        title: 'Monitoramento Inteligente',
        description: 'Sistema de vigilância 24/7 que detecta anomalias e oportunidades.',
        icon: Activity,
        keywords: ['monitoramento', 'alerta', 'anomalia', 'fraude'],
      },
      {
        id: 'decisoes-ia',
        title: 'Decisões da IA',
        description: 'Revise e aprove ações sugeridas pela inteligência artificial.',
        icon: Zap,
        keywords: ['decisão', 'aprovação', 'automação', 'autopiloto'],
      },
      {
        id: 'whatsapp',
        title: 'Agente WhatsApp',
        description: 'Interaja com o sistema via mensagens de texto.',
        icon: MessageSquare,
        keywords: ['whatsapp', 'mensagem', 'comando', 'notificação'],
      },
      {
        id: 'copilot',
        title: 'Copilot',
        description: 'Assistente inteligente integrado para ajudar em qualquer tarefa.',
        icon: Bot,
        keywords: ['copilot', 'assistente', 'ajuda', 'chat', 'pergunta'],
      },
    ],
  },
  {
    id: 'configuracoes',
    title: 'Configurações',
    icon: Settings,
    color: 'text-slate-500',
    topics: [
      {
        id: 'cadastros',
        title: 'Cadastros Base',
        description: 'Plano de Contas, Centros de Custo, Clientes/Fornecedores.',
        icon: Building2,
        keywords: ['cadastro', 'plano', 'conta', 'centro', 'custo'],
      },
      {
        id: 'usuarios',
        title: 'Gestão de Usuários',
        description: 'Permissões, papéis e controle de acesso ao sistema.',
        icon: Users,
        keywords: ['usuário', 'permissão', 'acesso', 'papel', 'role'],
      },
      {
        id: 'empresa',
        title: 'Dados da Empresa',
        description: 'CNPJ, endereço, certificado digital e configurações fiscais.',
        icon: Briefcase,
        keywords: ['empresa', 'cnpj', 'certificado', 'fiscal'],
      },
      {
        id: 'integracoes',
        title: 'Integrações e APIs',
        description: 'Open Banking, Pix, Webhooks e APIs REST.',
        icon: Plug,
        keywords: ['integração', 'api', 'open banking', 'pix', 'webhook'],
      },
      {
        id: 'importar-exportar',
        title: 'Importar / Exportar',
        description: 'Migre dados e exporte relatórios em diversos formatos.',
        icon: Upload,
        keywords: ['importar', 'exportar', 'excel', 'csv', 'backup'],
      },
    ],
  },
];

// Predictive search suggestions based on common queries
const searchSuggestions = [
  { query: 'estoque', suggestion: 'Como fazer inventário', topicId: 'inventario', categoryId: 'operacional' },
  { query: 'inventario', suggestion: 'Como fazer inventário', topicId: 'inventario', categoryId: 'operacional' },
  { query: 'contagem', suggestion: 'Contagem de estoque', topicId: 'inventario', categoryId: 'operacional' },
  { query: 'concili', suggestion: 'Conciliação Bancária', topicId: 'conciliacao', categoryId: 'financeiro' },
  { query: 'banco', suggestion: 'Conciliação Bancária', topicId: 'conciliacao', categoryId: 'financeiro' },
  { query: 'extrato', suggestion: 'Importar extrato bancário', topicId: 'conciliacao', categoryId: 'financeiro' },
  { query: 'nota', suggestion: 'Emissão de NF-e', topicId: 'emissao-nfe', categoryId: 'controladoria-fiscal' },
  { query: 'nfe', suggestion: 'Emissão de NF-e', topicId: 'emissao-nfe', categoryId: 'controladoria-fiscal' },
  { query: 'fiscal', suggestion: 'Módulo Fiscal e Compliance', topicId: 'compliance', categoryId: 'controladoria-fiscal' },
  { query: 'cfo', suggestion: 'CFO Virtual - Análises de IA', topicId: 'cfo-virtual', categoryId: 'inteligencia' },
  { query: 'ia', suggestion: 'Inteligência Artificial', topicId: 'cfo-virtual', categoryId: 'inteligencia' },
  { query: 'fluxo', suggestion: 'Fluxo de Caixa', topicId: 'fluxo-caixa', categoryId: 'financeiro' },
  { query: 'caixa', suggestion: 'Fluxo de Caixa', topicId: 'fluxo-caixa', categoryId: 'financeiro' },
  { query: 'pdv', suggestion: 'Ponto de Venda (PDV)', topicId: 'pdv', categoryId: 'operacional' },
  { query: 'venda', suggestion: 'Vendas e PDV', topicId: 'pdv', categoryId: 'operacional' },
  { query: 'compra', suggestion: 'Pedidos de Compra', topicId: 'compras', categoryId: 'suprimentos' },
  { query: 'fornecedor', suggestion: 'Gestão de Fornecedores', topicId: 'fornecedores', categoryId: 'suprimentos' },
  { query: 'cotacao', suggestion: 'Cotações de Fornecedores', topicId: 'cotacoes', categoryId: 'suprimentos' },
  { query: 'entrada', suggestion: 'Entradas de Mercadoria', topicId: 'entradas', categoryId: 'suprimentos' },
  { query: 'aquisicao', suggestion: 'Fluxo de Aquisição', topicId: 'fluxo-aquisicao', categoryId: 'suprimentos' },
  { query: 'bulk', suggestion: 'Edição em Massa', topicId: 'edicao-massa', categoryId: 'produtividade' },
  { query: 'massa', suggestion: 'Edição em Massa', topicId: 'edicao-massa', categoryId: 'produtividade' },
  { query: 'whatsapp', suggestion: 'Agente WhatsApp', topicId: 'whatsapp', categoryId: 'inteligencia' },
  { query: 'usuario', suggestion: 'Gestão de Usuários', topicId: 'usuarios', categoryId: 'configuracoes' },
  { query: 'permiss', suggestion: 'Permissões e Papéis', topicId: 'usuarios', categoryId: 'configuracoes' },
  { query: 'dre', suggestion: 'DRE Gerencial', topicId: 'dre-gerencial', categoryId: 'controladoria-fiscal' },
  { query: 'balanço', suggestion: 'Balanço Patrimonial', topicId: 'contabilidade', categoryId: 'controladoria-fiscal' },
  { query: 'orcamento', suggestion: 'Orçamento Empresarial', topicId: 'orcamento', categoryId: 'controladoria-fiscal' },
  { query: 'forecast', suggestion: 'Rolling Forecast', topicId: 'rolling-forecast', categoryId: 'financeiro' },
  { query: 'ruptura', suggestion: 'Alertas de Ruptura de Estoque', topicId: 'estoque-minimo', categoryId: 'operacional' },
  { query: 'contrato', suggestion: 'Gestão de Contratos e Recorrência', topicId: 'introducao-recorrencia', categoryId: 'contratos' },
  { query: 'recorrente', suggestion: 'Contratos Recorrentes', topicId: 'criando-contrato', categoryId: 'contratos' },
  { query: 'assinatura', suggestion: 'Gestão de Assinaturas', topicId: 'introducao-recorrencia', categoryId: 'contratos' },
  { query: 'mrr', suggestion: 'MRR - Receita Recorrente Mensal', topicId: 'kpis-saas', categoryId: 'contratos' },
  { query: 'churn', suggestion: 'Churn Rate - Taxa de Cancelamento', topicId: 'kpis-saas', categoryId: 'contratos' },
  { query: 'faturamento', suggestion: 'Motor de Faturamento Automático', topicId: 'motor-faturamento', categoryId: 'contratos' },
  { query: 'mensalidade', suggestion: 'Cobrar Mensalidades', topicId: 'criando-contrato', categoryId: 'contratos' },
  { query: 'renovacao', suggestion: 'Renovação de Contratos', topicId: 'ciclo-vida', categoryId: 'contratos' },
  { query: 'cancelamento', suggestion: 'Cancelamento de Contratos', topicId: 'ciclo-vida', categoryId: 'contratos' },
];

// Flatten all topics for search
const getAllTopics = () => {
  const topics: Array<{ category: HelpCategory; subgroup?: HelpSubgroup; topic: HelpTopic }> = [];
  
  helpCategories.forEach(category => {
    if (category.subgroups) {
      category.subgroups.forEach(subgroup => {
        subgroup.topics.forEach(topic => {
          topics.push({ category, subgroup, topic });
        });
      });
    }
    if (category.topics) {
      category.topics.forEach(topic => {
        topics.push({ category, topic });
      });
    }
  });
  
  return topics;
};

const getColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string }> = {
    'text-emerald-500': { bg: 'bg-emerald-50', text: 'text-emerald-500' },
    'text-orange-500': { bg: 'bg-orange-50', text: 'text-orange-500' },
    'text-green-500': { bg: 'bg-green-50', text: 'text-green-500' },
    'text-blue-500': { bg: 'bg-blue-50', text: 'text-blue-500' },
    'text-violet-500': { bg: 'bg-violet-50', text: 'text-violet-500' },
    'text-slate-500': { bg: 'bg-slate-50', text: 'text-slate-500' },
  };
  return colorMap[color] || { bg: 'bg-muted', text: 'text-muted-foreground' };
};

export const UnifiedHelpPanel = memo(function UnifiedHelpPanel() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Get predictive suggestions based on query
  const predictiveSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    return searchSuggestions
      .filter(s => s.query.toLowerCase().startsWith(query) || query.includes(s.query.toLowerCase()))
      .slice(0, 5);
  }, [searchQuery]);

  // Filter topics based on search
  const filteredResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const allTopics = getAllTopics();
    
    return allTopics.filter(({ topic }) => {
      const matchesTitle = topic.title.toLowerCase().includes(query);
      const matchesDesc = topic.description.toLowerCase().includes(query);
      const matchesKeywords = topic.keywords.some(kw => kw.toLowerCase().includes(query));
      return matchesTitle || matchesDesc || matchesKeywords;
    });
  }, [searchQuery]);

  // Navigate to documentation with deep link
  const openDocumentation = useCallback((categoryId?: string) => {
    const url = categoryId ? `/documentacao?categoria=${categoryId}` : '/documentacao';
    navigate(url);
    setIsOpen(false);
  }, [navigate]);

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: typeof searchSuggestions[0]) => {
    openDocumentation(suggestion.categoryId);
  }, [openDocumentation]);

  // Handle topic click
  const handleTopicClick = useCallback((categoryId: string) => {
    openDocumentation(categoryId);
  }, [openDocumentation]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-9 w-9 rounded-lg',
            'text-muted-foreground hover:text-primary hover:bg-muted/50',
            'transition-all duration-200'
          )}
          aria-label="Central de Ajuda"
        >
          <HelpCircle className="h-[18px] w-[18px]" />
        </Button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-[400px] sm:w-[480px] p-0 flex flex-col bg-background"
      >
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            Central de Ajuda
          </SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="busca" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 grid w-auto grid-cols-2">
            <TabsTrigger value="busca" className="gap-2">
              <Search className="h-4 w-4" />
              Busca Rápida
            </TabsTrigger>
            <TabsTrigger value="indice" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Índice do Manual
            </TabsTrigger>
          </TabsList>

          {/* Busca Rápida Tab */}
          <TabsContent value="busca" className="flex-1 overflow-hidden mt-0">
            <div className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar no manual... (ex: estoque, conciliação)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="pl-10 h-11 bg-muted/50 border-border"
                />
                
                {/* Predictive Suggestions Dropdown */}
                {showSuggestions && predictiveSuggestions.length > 0 && searchQuery.length >= 2 && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
                    {predictiveSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-muted/50 flex items-center gap-2 transition-colors"
                        onClick={() => {
                          handleSuggestionClick(suggestion);
                          setShowSuggestions(false);
                        }}
                      >
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{suggestion.suggestion}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <ScrollArea className="h-[calc(100vh-340px)]">
                {searchQuery.trim() === '' ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">
                      Digite para buscar tópicos do manual
                    </p>
                    <p className="text-muted-foreground/60 text-xs mt-1">
                      Ex: "estoque", "conciliação", "CFO Virtual"
                    </p>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground text-sm">
                      Nenhum resultado encontrado para "{searchQuery}"
                    </p>
                    <p className="text-muted-foreground/60 text-xs mt-1">
                      Tente outros termos ou navegue pelo índice
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredResults.map(({ category, subgroup, topic }) => {
                      const TopicIcon = topic.icon;
                      const colorClasses = getColorClasses(category.color);
                      return (
                        <div
                          key={`${category.id}-${topic.id}`}
                          className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => handleTopicClick(category.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', colorClasses.bg)}>
                              <TopicIcon className={cn('h-4 w-4', colorClasses.text)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground">
                                {topic.title}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {topic.description}
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-1">
                                {category.title}
                                {subgroup && ` › ${subgroup.title}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          {/* Índice do Manual Tab */}
          <TabsContent value="indice" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-[calc(100vh-280px)]">
              <div className="p-6">
                <Accordion type="multiple" className="space-y-2">
                  {helpCategories.map((category) => {
                    const CategoryIcon = category.icon;
                    const colorClasses = getColorClasses(category.color);
                    
                    return (
                      <AccordionItem 
                        key={category.id} 
                        value={category.id}
                        className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', colorClasses.bg)}>
                              <CategoryIcon className={cn('h-4 w-4', colorClasses.text)} />
                            </div>
                            <span className="font-medium text-sm">{category.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          {/* Render subgroups if present */}
                          {category.subgroups && (
                            <Accordion type="multiple" className="ml-11 space-y-1">
                              {category.subgroups.map((subgroup) => {
                                const SubgroupIcon = subgroup.icon;
                                return (
                                  <AccordionItem 
                                    key={subgroup.id} 
                                    value={subgroup.id}
                                    className="border-0 border-l-2 border-border/50 pl-3"
                                  >
                                    <AccordionTrigger className="hover:no-underline py-2 text-sm">
                                      <div className="flex items-center gap-2">
                                        <SubgroupIcon className={cn('h-3.5 w-3.5', colorClasses.text)} />
                                        <span className="text-muted-foreground font-medium">{subgroup.title}</span>
                                      </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pb-2">
                                      <div className="space-y-0.5 ml-5">
                                        {subgroup.topics.map((topic) => {
                                          const TopicIcon = topic.icon;
                                          return (
                                            <div
                                              key={topic.id}
                                              className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                              onClick={() => handleTopicClick(category.id)}
                                            >
                                              <TopicIcon className={cn('h-3.5 w-3.5', colorClasses.text)} />
                                              <span className="text-xs text-muted-foreground hover:text-foreground">
                                                {topic.title}
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                );
                              })}
                            </Accordion>
                          )}
                          
                          {/* Render direct topics if no subgroups */}
                          {category.topics && !category.subgroups && (
                            <div className="space-y-1 ml-11">
                              {category.topics.map((topic) => {
                                const TopicIcon = topic.icon;
                                return (
                                  <div
                                    key={topic.id}
                                    className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                    onClick={() => handleTopicClick(category.id)}
                                  >
                                    <TopicIcon className={cn('h-4 w-4', colorClasses.text)} />
                                    <span className="text-sm text-muted-foreground hover:text-foreground">
                                      {topic.title}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <SheetFooter className="px-6 py-4 border-t border-border">
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => openDocumentation()}
          >
            <ExternalLink className="h-4 w-4" />
            Abrir Documentação Completa
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
