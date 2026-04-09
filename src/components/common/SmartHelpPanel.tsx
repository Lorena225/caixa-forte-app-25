import { memo, useState } from 'react';
import { Info, BookOpen, LayoutDashboard, CreditCard, Brain, ChevronRight, Sparkles, TrendingUp, PieChart, Bot, MessageSquare, Zap, Target, Shield, HelpCircle, ArrowRight, CheckCircle2, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface HelpSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  badge?: string;
  topics: HelpTopic[];
}

interface HelpTopic {
  id: string;
  title: string;
  content: React.ReactNode;
}

const helpSections: HelpSection[] = [
  {
    id: 'dashboard',
    title: 'Dashboard Executivo',
    icon: <LayoutDashboard className="h-5 w-5" />,
    topics: [
      {
        id: 'dashboard-overview',
        title: 'Visão Geral do Painel',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              O <strong className="text-foreground">Dashboard Executivo</strong> é sua central de comando financeiro. 
              Aqui você visualiza a saúde financeira da empresa em tempo real.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="font-medium text-foreground flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                O que você encontra:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Saldo atual de caixa e bancos</li>
                <li>Contas a receber e a pagar</li>
                <li>Gráficos de fluxo de caixa</li>
                <li>Alertas importantes</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Dica:</strong> Use os filtros de período no topo para analisar diferentes intervalos de tempo.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'dashboard-kpis',
        title: 'Indicadores (KPIs)',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Os <strong className="text-foreground">KPIs</strong> (Indicadores-Chave de Desempenho) mostram métricas 
              cruciais para tomada de decisão.
            </p>
            <div className="grid gap-2">
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-xs">Saldo de Caixa</p>
                  <p className="text-xs">Total disponível em todas as contas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Target className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-xs">A Receber</p>
                  <p className="text-xs">Valores pendentes de clientes</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <PieChart className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-xs">A Pagar</p>
                  <p className="text-xs">Compromissos com fornecedores</p>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'dashboard-widgets',
        title: 'Personalizando Widgets',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Você pode personalizar seu dashboard para mostrar apenas o que importa para você.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Como personalizar:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Clique no botão <strong>"Editar"</strong> no canto superior direito</li>
                <li>Arraste os widgets para reorganizar</li>
                <li>Use os toggles para mostrar/ocultar cards</li>
                <li>Clique em <strong>"Salvar"</strong> para manter suas alterações</li>
              </ol>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Dica:</strong> Suas preferências são salvas automaticamente e ficam disponíveis em qualquer dispositivo.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'transactions',
    title: 'Transações Financeiras',
    icon: <CreditCard className="h-5 w-5" />,
    topics: [
      {
        id: 'transactions-overview',
        title: 'Gerenciando Transações',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              As <strong className="text-foreground">Transações</strong> são o coração do seu controle financeiro. 
              Aqui você registra todas as entradas e saídas.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="font-medium text-foreground">Tipos de transação:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600">Receitas</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <span className="text-xs font-medium text-red-600">Despesas</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-medium text-blue-600">Transferências</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  <span className="text-xs font-medium text-purple-600">Investimentos</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'transactions-create',
        title: 'Criando Nova Transação',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Registrar uma nova transação é simples e rápido.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Passo a passo:</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>Clique no botão <strong className="text-primary">+ Novo</strong> no topo da tela</li>
                <li>Selecione o tipo (Receita, Despesa, etc.)</li>
                <li>Preencha valor, data e descrição</li>
                <li>A IA irá sugerir a categoria automaticamente! ✨</li>
                <li>Confirme e salve</li>
              </ol>
            </div>
            <div className="flex items-start gap-2 p-3 bg-menu-ia/10 rounded-lg border border-menu-ia/20">
              <Sparkles className="h-4 w-4 text-menu-ia mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>IA em ação:</strong> Ao digitar a descrição, nossa IA analisa o texto e sugere automaticamente 
                a melhor categoria para sua transação.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'transactions-filters',
        title: 'Filtros e Busca',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Use os filtros avançados para encontrar exatamente o que precisa.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="font-medium text-foreground">Filtros disponíveis:</p>
              <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                <li><strong>Período:</strong> Hoje, semana, mês, personalizado</li>
                <li><strong>Tipo:</strong> Receita, despesa, transferência</li>
                <li><strong>Categoria:</strong> Alimentação, transporte, etc.</li>
                <li><strong>Status:</strong> Pago, pendente, atrasado</li>
                <li><strong>Valor:</strong> Faixa de valores mínimo/máximo</li>
              </ul>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Atalho:</strong> Use <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Ctrl+K</kbd> para busca rápida global.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'transactions-recurring',
        title: 'Transações Recorrentes',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Configure transações que se repetem automaticamente (aluguel, salários, assinaturas).
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground">Como configurar:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2 text-xs">
                <li>Ao criar uma transação, ative "Repetir"</li>
                <li>Escolha a frequência (diária, semanal, mensal, anual)</li>
                <li>Defina data de início e fim (opcional)</li>
                <li>O sistema criará automaticamente as próximas ocorrências</li>
              </ol>
            </div>
            <div className="flex items-start gap-2 p-3 bg-emerald-500/5 rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Benefício:</strong> Economize tempo e nunca esqueça de registrar despesas fixas.
              </p>
            </div>
          </div>
        ),
      },
    ],
  },
  {
    id: 'ai',
    title: 'Inteligência Artificial',
    icon: <Brain className="h-5 w-5" />,
    badge: 'Novo',
    topics: [
      {
        id: 'ai-overview',
        title: 'Como a IA Ajuda Você',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              O <strong className="text-foreground">Vitrio</strong> usa inteligência artificial avançada para 
              automatizar tarefas e fornecer insights valiosos.
            </p>
            <div className="bg-gradient-to-r from-menu-ia/10 to-primary/10 rounded-lg p-4 space-y-3">
              <p className="font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-menu-ia" />
                Principais recursos de IA:
              </p>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Categorização automática de transações</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Análise inteligente de gastos</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Previsão de fluxo de caixa</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Alertas proativos de problemas</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Sugestões de economia</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'ai-categorization',
        title: 'Categorização Automática',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              A IA analisa a descrição de cada transação e sugere a categoria mais adequada automaticamente.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-3">
              <p className="font-medium text-foreground text-xs">Exemplo prático:</p>
              <div className="space-y-2">
                <div className="p-2 bg-card rounded border border-border">
                  <p className="text-xs font-mono">"Uber - viagem escritório"</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/20">
                      Transporte
                    </Badge>
                    <span className="text-xs text-emerald-500">98% confiança</span>
                  </div>
                </div>
                <div className="p-2 bg-card rounded border border-border">
                  <p className="text-xs font-mono">"Almoço reunião cliente"</p>
                  <div className="flex items-center gap-2 mt-1">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                      Alimentação
                    </Badge>
                    <span className="text-xs text-emerald-500">95% confiança</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>A IA aprende com você:</strong> Quanto mais você usa, mais precisa ela fica!
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'ai-analysis',
        title: 'Análise de Gastos',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              A IA analisa seus padrões de gastos e identifica oportunidades de economia.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground text-xs">O que a IA detecta:</p>
              <div className="grid gap-2">
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-orange-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Gastos acima do normal</p>
                    <p className="text-xs">Alerta quando uma categoria sobe muito</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                  <PieChart className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Distribuição de gastos</p>
                    <p className="text-xs">Mostra onde o dinheiro está indo</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-2 bg-muted/30 rounded-lg">
                  <Target className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Metas e orçamentos</p>
                    <p className="text-xs">Acompanha seu progresso vs. metas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ),
      },
      {
        id: 'ai-copilot',
        title: 'Copiloto Financeiro',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              O <strong className="text-foreground">Copiloto</strong> é seu assistente pessoal de finanças. 
              Converse naturalmente e obtenha respostas instantâneas.
            </p>
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <p className="font-medium text-foreground text-xs">Pergunte coisas como:</p>
              <div className="space-y-1.5">
                <div className="p-2 bg-card rounded-lg border border-border">
                  <p className="text-xs italic">"Quanto gastei em transporte este mês?"</p>
                </div>
                <div className="p-2 bg-card rounded-lg border border-border">
                  <p className="text-xs italic">"Quais contas vencem esta semana?"</p>
                </div>
                <div className="p-2 bg-card rounded-lg border border-border">
                  <p className="text-xs italic">"Mostre meu fluxo de caixa projetado"</p>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-menu-ia/10 rounded-lg border border-menu-ia/20">
              <Bot className="h-4 w-4 text-menu-ia mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Acesso rápido:</strong> Clique no ícone do robô no canto inferior direito para abrir o Copiloto.
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'ai-whatsapp',
        title: 'Assistente WhatsApp',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Gerencie suas finanças diretamente pelo WhatsApp, sem precisar abrir o sistema.
            </p>
            <div className="bg-emerald-500/5 rounded-lg p-3 space-y-2 border border-emerald-500/20">
              <p className="font-medium text-foreground text-xs flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                Comandos disponíveis:
              </p>
              <div className="space-y-1 text-xs">
                <p><strong>"saldo"</strong> - Ver saldo atual</p>
                <p><strong>"pagar [valor] [descrição]"</strong> - Registrar pagamento</p>
                <p><strong>"receber [valor] [descrição]"</strong> - Registrar recebimento</p>
                <p><strong>"contas"</strong> - Ver próximas contas a vencer</p>
                <p><strong>"resumo"</strong> - Resumo financeiro do mês</p>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
              <Zap className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <p className="text-xs">
                <strong>Configure em:</strong> Menu IA → Assistente WhatsApp → Conectar
              </p>
            </div>
          </div>
        ),
      },
      {
        id: 'ai-monitor',
        title: 'Monitor Financeiro',
        content: (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              O <strong className="text-foreground">Monitor</strong> vigia suas finanças 24/7 e envia alertas 
              proativos sobre situações importantes.
            </p>
            <div className="space-y-2">
              <p className="font-medium text-foreground text-xs">Tipos de alertas:</p>
              <div className="grid gap-2">
                <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                  <Shield className="h-4 w-4 text-red-500" />
                  <span className="text-xs">Contas vencendo ou atrasadas</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-xs">Gastos acima do orçamento</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <Target className="h-4 w-4 text-blue-500" />
                  <span className="text-xs">Saldo baixo em contas</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs">Oportunidades de economia</span>
                </div>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
];

interface SmartHelpPanelProps {
  className?: string;
}

export const SmartHelpPanel = memo(function SmartHelpPanel({ className }: SmartHelpPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-10 w-10 min-w-[44px] min-h-[44px] rounded-full',
            'text-muted-foreground hover:text-primary hover:bg-muted/50',
            'transition-all duration-200',
            'border border-transparent hover:border-border',
            className
          )}
          aria-label="Manual do Usuário"
          aria-haspopup="dialog"
        >
          <Info className="h-5 w-5" aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border bg-gradient-to-r from-primary/5 to-menu-ia/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle className="text-left text-lg">Manual do Usuário</SheetTitle>
              <SheetDescription className="text-left text-xs">
                Guia completo do Vitrio ERP
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4">
            {helpSections.map((section) => (
              <div key={section.id} className="space-y-2">
                {/* Section Header */}
                <div className="flex items-center gap-2 px-2">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    {section.icon}
                  </div>
                  <h3 className="font-semibold text-foreground">{section.title}</h3>
                  {section.badge && (
                    <Badge className="bg-menu-ia text-white text-xs px-2 py-0">
                      {section.badge}
                    </Badge>
                  )}
                </div>

                {/* Section Topics */}
                <Accordion type="single" collapsible className="space-y-1">
                  {section.topics.map((topic) => (
                    <AccordionItem 
                      key={topic.id} 
                      value={topic.id}
                      className="border border-border rounded-lg bg-card overflow-hidden data-[state=open]:bg-muted/30"
                    >
                      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/50 text-sm font-medium">
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-90" />
                          {topic.title}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4 pt-0">
                        {topic.content}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}

            {/* Footer Help */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <HelpCircle className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Precisa de mais ajuda?</p>
                  <p className="text-xs text-muted-foreground">
                    Use o Copiloto (canto inferior direito) para tirar dúvidas ou acesse o suporte técnico.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
});

export default SmartHelpPanel;
