import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  Send, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  FileText,
  MessageSquare,
  Zap,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAIKeyStatus } from '@/hooks/useAIKeyManagement';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

interface AIResponse {
  success: boolean;
  intent?: string;
  confidence?: number;
  needs_confirmation?: boolean;
  risk_level?: string;
  parsed_output?: any;
  ai_source?: string;
  error?: string;
  message?: string;
  latency_ms?: number;
  status?: string;
  ai_available?: boolean;
  settings?: any;
  lines_count?: number;
  summary?: any;
}

export default function IATest() {
  const { currentCompany } = useAuth();
  const { data: keyStatus, isLoading: loadingStatus } = useAIKeyStatus();
  
  const [activeTab, setActiveTab] = useState('message');
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [history, setHistory] = useState<Array<{ input: string; response: AIResponse; timestamp: Date }>>([]);

  const handleTestMessage = async () => {
    if (!inputText.trim() || !currentCompany?.id) return;
    
    setIsProcessing(true);
    setResponse(null);
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-intent-parser', {
        body: { 
          company_id: currentCompany.id,
          text: inputText 
        }
      });
      
      const latency = Date.now() - startTime;
      
      if (error) {
        const errorResponse: AIResponse = { 
          success: false, 
          error: error.message,
          latency_ms: latency 
        };
        setResponse(errorResponse);
      } else {
        const successResponse: AIResponse = { ...data, latency_ms: latency };
        setResponse(successResponse);
        setHistory(prev => [{ input: inputText, response: successResponse, timestamp: new Date() }, ...prev.slice(0, 9)]);
      }
    } catch (e) {
      setResponse({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Erro desconhecido',
        latency_ms: Date.now() - startTime
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTestStatement = async () => {
    if (!inputText.trim() || !currentCompany?.id) return;
    
    setIsProcessing(true);
    setResponse(null);
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-statement-parser', {
        body: { 
          company_id: currentCompany.id,
          file_content: inputText 
        }
      });
      
      const latency = Date.now() - startTime;
      
      if (error) {
        setResponse({ success: false, error: error.message, latency_ms: latency });
      } else {
        setResponse({ ...data, latency_ms: latency });
        setHistory(prev => [{ input: inputText.substring(0, 100) + '...', response: { ...data, latency_ms: latency }, timestamp: new Date() }, ...prev.slice(0, 9)]);
      }
    } catch (e) {
      setResponse({ 
        success: false, 
        error: e instanceof Error ? e.message : 'Erro desconhecido',
        latency_ms: Date.now() - startTime
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHealthCheck = async () => {
    if (!currentCompany?.id) return;
    
    setIsProcessing(true);
    setResponse(null);
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-health', {
        body: { company_id: currentCompany.id }
      });
      
      if (error) {
        setResponse({ success: false, error: error.message, latency_ms: Date.now() - startTime });
      } else {
        setResponse({ success: true, ...data, latency_ms: Date.now() - startTime });
      }
    } catch (e) {
      setResponse({ success: false, error: e instanceof Error ? e.message : 'Erro', latency_ms: Date.now() - startTime });
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleMessages = [
    'Paguei NF 1234 R$ 189,90 hoje no Itaú',
    'Recebi R$ 500 do cliente João',
    'Baixar boleto de R$ 1000 do fornecedor XYZ',
    'Lancei despesa de R$ 50 com alimentação',
    'Me manda o fluxo do mês',
    'Desfazer último lançamento',
  ];

  const exampleStatement = `EXTRATO BANCÁRIO - CONTA CORRENTE
Período: 01/01/2024 a 31/01/2024
Saldo Anterior: R$ 5.000,00

02/01 - PIX RECEBIDO CLIENTE ABC - R$ 1.500,00 C
05/01 - TED ENVIADA FORNECEDOR XYZ - R$ 800,00 D
10/01 - BOLETO PAGO ENERGIA - R$ 250,00 D
15/01 - DEP DINHEIRO - R$ 2.000,00 C
20/01 - PIX ENVIADO ALUGUEL - R$ 1.200,00 D

Saldo Final: R$ 6.250,00`;

  if (loadingStatus) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!keyStatus?.ai_available) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <PageHeader title="Testar IA" description="Teste as funcionalidades de IA antes de usar em produção" />
          
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>IA não disponível</AlertTitle>
            <AlertDescription>
              Configure sua chave OpenAI para usar as funcionalidades de IA.
              <Link to="/integracoes/ia" className="underline ml-2">Configurar agora →</Link>
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Testar IA" 
          description="Teste as funcionalidades de IA antes de usar em produção"
        />
        
        {/* Status */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-500" />
            IA Ativa
          </Badge>
          <Badge variant="secondary">
            {keyStatus.configured ? `Chave: ****${keyStatus.key_last4}` : 'Fallback Global'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleHealthCheck} disabled={isProcessing}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Health Check
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input Panel */}
          <Card>
            <CardHeader>
              <CardTitle>Entrada</CardTitle>
              <CardDescription>Teste a interpretação de mensagens ou extratos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="message" className="gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Mensagem
                  </TabsTrigger>
                  <TabsTrigger value="statement" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Extrato
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="message" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mensagem de texto</Label>
                    <Textarea
                      placeholder="Digite uma mensagem como se estivesse no WhatsApp..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Exemplos:</Label>
                    <div className="flex flex-wrap gap-2">
                      {exampleMessages.map((msg, i) => (
                        <Button
                          key={i}
                          variant="outline"
                          size="sm"
                          onClick={() => setInputText(msg)}
                          className="text-xs"
                        >
                          {msg.substring(0, 30)}...
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleTestMessage} 
                    disabled={!inputText.trim() || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Testar Mensagem
                  </Button>
                </TabsContent>
                
                <TabsContent value="statement" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Texto do extrato</Label>
                    <Textarea
                      placeholder="Cole o texto do extrato bancário..."
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      rows={8}
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInputText(exampleStatement)}
                  >
                    Carregar exemplo de extrato
                  </Button>
                  
                  <Button 
                    onClick={handleTestStatement} 
                    disabled={!inputText.trim() || isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Testar Parser de Extrato
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Response Panel */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Resposta
                {response?.latency_ms && (
                  <Badge variant="outline" className="gap-1 font-normal">
                    <Clock className="h-3 w-3" />
                    {response.latency_ms}ms
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>Resultado da análise de IA</CardDescription>
            </CardHeader>
            <CardContent>
              {isProcessing ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                    <p className="text-sm text-muted-foreground">Processando com IA...</p>
                  </div>
                </div>
              ) : response ? (
                <div className="space-y-4">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {response.success ? (
                      <Badge className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        <CheckCircle2 className="h-3 w-3" />
                        Sucesso
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="h-3 w-3" />
                        Erro
                      </Badge>
                    )}
                    {response.ai_source && (
                      <Badge variant="secondary">Fonte: {response.ai_source}</Badge>
                    )}
                  </div>

                  {response.error && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{response.error}</AlertDescription>
                    </Alert>
                  )}

                  {response.intent && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground">Intenção</Label>
                        <p className="font-medium">{response.intent}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Confiança</Label>
                        <p className="font-medium">{Math.round((response.confidence || 0) * 100)}%</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Risco</Label>
                        <Badge variant={response.risk_level === 'high' ? 'destructive' : response.risk_level === 'medium' ? 'secondary' : 'outline'}>
                          {response.risk_level}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Confirmação</Label>
                        <p className="font-medium">{response.needs_confirmation ? 'Sim' : 'Não'}</p>
                      </div>
                    </div>
                  )}

                  {response.parsed_output && (
                    <>
                      <Separator />
                      <div>
                        <Label className="text-xs text-muted-foreground">Output Completo (JSON)</Label>
                        <ScrollArea className="h-48 mt-2">
                          <pre className="text-xs bg-muted p-3 rounded-lg overflow-auto">
                            {JSON.stringify(response.parsed_output, null, 2)}
                          </pre>
                        </ScrollArea>
                      </div>
                    </>
                  )}

                  {/* Health check specific fields */}
                  {response.status === 'healthy' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <p className="font-medium text-green-600">{response.status}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">IA Disponível</Label>
                          <p className="font-medium">{response.ai_available ? 'Sim' : 'Não'}</p>
                        </div>
                      </div>
                      {response.settings && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Configurações</Label>
                          <pre className="text-xs bg-muted p-3 rounded-lg mt-1">
                            {JSON.stringify(response.settings, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Statement parser specific */}
                  {response.lines_count !== undefined && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Linhas extraídas</Label>
                      <p className="font-medium">{response.lines_count} transações</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center space-y-2">
                    <Bot className="h-12 w-12 mx-auto opacity-50" />
                    <p>Execute um teste para ver os resultados</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* History */}
        {history.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Testes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {history.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.input}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.response.intent} • {Math.round((item.response.confidence || 0) * 100)}% • {item.response.latency_ms}ms
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {item.response.success ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {item.timestamp.toLocaleTimeString('pt-BR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
