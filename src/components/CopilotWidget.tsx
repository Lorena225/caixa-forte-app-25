import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface CopilotContext {
  route: string;
  module: string;
  userId?: string;
  companyId?: string;
  companyName?: string;
}

const getModuleFromRoute = (pathname: string): string => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return 'Dashboard';
  
  const moduleMap: Record<string, string> = {
    'dashboard': 'Dashboard',
    'dashboards': 'Dashboards',
    'paineis': 'Painéis',
    'fiscal': 'Fiscal',
    'tesouraria': 'Tesouraria',
    'cobranca': 'Cobrança',
    'compras': 'Compras',
    'vendas': 'Vendas',
    'estoque': 'Estoque',
    'contabilidade': 'Contabilidade',
    'cadastros': 'Cadastros',
    'admin': 'Administração',
    'integracoes': 'Integrações',
    'rh': 'Recursos Humanos',
    'crm': 'CRM',
    'conciliacao': 'Conciliação',
    'autopilot': 'Autopilot',
    'reports': 'Relatórios',
    'ap': 'Contas a Pagar',
    'ar': 'Contas a Receber',
    'financeiro': 'Financeiro',
    'produtos': 'Produtos',
    'servicos': 'Serviços',
    'inovacao': 'Inovação',
    'openfinance': 'Open Finance',
    'embedded': 'Serviços Financeiros',
    'compliance': 'Compliance',
    'ia': 'Inteligência Artificial',
  };
  
  return moduleMap[segments[0]] || segments[0].charAt(0).toUpperCase() + segments[0].slice(1);
};

export function CopilotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const { user, currentCompany } = useAuth();

  const context: CopilotContext = {
    route: location.pathname,
    module: getModuleFromRoute(location.pathname),
    userId: user?.id,
    companyId: currentCompany?.id,
    companyName: currentCompany?.name,
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = useCallback(async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    let assistantContent = '';
    const assistantId = crypto.randomUUID();

    try {
      // Add placeholder for assistant message
      setMessages(prev => [...prev, {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
      }]);

      const response = await supabase.functions.invoke('copilot-message', {
        body: {
          message: trimmedInput,
          context,
          conversationHistory: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get response');
      }

      // Handle streaming response
      if (response.data) {
        const reader = response.data.getReader?.();
        if (reader) {
          const decoder = new TextDecoder();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
            
            for (const line of lines) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  assistantContent += content;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantId 
                      ? { ...m, content: assistantContent }
                      : m
                  ));
                }
              } catch {
                // Not JSON, might be plain text
                assistantContent += data;
                setMessages(prev => prev.map(m => 
                  m.id === assistantId 
                    ? { ...m, content: assistantContent }
                    : m
                ));
              }
            }
          }
        } else {
          // Non-streaming response
          const text = typeof response.data === 'string' 
            ? response.data 
            : JSON.stringify(response.data);
          setMessages(prev => prev.map(m => 
            m.id === assistantId 
              ? { ...m, content: text }
              : m
          ));
        }
      }
    } catch (error) {
      console.error('Copilot error:', error);
      setMessages(prev => prev.map(m => 
        m.id === assistantId 
          ? { ...m, content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' }
          : m
      ));
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages, context]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button - Always visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'fixed bottom-6 right-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105',
          'bg-[#0085FF] text-white hover:bg-[#0070DD]',
          isOpen && 'rotate-0'
        )}
        aria-label={isOpen ? 'Fechar Copilot' : 'Abrir Copilot'}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageSquare className="h-6 w-6" />
        )}
      </button>

      {/* Chat Panel */}
      <div
        className={cn(
          'fixed bottom-24 right-6 z-[998] flex flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl transition-all duration-300',
          'w-[380px] max-w-[calc(100vw-3rem)]',
          isOpen ? 'h-[520px] opacity-100 scale-100' : 'h-0 opacity-0 scale-95 pointer-events-none'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b bg-[#0085FF] px-4 py-3 text-white">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Copilot AI</h3>
            <p className="text-xs text-white/80">Assistente Financeiro</p>
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs">
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            Online
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef as React.RefObject<HTMLDivElement>}>
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted-foreground">
              <Sparkles className="mb-4 h-12 w-12 text-[#0085FF]/50" />
              <p className="text-sm font-medium">Como posso ajudar?</p>
              <p className="mt-1 text-xs">
                Estou no módulo: <span className="font-medium text-[#0085FF]">{context.module}</span>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2 text-sm',
                      message.role === 'user'
                        ? 'bg-[#0085FF] text-white rounded-br-md'
                        : 'bg-muted text-foreground rounded-bl-md'
                    )}
                  >
                    {message.content || (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-background p-4">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="flex-1 resize-none rounded-xl border bg-muted/50 px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#0085FF] max-h-24"
              rows={1}
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl bg-[#0085FF] hover:bg-[#0070DD]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CopilotWidget;
