import { memo, useState, useMemo } from 'react';
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
  Upload
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

interface HelpCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  topics: HelpTopic[];
}

const helpCategories: HelpCategory[] = [
  {
    id: 'financeiro',
    title: 'Módulo Financeiro',
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
    id: 'fiscal',
    title: 'Módulo Fiscal',
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
    ],
  },
  {
    id: 'operacional',
    title: 'Módulo Operacional',
    icon: Rocket,
    color: 'text-emerald-500',
    topics: [
      {
        id: 'pdv',
        title: 'PDV (Ponto de Venda)',
        description: 'Módulo de frente de caixa para vendas rápidas.',
        icon: ShoppingCart,
        keywords: ['pdv', 'venda', 'caixa', 'cupom', 'pagamento'],
      },
      {
        id: 'inventario',
        title: 'Gestão de Inventário',
        description: 'Controle de estoque em tempo real: quantidades, lotes, validade.',
        icon: Boxes,
        keywords: ['inventário', 'estoque', 'contagem', 'produto'],
      },
      {
        id: 'centros-custodia',
        title: 'Centros de Custódia',
        description: 'Locais físicos de armazenamento: Matriz, Filiais, Armazéns.',
        icon: Building2,
        keywords: ['centro', 'custódia', 'armazém', 'filial', 'transferência'],
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
        id: 'compras',
        title: 'Pedidos de Compra',
        description: 'Gerencie todo o processo de aquisição de produtos.',
        icon: FileText,
        keywords: ['compra', 'pedido', 'requisição', 'aprovação'],
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

export const UnifiedHelpPanel = memo(function UnifiedHelpPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter topics based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    const query = searchQuery.toLowerCase();
    const results: Array<{ category: HelpCategory; topic: HelpTopic }> = [];

    helpCategories.forEach(category => {
      category.topics.forEach(topic => {
        const matchesTitle = topic.title.toLowerCase().includes(query);
        const matchesDesc = topic.description.toLowerCase().includes(query);
        const matchesKeywords = topic.keywords.some(kw => kw.toLowerCase().includes(query));
        
        if (matchesTitle || matchesDesc || matchesKeywords) {
          results.push({ category, topic });
        }
      });
    });

    return results;
  }, [searchQuery]);

  const openDocumentation = () => {
    window.open('/documentacao', '_blank');
    setIsOpen(false);
  };

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
                  placeholder="Buscar no manual... (ex: conciliação, NF-e)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 bg-muted/50 border-border"
                />
              </div>

              <ScrollArea className="h-[calc(100vh-340px)]">
                {searchQuery.trim() === '' ? (
                  <div className="text-center py-12">
                    <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">
                      Digite para buscar tópicos do manual
                    </p>
                    <p className="text-muted-foreground/60 text-xs mt-1">
                      Ex: "fluxo de caixa", "emitir nota", "CFO Virtual"
                    </p>
                  </div>
                ) : filteredCategories.length === 0 ? (
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
                    {filteredCategories.map(({ category, topic }) => {
                      const TopicIcon = topic.icon;
                      return (
                        <div
                          key={`${category.id}-${topic.id}`}
                          className="p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={openDocumentation}
                        >
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
                              category.color === 'text-green-500' && 'bg-green-50',
                              category.color === 'text-blue-500' && 'bg-blue-50',
                              category.color === 'text-violet-500' && 'bg-violet-50',
                              category.color === 'text-emerald-500' && 'bg-emerald-50',
                              category.color === 'text-orange-500' && 'bg-orange-50',
                              category.color === 'text-slate-500' && 'bg-slate-50'
                            )}>
                              <TopicIcon className={cn('h-4 w-4', category.color)} />
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
                <Accordion type="single" collapsible className="space-y-2">
                  {helpCategories.map((category) => {
                    const CategoryIcon = category.icon;
                    return (
                      <AccordionItem 
                        key={category.id} 
                        value={category.id}
                        className="border border-border rounded-lg px-4 data-[state=open]:bg-muted/30"
                      >
                        <AccordionTrigger className="hover:no-underline py-3">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'h-8 w-8 rounded-lg flex items-center justify-center',
                              category.color === 'text-green-500' && 'bg-green-50',
                              category.color === 'text-blue-500' && 'bg-blue-50',
                              category.color === 'text-violet-500' && 'bg-violet-50',
                              category.color === 'text-emerald-500' && 'bg-emerald-50',
                              category.color === 'text-orange-500' && 'bg-orange-50',
                              category.color === 'text-slate-500' && 'bg-slate-50'
                            )}>
                              <CategoryIcon className={cn('h-4 w-4', category.color)} />
                            </div>
                            <span className="font-medium text-sm">{category.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-1 ml-11">
                            {category.topics.map((topic) => {
                              const TopicIcon = topic.icon;
                              return (
                                <div
                                  key={topic.id}
                                  className="flex items-center gap-2 py-2 px-3 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                  onClick={openDocumentation}
                                >
                                  <TopicIcon className={cn('h-4 w-4', category.color)} />
                                  <span className="text-sm text-muted-foreground hover:text-foreground">
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
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        <SheetFooter className="px-6 py-4 border-t border-border bg-muted/30">
          <Button 
            onClick={openDocumentation}
            className="w-full gap-2"
            variant="default"
          >
            <BookOpen className="h-4 w-4" />
            Abrir Documentação Completa
            <ExternalLink className="h-3.5 w-3.5 ml-auto opacity-60" />
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});

export default UnifiedHelpPanel;