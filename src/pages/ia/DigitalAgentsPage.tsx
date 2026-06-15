import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  MessageSquare, 
  Smartphone,
  QrCode,
  Wifi,
  WifiOff,
  Phone,
  Bot,
  Brain,
  Mic,
  Image as ImageIcon,
  Settings,
  Clock,
  Calendar,
  Sun,
  Bell,
  Check,
  X,
  RefreshCw,
  Shield,
  Sparkles,
  Volume2,
  Eye,
  Wallet,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface WhatsAppConnection {
  id: string;
  phone_number: string;
  status: string;
  provider: string;
}

interface AISettings {
  agent_tone: 'formal' | 'balanced' | 'casual';
  voice_enabled: boolean;
  morning_briefing_enabled: boolean;
  agent_whatsapp_enabled: boolean;
  agent_analyst_enabled: boolean;
  agent_monitor_enabled: boolean;
  personality_mode: string;
}

const toneDescriptions = {
  formal: {
    label: 'Formal e Técnico',
    description: 'Comunicação precisa, profissional e detalhada',
    icon: Shield,
    gradient: 'from-slate-500 to-slate-600',
  },
  balanced: {
    label: 'Equilibrado',
    description: 'Balance entre profissionalismo e acessibilidade',
    icon: Brain,
    gradient: 'from-blue-500 to-blue-600',
  },
  casual: {
    label: 'Casual e Proativo',
    description: 'Comunicação amigável, direta e com iniciativa',
    icon: Sparkles,
    gradient: 'from-violet-500 to-violet-600',
  },
};

export default function DigitalAgentsPage() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [toneValue, setToneValue] = useState<number[]>([50]);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch WhatsApp connections
  const { data: connections, isLoading: connectionsLoading } = useQuery({
    queryKey: ['whatsapp-connections', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('whatsapp_connections')
        .select('id, phone_number, status, provider')
        .eq('company_id', currentCompany.id);
      if (error) throw error;
      return data as WhatsAppConnection[];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch AI settings
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['ai-settings', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_company_settings')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as AISettings | null;
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch briefing settings
  const { data: briefingSettings } = useQuery({
    queryKey: ['morning-briefing', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_morning_briefings')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  // Initialize tone slider from settings
  useEffect(() => {
    if (settings?.agent_tone) {
      const toneMap = { formal: 0, balanced: 50, casual: 100 };
      setToneValue([toneMap[settings.agent_tone as keyof typeof toneMap] || 50]);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const toneMap: Record<number, string> = { 0: 'formal', 50: 'balanced', 100: 'casual' };
      const nearestTone = toneValue[0] <= 25 ? 'formal' : toneValue[0] <= 75 ? 'balanced' : 'casual';

      const { error } = await supabase
        .from('ai_company_settings')
        .upsert({
          company_id: currentCompany?.id,
          agent_tone: nearestTone,
          voice_enabled: settings?.voice_enabled ?? false,
          morning_briefing_enabled: settings?.morning_briefing_enabled ?? true,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'company_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setHasChanges(false);
      toast.success('Configurações salvas!');
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  // Create WhatsApp connection mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      if (!apiEndpoint || !apiToken) {
        throw new Error('Endpoint e Token são obrigatórios');
      }
      
      const { error } = await supabase
        .from('whatsapp_connections')
        .insert({
          company_id: currentCompany?.id,
          phone_number: 'Aguardando conexão...',
          provider: 'whatsapp_cloud',
          credentials_encrypted: JSON.stringify({ endpoint: apiEndpoint, token: apiToken }),
          status: 'pending',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-connections'] });
      setApiEndpoint('');
      setApiToken('');
      toast.success('Conexão iniciada! Escaneie o QR Code.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Erro ao conectar');
    },
  });

  const activeConnection = connections?.find(c => c.status === 'connected' || c.status === 'active');
  const pendingConnection = connections?.find(c => c.status === 'pending');

  const getToneLabel = () => {
    if (toneValue[0] <= 25) return 'formal';
    if (toneValue[0] <= 75) return 'balanced';
    return 'casual';
  };

  const currentTone = toneDescriptions[getToneLabel() as keyof typeof toneDescriptions];
  const ToneIcon = currentTone.icon;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="h-8 w-8 text-violet-500" />
            Meus Agentes Digitais
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure seus assistentes de IA para WhatsApp, Voz e automações
          </p>
        </div>
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={!hasChanges || saveMutation.isPending}
        >
          <Check className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      {/* Connection Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className={cn(
          "border-l-4",
          activeConnection ? "border-l-green-500" : "border-l-red-500"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  activeConnection ? "bg-green-100" : "bg-red-100"
                )}>
                  {activeConnection ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">WhatsApp</p>
                  <p className="text-sm text-muted-foreground">
                    {activeConnection ? activeConnection.phone_number : 'Desconectado'}
                  </p>
                </div>
              </div>
              <Badge variant={activeConnection ? "default" : "destructive"}>
                {activeConnection ? 'Conectado' : 'Offline'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-blue-100">
                  <Mic className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Processamento de Voz</p>
                  <p className="text-sm text-muted-foreground">Whisper AI</p>
                </div>
              </div>
              <Badge variant={settings?.voice_enabled ? "default" : "secondary"}>
                {settings?.voice_enabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-amber-100">
                  <ImageIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">OCR / Vision</p>
                  <p className="text-sm text-muted-foreground">Notas e Recibos</p>
                </div>
              </div>
              <Badge variant="default">Ativo</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="whatsapp" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="voice" className="flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Voz & OCR
          </TabsTrigger>
          <TabsTrigger value="personality" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Personalidade
          </TabsTrigger>
          <TabsTrigger value="briefing" className="flex items-center gap-2">
            <Sun className="h-4 w-4" />
            Morning Briefing
          </TabsTrigger>
        </TabsList>

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QR Code Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Conexão WhatsApp
                </CardTitle>
                <CardDescription>
                  Escaneie o QR Code com seu WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* QR Code Placeholder */}
                <div className="aspect-square max-w-[300px] mx-auto rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center bg-muted/20 relative overflow-hidden">
                  {pendingConnection ? (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10" />
                      <div className="relative z-10 text-center p-6">
                        <RefreshCw className="h-12 w-12 mx-auto mb-4 text-green-500 animate-spin" />
                        <p className="font-medium text-green-700">Aguardando leitura...</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Abra o WhatsApp e escaneie o código
                        </p>
                      </div>
                      {/* Simulated QR Code Pattern */}
                      <div className="absolute inset-4 opacity-10">
                        <div className="grid grid-cols-8 gap-1 h-full">
                          {Array.from({ length: 64 }).map((_, i) => (
                            <div 
                              key={i} 
                              className={cn(
                                "rounded-sm",
                                (i * 7 + 3) % 5 < 2 ? "bg-foreground" : "bg-transparent"
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  ) : activeConnection ? (
                    <div className="text-center p-6">
                      <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                        <Check className="h-10 w-10 text-green-600" />
                      </div>
                      <p className="font-medium text-green-700">Conectado!</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {activeConnection.phone_number}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center p-6">
                      <Smartphone className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="font-medium">Configure a conexão</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Insira as credenciais ao lado
                      </p>
                    </div>
                  )}
                </div>

                {/* Connection Status */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      activeConnection ? "bg-green-500 animate-pulse" : "bg-red-500"
                    )} />
                    <span className="text-sm font-medium">
                      Status: {activeConnection ? 'Online' : pendingConnection ? 'Conectando...' : 'Offline'}
                    </span>
                  </div>
                  {activeConnection && (
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reconectar
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuração da Instância
                </CardTitle>
                <CardDescription>
                  Conecte sua API do WhatsApp Business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Endpoint da API</Label>
                    <Input 
                      placeholder="https://api.whatsapp.com/v1/..."
                      value={apiEndpoint}
                      onChange={(e) => setApiEndpoint(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      URL do seu servidor WhatsApp Cloud ou Twilio
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Token de Acesso</Label>
                    <Input 
                      type="password"
                      placeholder="EAAG..."
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Token de autenticação da API
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={() => connectMutation.mutate()}
                    disabled={!apiEndpoint || !apiToken || connectMutation.isPending}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    {connectMutation.isPending ? 'Conectando...' : 'Iniciar Conexão'}
                  </Button>
                </div>

                <Separator />

                {/* Recent Connections */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Conexões Recentes</Label>
                  {connectionsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : connections?.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhuma conexão configurada
                    </p>
                  ) : (
                    <ScrollArea className="h-[200px]">
                      <div className="space-y-2">
                        {connections?.map((conn) => (
                          <div 
                            key={conn.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card"
                          >
                            <div className="flex items-center gap-3">
                              <Phone className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium">{conn.phone_number}</p>
                                <p className="text-xs text-muted-foreground">{conn.provider}</p>
                              </div>
                            </div>
                            <Badge 
                              variant={
                                conn.status === 'connected' ? 'default' : 
                                conn.status === 'pending' ? 'secondary' : 'destructive'
                              }
                            >
                              {conn.status === 'connected' ? 'Ativo' : 
                               conn.status === 'pending' ? 'Pendente' : 'Inativo'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Voice & OCR Tab */}
        <TabsContent value="voice" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mic className="h-5 w-5 text-blue-500" />
                  Processamento de Áudio
                </CardTitle>
                <CardDescription>
                  Transcrição automática de mensagens de voz
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-blue-100">
                      <Volume2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <Label className="text-base">Whisper AI</Label>
                      <p className="text-sm text-muted-foreground">
                        Transcrição de áudio em tempo real
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={settings?.voice_enabled ?? false}
                    onCheckedChange={(v) => {
                      // Update local state
                      setHasChanges(true);
                    }}
                  />
                </div>

                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Como funciona:</h4>
                  <ol className="text-sm text-blue-700 space-y-2">
                    <li>1. Usuário envia áudio: "Paguei 100 reais no almoço"</li>
                    <li>2. Whisper transcreve para texto</li>
                    <li>3. IA extrai: R$ 100,00 → Alimentação</li>
                    <li>4. Agente pergunta: "Confirmo o lançamento?"</li>
                  </ol>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Formatos suportados:</strong> .ogg, .mp3, .wav, .m4a
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-amber-500" />
                  OCR / Computer Vision
                </CardTitle>
                <CardDescription>
                  Leitura inteligente de documentos fiscais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-full bg-amber-100">
                      <ImageIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <Label className="text-base">Vision AI</Label>
                      <p className="text-sm text-muted-foreground">
                        Extração de dados de imagens
                      </p>
                    </div>
                  </div>
                  <Badge variant="default">Sempre Ativo</Badge>
                </div>

                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Dados extraídos:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-amber-700">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Data da Nota
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Valor Total
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> CNPJ do Fornecedor
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4" /> Itens/Descrição
                    </div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <strong>Tipos suportados:</strong> Notas Fiscais, Cupons, Recibos, Boletos
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Personality Tab */}
        <TabsContent value="personality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Tom do Agente
              </CardTitle>
              <CardDescription>
                Defina como seus agentes devem se comunicar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Tone Slider */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-full bg-gradient-to-br",
                      currentTone.gradient,
                      "text-white"
                    )}>
                      <ToneIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{currentTone.label}</p>
                      <p className="text-sm text-muted-foreground">{currentTone.description}</p>
                    </div>
                  </div>
                </div>

                <Slider
                  value={toneValue}
                  onValueChange={(v) => {
                    setToneValue(v);
                    setHasChanges(true);
                  }}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    Formal
                  </span>
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    Equilibrado
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Casual
                  </span>
                </div>
              </div>

              <Separator />

              {/* Example Messages */}
              <div className="space-y-4">
                <Label>Exemplo de resposta:</Label>
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className="text-sm italic">
                    {getToneLabel() === 'formal' && (
                      '"Prezado(a), identifiquei uma despesa de R$ 150,00 referente a combustível (Posto Shell). Solicito sua confirmação para efetuar o lançamento no sistema contábil."'
                    )}
                    {getToneLabel() === 'balanced' && (
                      '"Encontrei uma despesa de R$ 150,00 de combustível no Posto Shell. Posso lançar como Veículos para você?"'
                    )}
                    {getToneLabel() === 'casual' && (
                      '"Opa! Vi que você gastou R$ 150 de gasolina no Shell. Já lanço em Combustível? 🚗"'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Morning Briefing Tab */}
        <TabsContent value="briefing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="h-5 w-5 text-amber-500" />
                Resumo Diário (Morning Briefing)
              </CardTitle>
              <CardDescription>
                Receba um relatório automático todo dia às 08:00
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-amber-100">
                    <Bell className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <Label className="text-base">Resumo Diário Ativo</Label>
                    <p className="text-sm text-muted-foreground">
                      Enviado às 08:00 (Horário de Brasília)
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={briefingSettings?.enabled ?? true}
                  onCheckedChange={() => setHasChanges(true)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="font-medium">O que inclui:</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { icon: Wallet, label: 'Saldo Atual', desc: 'Posição consolidada de caixa', checked: true },
                    { icon: Calendar, label: 'Contas a Pagar Hoje', desc: 'Com links para quitação', checked: true },
                    { icon: AlertTriangle, label: 'Alertas de Anomalias', desc: 'Transações atípicas detectadas', checked: true },
                    { icon: TrendingUp, label: 'Previsão de Caixa', desc: 'Projeção para os próximos 7 dias', checked: false },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                      <item.icon className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{item.label}</p>
                          <Switch checked={item.checked} />
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label className="font-medium">Canais de Entrega:</Label>
                <div className="flex flex-wrap gap-3">
                  <Badge variant="default" className="px-4 py-2">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Dashboard
                  </Badge>
                  <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    WhatsApp
                  </Badge>
                  <Badge variant="outline" className="px-4 py-2 cursor-pointer hover:bg-accent">
                    <Bell className="h-4 w-4 mr-2" />
                    E-mail
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
