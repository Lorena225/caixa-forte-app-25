import { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  ChevronRight,
  Rocket,
  Package,
  DollarSign,
  Scale,
  Bot,
  Settings,
  ShoppingCart,
  Boxes,
  Truck,
  Users,
  FileText,
  CreditCard,
  Wallet,
  TrendingUp,
  Calculator,
  BookOpen,
  Receipt,
  Shield,
  Brain,
  MessageSquare,
  Activity,
  Target,
  Zap,
  Building2,
  Plug,
  Upload
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Knowledge Base Content
const knowledgeBase = {
  operacional: {
    title: 'Operacional',
    icon: Rocket,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    description: 'Gerencie vendas, catálogo de produtos e logística do seu negócio.',
    modules: [
      {
        id: 'pdv',
        title: 'PDV (Ponto de Venda)',
        icon: ShoppingCart,
        content: `O módulo de PDV permite realizar vendas de forma rápida e intuitiva. 
        
**Funcionalidades principais:**
- Registro de vendas com múltiplos itens
- Aplicação de descontos e promoções
- Múltiplas formas de pagamento (Dinheiro, Cartão, Pix)
- Emissão automática de cupom fiscal
- Controle de troco e sangria de caixa

**Benefícios:**
Agilize o atendimento ao cliente com uma interface otimizada para vendas rápidas, reduzindo filas e aumentando a satisfação.`
      },
      {
        id: 'produtos',
        title: 'Catálogo de Produtos',
        icon: Boxes,
        content: `Gerencie todo o seu catálogo de produtos e serviços em um só lugar.

**Funcionalidades principais:**
- Cadastro completo de produtos com variações
- Organização por categorias hierárquicas
- Controle de preços e margens
- Gestão de códigos de barras
- Upload de imagens dos produtos

**Benefícios:**
Mantenha seu catálogo organizado e atualizado, facilitando a busca e o controle de estoque.`
      },
      {
        id: 'logistica',
        title: 'Logística e Inventário',
        icon: Truck,
        content: `Controle completo do estoque, movimentações e centros de custódia.

**Funcionalidades principais:**
- Inventário em tempo real
- Múltiplos centros de custódia
- Transferências entre unidades
- Controle de lotes e validade
- Alertas de estoque mínimo

**Benefícios:**
Evite rupturas de estoque e perdas por vencimento com alertas inteligentes e visibilidade total das movimentações.`
      }
    ]
  },
  suprimentos: {
    title: 'Suprimentos',
    icon: Package,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    description: 'Gerencie compras, fornecedores e cotações de forma eficiente.',
    modules: [
      {
        id: 'compras',
        title: 'Pedidos de Compra',
        icon: FileText,
        content: `Automatize o processo de compras com pedidos estruturados e aprovações.

**Funcionalidades principais:**
- Criação de pedidos de compra
- Fluxo de aprovação configurável
- Histórico de preços por fornecedor
- Recebimento parcial de mercadorias
- Integração com contas a pagar

**Benefícios:**
Reduza erros e agilize o processo de compras com fluxos automatizados e rastreabilidade completa.`
      },
      {
        id: 'fornecedores',
        title: 'Gestão de Fornecedores',
        icon: Users,
        content: `Centralize informações e avalie o desempenho dos seus fornecedores.

**Funcionalidades principais:**
- Cadastro completo de fornecedores
- Histórico de negociações
- Avaliação de desempenho
- Documentação e certificações
- Contatos e responsáveis

**Benefícios:**
Tome decisões de compra mais inteligentes com dados históricos e avaliações de desempenho dos fornecedores.`
      }
    ]
  },
  financeiro: {
    title: 'Financeiro',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    description: 'Controle completo do fluxo de caixa, contas e planejamento financeiro.',
    modules: [
      {
        id: 'tesouraria',
        title: 'Tesouraria',
        icon: Wallet,
        content: `Gerencie caixa, bancos e transferências em tempo real.

**Funcionalidades principais:**
- Posição de caixa consolidada
- Múltiplas contas bancárias
- Transferências entre contas
- Conciliação automática
- Projeção de saldo

**Benefícios:**
Tenha visibilidade total da sua posição financeira e tome decisões com dados em tempo real.`
      },
      {
        id: 'contas-receber',
        title: 'Contas a Receber',
        icon: TrendingUp,
        content: `Controle todos os recebimentos e reduza a inadimplência.

**Funcionalidades principais:**
- Gestão de títulos a receber
- Parcelamentos e renegociações
- Cobrança automatizada
- Análise de aging
- Baixa automática via integração bancária

**Benefícios:**
Reduza a inadimplência com cobranças automatizadas e tenha previsibilidade no fluxo de caixa.`
      },
      {
        id: 'contas-pagar',
        title: 'Contas a Pagar',
        icon: CreditCard,
        content: `Organize pagamentos e otimize o capital de giro.

**Funcionalidades principais:**
- Gestão de títulos a pagar
- Agendamento de pagamentos
- Fluxo de aprovação
- Pagamento em lote
- Integração Pix e boleto

**Benefícios:**
Evite multas por atraso e otimize o uso do capital de giro com gestão inteligente de pagamentos.`
      },
      {
        id: 'planejamento',
        title: 'Planejamento Financeiro',
        icon: Target,
        content: `Defina metas, orçamentos e simule cenários financeiros.

**Funcionalidades principais:**
- Definição de metas por período
- Orçamento vs Realizado
- Rolling Forecast (projeção contínua)
- Simulações What-If
- KPIs e indicadores

**O que é Rolling Forecast?**
É uma técnica de projeção financeira que atualiza continuamente as previsões, sempre mantendo um horizonte fixo à frente (ex: próximos 12 meses). Diferente do orçamento anual fixo, o Rolling Forecast se adapta às mudanças do mercado.

**Benefícios:**
Planeje com precisão e reaja rapidamente às mudanças do mercado com projeções dinâmicas.`
      }
    ]
  },
  controladoria: {
    title: 'Controladoria & Fiscal',
    icon: Scale,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    description: 'Contabilidade, obrigações fiscais e compliance em conformidade.',
    modules: [
      {
        id: 'contabilidade',
        title: 'Contabilidade',
        icon: BookOpen,
        content: `Lançamentos contábeis, balanços e demonstrativos financeiros.

**Funcionalidades principais:**
- Livro Diário automatizado
- Balanço Patrimonial
- DRE (Demonstração do Resultado)
- Balancete de verificação
- Plano de contas personalizável

**Benefícios:**
Mantenha a contabilidade em dia com lançamentos automatizados e relatórios gerenciais precisos.`
      },
      {
        id: 'fiscal',
        title: 'Módulo Fiscal',
        icon: Receipt,
        content: `Emissão de notas fiscais e gestão de obrigações acessórias.

**Funcionalidades principais:**
- Emissão de NF-e e NFC-e
- Geração de DANFE
- Escrituração fiscal
- Cálculo automático de impostos
- Integração com SEFAZ

**Benefícios:**
Simplifique a rotina fiscal com emissão automatizada e cálculos precisos de tributos.`
      },
      {
        id: 'compliance',
        title: 'Compliance e Auditoria',
        icon: Shield,
        content: `Garanta conformidade regulatória e rastreabilidade total.

**Funcionalidades principais:**
- Análise fiscal preventiva
- Mapeamento contábil
- Alertas de inconsistências
- Trilha de auditoria completa
- Relatórios de compliance

**Benefícios:**
Reduza riscos fiscais e esteja sempre preparado para auditorias com rastreabilidade total.`
      }
    ]
  },
  inteligencia: {
    title: 'Inteligência (IA)',
    icon: Bot,
    color: 'text-violet-500',
    bgColor: 'bg-violet-50',
    description: 'Automação inteligente, análises preditivas e agentes de IA.',
    modules: [
      {
        id: 'cfo-virtual',
        title: 'CFO Virtual',
        icon: Brain,
        content: `Seu assistente financeiro inteligente com análises em tempo real.

**Funcionalidades principais:**
- Análise automática de saúde financeira
- Detecção de anomalias
- Recomendações de ação
- Alertas proativos
- Insights baseados em dados

**Como configurar uma nova meta?**
1. Acesse o módulo de Planejamento Financeiro
2. Clique em "Nova Meta"
3. Defina o indicador (Receita, Margem, etc.)
4. Configure o período e valores
5. O CFO Virtual acompanhará automaticamente

**Benefícios:**
Tome decisões mais inteligentes com análises automatizadas e recomendações baseadas em IA.`
      },
      {
        id: 'agente-whatsapp',
        title: 'Agente WhatsApp',
        icon: MessageSquare,
        content: `Interaja com o sistema via WhatsApp de forma natural.

**Funcionalidades principais:**
- Comandos por voz e texto
- Consulta de saldos e posições
- Registro de transações
- Aprovações rápidas
- Notificações personalizadas

**Benefícios:**
Gerencie suas finanças de qualquer lugar, a qualquer hora, com a praticidade do WhatsApp.`
      },
      {
        id: 'monitoramento',
        title: 'Monitoramento Inteligente',
        icon: Activity,
        content: `Monitore anomalias e receba alertas em tempo real.

**Funcionalidades principais:**
- Detecção de padrões anômalos
- Alertas configuráveis
- Dashboard de monitoramento
- Logs de atividades da IA
- Análise de tendências

**Benefícios:**
Identifique problemas antes que se tornem críticos com monitoramento proativo baseado em IA.`
      },
      {
        id: 'decisoes-ia',
        title: 'Decisões da IA',
        icon: Zap,
        content: `Revise e aprove ações sugeridas pela inteligência artificial.

**Funcionalidades principais:**
- Fila de decisões pendentes
- Níveis de confiança
- Aprovação/rejeição em lote
- Histórico de decisões
- Feedback para aprendizado

**Benefícios:**
Mantenha o controle sobre as automações enquanto se beneficia da velocidade da IA.`
      }
    ]
  },
  configuracoes: {
    title: 'Configurações',
    icon: Settings,
    color: 'text-slate-500',
    bgColor: 'bg-slate-50',
    description: 'Personalize o sistema de acordo com as necessidades do seu negócio.',
    modules: [
      {
        id: 'cadastros',
        title: 'Cadastros Base',
        icon: Building2,
        content: `Configure os cadastros fundamentais do sistema.

**Funcionalidades principais:**
- Clientes e Fornecedores unificados
- Plano de Contas personalizável
- Centros de Custo
- Dimensões analíticas
- Categorias e subcategorias

**Benefícios:**
Tenha uma base de dados organizada que facilita análises e relatórios gerenciais.`
      },
      {
        id: 'integracoes',
        title: 'Integrações e APIs',
        icon: Plug,
        content: `Conecte o Caixa Forte com outros sistemas e bancos.

**Funcionalidades principais:**
- Open Banking / Open Finance
- Integração Pix
- Antecipação de recebíveis
- APIs REST
- Webhooks configuráveis

**Benefícios:**
Automatize processos e elimine retrabalho com integrações nativas e APIs flexíveis.`
      },
      {
        id: 'importar-exportar',
        title: 'Importar / Exportar',
        icon: Upload,
        content: `Migre dados e exporte relatórios em diversos formatos.

**Funcionalidades principais:**
- Importação de planilhas Excel
- Exportação de relatórios
- Backup de dados
- Migração de sistemas legados
- Templates configuráveis

**Benefícios:**
Facilite a migração de dados e mantenha backups seguros das suas informações.`
      }
    ]
  }
};

export default function Documentacao() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['operacional']);
  const [selectedModule, setSelectedModule] = useState<string | null>('pdv');

  const toggleCategory = (categoryKey: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryKey) 
        ? prev.filter(k => k !== categoryKey)
        : [...prev, categoryKey]
    );
  };

  // Filter modules based on search
  const filteredCategories = Object.entries(knowledgeBase).map(([key, category]) => ({
    key,
    ...category,
    modules: category.modules.filter(module => 
      module.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      module.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.modules.length > 0 || !searchQuery);

  // Get selected module content
  const getSelectedModuleContent = () => {
    for (const [, category] of Object.entries(knowledgeBase)) {
      const module = category.modules.find(m => m.id === selectedModule);
      if (module) return { module, category };
    }
    return null;
  };

  const selectedContent = getSelectedModuleContent();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary via-violet-600 to-primary py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-3">
            Central de Ajuda
          </h1>
          <p className="text-primary-foreground/80 text-lg mb-6">
            Encontre respostas, tutoriais e documentação completa do Caixa Forte
          </p>
          
          {/* Search */}
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar na documentação... (ex: 'Rolling Forecast', 'como configurar meta')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 text-base bg-card border-0 shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Categories */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Categorias</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[calc(100vh-280px)]">
                  <div className="px-4 pb-4 space-y-1">
                    {filteredCategories.map(category => {
                      const IconComponent = category.icon;
                      const isExpanded = expandedCategories.includes(category.key);
                      
                      return (
                        <Collapsible 
                          key={category.key} 
                          open={isExpanded}
                          onOpenChange={() => toggleCategory(category.key)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className={cn(
                              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                              'hover:bg-muted/60',
                              isExpanded && category.bgColor
                            )}>
                              <IconComponent className={cn('h-5 w-5', category.color)} />
                              <span className="flex-1 text-left font-medium text-sm">
                                {category.title}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {category.modules.length}
                              </Badge>
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="ml-4 pl-4 border-l-2 border-muted space-y-0.5 mt-1">
                              {category.modules.map(module => {
                                const ModuleIcon = module.icon;
                                return (
                                  <button
                                    key={module.id}
                                    onClick={() => setSelectedModule(module.id)}
                                    className={cn(
                                      'w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left',
                                      selectedModule === module.id
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                                    )}
                                  >
                                    <ModuleIcon className="h-4 w-4" />
                                    {module.title}
                                  </button>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {selectedContent ? (
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center gap-3">
                    <div className={cn('p-2 rounded-lg', selectedContent.category.bgColor)}>
                      <selectedContent.module.icon className={cn('h-6 w-6', selectedContent.category.color)} />
                    </div>
                    <div>
                      <Badge variant="outline" className="mb-1 text-xs">
                        {selectedContent.category.title}
                      </Badge>
                      <CardTitle className="text-xl">{selectedContent.module.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="prose prose-slate max-w-none">
                    {selectedContent.module.content.split('\n').map((paragraph, idx) => {
                      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <h3 key={idx} className="text-lg font-semibold text-foreground mt-6 mb-3">
                            {paragraph.replace(/\*\*/g, '')}
                          </h3>
                        );
                      }
                      if (paragraph.startsWith('- ')) {
                        return (
                          <li key={idx} className="text-muted-foreground ml-4">
                            {paragraph.substring(2)}
                          </li>
                        );
                      }
                      if (paragraph.match(/^\d\./)) {
                        return (
                          <li key={idx} className="text-muted-foreground ml-4 list-decimal">
                            {paragraph.substring(3)}
                          </li>
                        );
                      }
                      if (paragraph.trim()) {
                        return (
                          <p key={idx} className="text-muted-foreground leading-relaxed mb-3">
                            {paragraph}
                          </p>
                        );
                      }
                      return null;
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="flex items-center justify-center h-96">
                <div className="text-center text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecione um módulo para ver a documentação</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export knowledge base for Copilot context
export { knowledgeBase };
