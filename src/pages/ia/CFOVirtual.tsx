import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCFOInsights, useMarkInsightRead } from "@/hooks/useInnovationPlatform";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Brain,
  Send,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  Bot,
  User,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Clock,
  CheckCircle2,
} from "lucide-react";

const EXAMPLE_QUESTIONS = [
  "Quais são meus maiores riscos financeiros nos próximos 90 dias?",
  "Sugira 3 ações práticas para melhorar meu fluxo de caixa",
  "Onde posso cortar custos sem impactar a operação?",
  "Qual é a previsão de inadimplência para o próximo mês?",
  "Compare o desempenho financeiro deste trimestre com o anterior",
  "Quais fornecedores têm maior poder de negociação?",
];

// Mock insights for demonstration
const MOCK_INSIGHTS = [
  {
    id: "1",
    insight_type: "risk",
    priority: "high",
    title: "Concentração de Recebíveis",
    summary: "50% do AR está concentrado em 3 clientes. Risco de inadimplência elevado se um deles atrasar.",
    suggested_actions: ["Diversificar carteira", "Renegociar prazos", "Avaliar seguro de crédito"],
    is_read: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "2",
    insight_type: "opportunity",
    priority: "normal",
    title: "Economia com Fornecedores",
    summary: "Identificamos potencial de economia de R$ 45.000/mês renegociando com 5 fornecedores principais.",
    suggested_actions: ["Solicitar cotações", "Renegociar contratos", "Avaliar fornecedores alternativos"],
    is_read: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "3",
    insight_type: "recommendation",
    priority: "urgent",
    title: "Otimização do Capital de Giro",
    summary: "Prazo médio de recebimento (45d) está maior que pagamento (30d). Sugerimos inverter para liberar caixa.",
    suggested_actions: ["Antecipar recebíveis", "Negociar prazos maiores com fornecedores"],
    is_read: true,
    created_at: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: "4",
    insight_type: "trend",
    priority: "normal",
    title: "Tendência de Custos Fixos",
    summary: "Custos fixos cresceram 12% nos últimos 6 meses, acima da inflação. Atenção necessária.",
    suggested_actions: ["Revisar contratos", "Avaliar terceirizações", "Otimizar espaço físico"],
    is_read: true,
    created_at: new Date(Date.now() - 259200000).toISOString(),
  },
];

const INSIGHT_CONFIG = {
  risk: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10", label: "Risco" },
  opportunity: { icon: TrendingUp, color: "text-success", bg: "bg-success/10", label: "Oportunidade" },
  recommendation: { icon: Lightbulb, color: "text-warning", bg: "bg-warning/10", label: "Recomendação" },
  alert: { icon: AlertTriangle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Alerta" },
  trend: { icon: Target, color: "text-info", bg: "bg-info/10", label: "Tendência" },
};

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", color: "bg-primary/10 text-primary" },
  high: { label: "Alta", color: "bg-warning/10 text-warning" },
  urgent: { label: "Urgente", color: "bg-destructive/10 text-destructive" },
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function CFOVirtual() {
  const [activeTab, setActiveTab] = useState("chat");
  const [inputMessage, setInputMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: dbInsights = [] } = useCFOInsights();
  const markRead = useMarkInsightRead();

  // Use mock data
  const insights = MOCK_INSIGHTS;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response
    await new Promise((r) => setTimeout(r, 2000));

    const aiResponse: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: generateAIResponse(inputMessage),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiResponse]);
    setIsTyping(false);
  };

  const generateAIResponse = (question: string): string => {
    // Simplified mock responses based on question keywords
    if (question.toLowerCase().includes("risco")) {
      return `Analisando seus dados financeiros, identifiquei 3 principais riscos nos próximos 90 dias:

1. **Concentração de AR** - 50% dos recebíveis estão em 3 clientes principais. Se um deles atrasar, o impacto no caixa será de aproximadamente R$ 150.000.

2. **Vencimentos AP em pico** - Na segunda quinzena de março, há R$ 280.000 em vencimentos concentrados. Seu saldo projetado ficará apertado.

3. **Sazonalidade de vendas** - Historicamente, abril apresenta queda de 15% nas vendas. Prepare reserva de caixa.

**Ações sugeridas:**
- Antecipar contato com os 3 maiores clientes para confirmar pagamentos
- Negociar postergação de pelo menos R$ 100.000 em AP
- Considerar antecipação de recebíveis para criar colchão`;
    }

    if (question.toLowerCase().includes("fluxo de caixa") || question.toLowerCase().includes("caixa")) {
      return `Para melhorar seu fluxo de caixa, sugiro 3 ações práticas imediatas:

1. **Antecipar Recebíveis** - Você tem R$ 98.500 elegíveis para antecipação com taxa de 1.8% a.m. Considerando o custo do capital parado, vale a pena.

2. **Renegociar Top 5 Fornecedores** - Aumentando o prazo médio de 30 para 45 dias, você libera cerca de R$ 65.000 em capital de giro.

3. **Política de Desconto para Antecipação** - Ofereça 2% de desconto para clientes que paguem em 7 dias. Baseado no histórico, 30% dos clientes aderem.

**Impacto estimado:** +R$ 180.000 de caixa disponível nos próximos 30 dias.`;
    }

    if (question.toLowerCase().includes("custo")) {
      return `Analisei sua estrutura de custos e identifiquei oportunidades de economia:

**Custos que podem ser reduzidos sem impacto operacional:**

| Categoria | Atual | Potencial | Economia |
|-----------|-------|-----------|----------|
| Telecom/TI | R$ 12.500 | R$ 8.000 | R$ 4.500 |
| Material escritório | R$ 3.200 | R$ 1.800 | R$ 1.400 |
| Serviços terceiros | R$ 28.000 | R$ 22.000 | R$ 6.000 |

**Total de economia mensal: R$ 11.900** (7% dos custos fixos)

Recomendo iniciar pela renegociação de telecom - os contratos venceram há 2 meses e as operadoras estão com ofertas agressivas.`;
    }

    return `Entendi sua pergunta sobre "${question}". Analisando os dados disponíveis no sistema:

Com base nos últimos 12 meses de dados financeiros, posso oferecer algumas perspectivas:

1. Sua margem operacional média está em 18%, acima da média do setor (15%).
2. O ciclo financeiro de 15 dias indica boa gestão de capital de giro.
3. A inadimplência está controlada em 3.2% do faturamento.

Posso detalhar algum aspecto específico dessa análise?`;
  };

  const handleExampleClick = (question: string) => {
    setInputMessage(question);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="CFO Virtual"
          description="Seu assistente financeiro inteligente com análises e recomendações"
        >
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by AI
          </Badge>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="chat" className="gap-1.5">
              <Brain className="h-4 w-4" />
              Chat Analítico
            </TabsTrigger>
            <TabsTrigger value="insights" className="gap-1.5">
              <Lightbulb className="h-4 w-4" />
              Insights
              {insights.filter((i) => !i.is_read).length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 justify-center">
                  {insights.filter((i) => !i.is_read).length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* CHAT TAB */}
          <TabsContent value="chat" className="space-y-4">
            <Card className="flex flex-col h-[600px]">
              <CardContent className="p-0 flex flex-col h-full">
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Brain className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">CFO Virtual</h3>
                      <p className="text-muted-foreground mb-6 max-w-md">
                        Faça perguntas estratégicas sobre suas finanças. Receba análises, 
                        recomendações e insights baseados nos seus dados.
                      </p>
                      <div className="space-y-2 w-full max-w-lg">
                        <p className="text-sm font-medium text-muted-foreground">Experimente perguntar:</p>
                        <div className="grid gap-2">
                          {EXAMPLE_QUESTIONS.slice(0, 4).map((q, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleExampleClick(q)}
                              className="text-left text-sm p-3 rounded-lg border hover:bg-muted hover:border-primary/30 transition-colors"
                            >
                              <Sparkles className="h-4 w-4 inline mr-2 text-primary" />
                              {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className={cn("flex items-start gap-3", msg.role === "user" && "flex-row-reverse")}
                        >
                          <div
                            className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                              msg.role === "user" ? "bg-primary" : "bg-primary/10"
                            )}
                          >
                            {msg.role === "user" ? (
                              <User className="h-4 w-4 text-primary-foreground" />
                            ) : (
                              <Bot className="h-4 w-4 text-primary" />
                            )}
                          </div>
                          <div
                            className={cn(
                              "rounded-lg p-3 max-w-[80%]",
                              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                            )}
                          >
                            <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                            <p
                              className={cn(
                                "text-xs mt-2",
                                msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                              )}
                            >
                              {format(msg.timestamp, "HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              <span className="text-sm text-muted-foreground">Analisando dados...</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                <div className="border-t p-4 bg-background">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessage();
                    }}
                    className="flex gap-2"
                  >
                    <Input
                      placeholder="Pergunte sobre seus riscos, oportunidades, fluxo de caixa..."
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      disabled={isTyping}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={!inputMessage.trim() || isTyping}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* INSIGHTS TAB */}
          <TabsContent value="insights" className="space-y-4">
            <div className="space-y-3">
              {insights.map((insight) => {
                const config = INSIGHT_CONFIG[insight.insight_type as keyof typeof INSIGHT_CONFIG];
                const priorityConfig = PRIORITY_CONFIG[insight.priority as keyof typeof PRIORITY_CONFIG];
                const InsightIcon = config?.icon || Lightbulb;

                return (
                  <Card
                    key={insight.id}
                    className={cn("card-hover cursor-pointer", !insight.is_read && "border-l-4 border-l-primary")}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-4">
                        <div className={cn("p-2 rounded-lg", config?.bg)}>
                          <InsightIcon className={cn("h-5 w-5", config?.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge className={priorityConfig?.color}>{priorityConfig?.label}</Badge>
                            <Badge variant="outline">{config?.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{insight.summary}</p>
                          <div className="flex flex-wrap gap-2">
                            {(insight.suggested_actions as string[]).map((action, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {action}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(insight.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
