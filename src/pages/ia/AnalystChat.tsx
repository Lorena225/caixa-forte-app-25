import { useState, useRef, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  Send, 
  Plus,
  MessageSquare,
  Bot,
  User,
  RefreshCw,
  Sparkles,
  History
} from "lucide-react";
import { 
  useAnalystConversations,
  useAnalystMessages,
  useCreateConversation,
  useSendAnalystMessage
} from "@/hooks/useAIModule";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const EXAMPLE_QUESTIONS = [
  "Quais são os 10 clientes que mais atrasaram nos últimos 6 meses?",
  "Qual é o meu fluxo de caixa previsto para os próximos 30 dias?",
  "Faça um resumo financeiro da empresa no último trimestre",
  "Qual foi o impacto de juros e multas no meu resultado?",
  "Compare o faturamento dos últimos 12 meses",
  "Quais fornecedores têm maior concentração de gastos?",
];

export default function AnalystChat() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { data: conversations, isLoading: loadingConversations } = useAnalystConversations();
  const { data: messages, isLoading: loadingMessages } = useAnalystMessages(activeConversationId);
  const createConversation = useCreateConversation();
  const sendMessage = useSendAnalystMessage();

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleNewConversation = async () => {
    try {
      const conv = await createConversation.mutateAsync();
      setActiveConversationId(conv.id);
    } catch (error) {
      toast.error("Erro ao criar conversa");
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    let convId = activeConversationId;

    // Create new conversation if none exists
    if (!convId) {
      try {
        const conv = await createConversation.mutateAsync(inputMessage.slice(0, 50));
        convId = conv.id;
        setActiveConversationId(convId);
      } catch (error) {
        toast.error("Erro ao criar conversa");
        return;
      }
    }

    const messageToSend = inputMessage;
    setInputMessage("");
    setIsStreaming(true);

    try {
      await sendMessage.mutateAsync({
        conversationId: convId,
        content: messageToSend,
      });
    } catch (error) {
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsStreaming(false);
    }
  };

  const handleExampleClick = (question: string) => {
    setInputMessage(question);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Analista Inteligente"
          description="Faça perguntas e obtenha análises sobre seus dados financeiros"
        />

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar - Conversations */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Conversas
                </CardTitle>
                <Button size="sm" onClick={handleNewConversation} disabled={createConversation.isPending}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-2">
              <ScrollArea className="h-[500px]">
                {loadingConversations ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !conversations?.length ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma conversa</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {conversations.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => setActiveConversationId(conv.id)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          activeConversationId === conv.id 
                            ? "bg-primary/10 text-primary" 
                            : "hover:bg-muted"
                        )}
                      >
                        <p className="font-medium truncate">{conv.title || "Nova conversa"}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(conv.last_message_at), "dd/MM HH:mm")}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main Chat Area */}
          <Card className="lg:col-span-3">
            <CardContent className="p-0 flex flex-col h-[600px]">
              {/* Messages */}
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {!activeConversationId ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Brain className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Analista Financeiro IA</h3>
                    <p className="text-muted-foreground mb-6 max-w-md">
                      Faça perguntas sobre seus dados financeiros e receba análises detalhadas em linguagem natural.
                    </p>
                    
                    <div className="space-y-2 w-full max-w-lg">
                      <p className="text-sm font-medium text-muted-foreground">Experimente perguntar:</p>
                      <div className="grid gap-2">
                        {EXAMPLE_QUESTIONS.slice(0, 4).map((question, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleExampleClick(question)}
                            className="text-left text-sm p-3 rounded-lg border hover:bg-muted transition-colors"
                          >
                            <Sparkles className="h-4 w-4 inline mr-2 text-primary" />
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages?.map((msg) => (
                      <MessageBubble key={msg.id} message={msg} />
                    ))}
                    {isStreaming && (
                      <div className="flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span className="text-sm text-muted-foreground">Analisando...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="border-t p-4">
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Faça uma pergunta sobre seus dados financeiros..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    disabled={isStreaming}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={!inputMessage.trim() || isStreaming}>
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function MessageBubble({ message }: { message: any }) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex items-start gap-3", isUser && "flex-row-reverse")}>
      <div className={cn(
        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
        isUser ? "bg-primary" : "bg-primary/10"
      )}>
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-primary" />
        )}
      </div>
      <div className={cn(
        "rounded-lg p-3 max-w-[80%]",
        isUser ? "bg-primary text-primary-foreground" : "bg-muted"
      )}>
        <div className="text-sm whitespace-pre-wrap">{message.content}</div>
        <p className={cn(
          "text-xs mt-1",
          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {format(new Date(message.created_at), "HH:mm")}
        </p>
      </div>
    </div>
  );
}
