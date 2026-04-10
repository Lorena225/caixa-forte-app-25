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
import { 
  Settings, 
  Key, 
  MessageSquare, 
  Brain, 
  Shield, 
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Save,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

interface AISettings {
  company_id: string;
  enabled: boolean;
  personality_mode: 'conservative' | 'balanced' | 'aggressive';
  proactive_suggestions: boolean;
  anomaly_detection_enabled: boolean;
  anomaly_z_score_threshold: number;
  auto_categorization_enabled: boolean;
  ocr_enabled: boolean;
  agent_whatsapp_enabled: boolean;
  agent_analyst_enabled: boolean;
  agent_monitor_enabled: boolean;
  autopilot_mode: string;
}

const personalityDescriptions = {
  conservative: {
    label: 'Conservador',
    description: 'Foco em economia, redução de custos e preservação de caixa',
    icon: TrendingDown,
    color: 'text-blue-500',
  },
  balanced: {
    label: 'Equilibrado',
    description: 'Balance entre crescimento e prudência financeira',
    icon: Brain,
    color: 'text-green-500',
  },
  aggressive: {
    label: 'Agressivo',
    description: 'Foco em crescimento, investimentos e ROI',
    icon: TrendingUp,
    color: 'text-orange-500',
  },
};

export default function AISettingsPage() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<Partial<AISettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = useQuery({
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

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    } else if (currentCompany?.id) {
      setLocalSettings({
        enabled: true,
        personality_mode: 'balanced',
        proactive_suggestions: true,
        anomaly_detection_enabled: true,
        anomaly_z_score_threshold: 3.0,
        auto_categorization_enabled: true,
        ocr_enabled: true,
        agent_whatsapp_enabled: false,
        agent_analyst_enabled: true,
        agent_monitor_enabled: true,
        autopilot_mode: 'supervised',
      });
    }
  }, [settings, currentCompany?.id]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: currentCompany?.id,
        ...localSettings,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('ai_company_settings')
        .upsert(payload, { onConflict: 'company_id' });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setHasChanges(false);
      toast.success('Configurações salvas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações');
      console.error(error);
    },
  });

  const updateSetting = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Settings className="h-8 w-8 text-violet-500" />
            Configurações de IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Personalize o comportamento dos agentes de inteligência artificial
          </p>
        </div>
        <Button 
          onClick={() => saveMutation.mutate()} 
          disabled={!hasChanges || saveMutation.isPending}
        >
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
        </Button>
      </div>

      <Tabs defaultValue="personality" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personality">Personalidade</TabsTrigger>
          <TabsTrigger value="agents">Agentes</TabsTrigger>
          <TabsTrigger value="detection">Detecção</TabsTrigger>
          <TabsTrigger value="api">API & Integrações</TabsTrigger>
        </TabsList>

        {/* Personality Tab */}
        <TabsContent value="personality" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Modo de Personalidade do CFO
              </CardTitle>
              <CardDescription>
                Defina como o CFO Virtual deve analisar e sugerir decisões financeiras
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.keys(personalityDescriptions) as Array<keyof typeof personalityDescriptions>).map((mode) => {
                  const config = personalityDescriptions[mode];
                  const Icon = config.icon;
                  const isSelected = localSettings.personality_mode === mode;
                  
                  return (
                    <Card 
                      key={mode}
                      className={`cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary border-primary' : 'hover:border-muted-foreground/50'}`}
                      onClick={() => updateSetting('personality_mode', mode)}
                    >
                      <CardContent className="p-6 text-center">
                        <Icon className={`h-12 w-12 mx-auto mb-4 ${config.color}`} />
                        <h3 className="font-semibold text-lg mb-2">{config.label}</h3>
                        <p className="text-sm text-muted-foreground">{config.description}</p>
                        {isSelected && (
                          <Badge className="mt-4" variant="default">Selecionado</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Sugestões Proativas</Label>
                    <p className="text-sm text-muted-foreground">
                      A IA oferece insights espontâneos sobre suas finanças
                    </p>
                  </div>
                  <Switch 
                    checked={localSettings.proactive_suggestions ?? true}
                    onCheckedChange={(v) => updateSetting('proactive_suggestions', v)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Modo Autopiloto</Label>
                    <p className="text-sm text-muted-foreground">
                      Nível de autonomia para ações automáticas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={localSettings.autopilot_mode === 'full' ? 'default' : 'outline'}>
                      {localSettings.autopilot_mode === 'full' ? 'Automático' : 
                       localSettings.autopilot_mode === 'supervised' ? 'Supervisionado' : 'Manual'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Agentes Ativos
              </CardTitle>
              <CardDescription>
                Habilite ou desabilite agentes específicos de IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <Brain className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <Label className="text-base">CFO Virtual (Analista)</Label>
                    <p className="text-sm text-muted-foreground">
                      Responde perguntas e gera relatórios via chat
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={localSettings.agent_analyst_enabled ?? true}
                  onCheckedChange={(v) => updateSetting('agent_analyst_enabled', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-blue-100">
                    <AlertTriangle className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <Label className="text-base">Monitor de Anomalias</Label>
                    <p className="text-sm text-muted-foreground">
                      Detecta padrões atípicos e fraudes automaticamente
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={localSettings.agent_monitor_enabled ?? true}
                  onCheckedChange={(v) => updateSetting('agent_monitor_enabled', v)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-green-100">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <Label className="text-base">Agente WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      Recebe e processa lançamentos via WhatsApp com OCR
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={localSettings.agent_whatsapp_enabled ?? false}
                  onCheckedChange={(v) => updateSetting('agent_whatsapp_enabled', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detection Tab */}
        <TabsContent value="detection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Detecção de Anomalias
              </CardTitle>
              <CardDescription>
                Configure a sensibilidade do sistema de detecção
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Detecção Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Analisa transações em tempo real usando Z-Score
                  </p>
                </div>
                <Switch 
                  checked={localSettings.anomaly_detection_enabled ?? true}
                  onCheckedChange={(v) => updateSetting('anomaly_detection_enabled', v)}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Sensibilidade (Z-Score Threshold)</Label>
                  <Badge variant="outline">
                    {localSettings.anomaly_z_score_threshold?.toFixed(1) ?? '3.0'}
                  </Badge>
                </div>
                <Slider
                  value={[localSettings.anomaly_z_score_threshold ?? 3.0]}
                  onValueChange={([v]) => updateSetting('anomaly_z_score_threshold', v)}
                  min={1.5}
                  max={5.0}
                  step={0.1}
                  disabled={!localSettings.anomaly_detection_enabled}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Mais sensível (1.5)</span>
                  <span>Padrão (3.0)</span>
                  <span>Menos sensível (5.0)</span>
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Categorização Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Sugere categorias para novas transações
                  </p>
                </div>
                <Switch 
                  checked={localSettings.auto_categorization_enabled ?? true}
                  onCheckedChange={(v) => updateSetting('auto_categorization_enabled', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">OCR de Notas Fiscais</Label>
                  <p className="text-sm text-muted-foreground">
                    Extrai dados de imagens de recibos e notas
                  </p>
                </div>
                <Switch 
                  checked={localSettings.ocr_enabled ?? true}
                  onCheckedChange={(v) => updateSetting('ocr_enabled', v)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Chaves de API
              </CardTitle>
              <CardDescription>
                Configure as integrações externas de IA e WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 text-green-700 mb-2">
                  <Sparkles className="h-5 w-5" />
                  <span className="font-medium">Lovable AI Gateway</span>
                  <Badge variant="default" className="bg-green-600">Conectado</Badge>
                </div>
                <p className="text-sm text-green-600">
                  Sua conta está conectada ao gateway de IA do Lovable. Modelos disponíveis: Gemini, GPT-5.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>WhatsApp Business API (Opcional)</Label>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Token de Acesso</Label>
                    <Input 
                      type="password" 
                      placeholder="EAAG..." 
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Configure via Configurações &gt; Integrações &gt; WhatsApp
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Número do WhatsApp</Label>
                    <Input 
                      placeholder="+55 11 99999-9999" 
                      disabled
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
