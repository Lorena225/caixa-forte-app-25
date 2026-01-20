import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Settings, 
  Bot, 
  MessageSquare, 
  BellRing, 
  Brain,
  Shield,
  Zap,
  Save,
  RefreshCw,
  Key
} from "lucide-react";
import { useAISettingsExtended, useUpdateAISettingsExtended } from "@/hooks/useAIModule";
import { useAIKeyStatus, useTestAIKey, useSetAIKey } from "@/hooks/useAIKeyManagement";
import { toast } from "sonner";

export default function IAConfiguracoes() {
  const { data: settings, isLoading } = useAISettingsExtended();
  const { data: keyStatus } = useAIKeyStatus();
  const updateSettings = useUpdateAISettingsExtended();
  const testKey = useTestAIKey();
  const setKey = useSetAIKey();

  const [apiKey, setApiKey] = useState("");
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveSettings = async (updates: Partial<typeof settings>) => {
    try {
      await updateSettings.mutateAsync(updates as any);
      toast.success("Configurações salvas");
    } catch (error) {
      toast.error("Erro ao salvar configurações");
    }
  };

  const handleTestKey = async () => {
    if (!apiKey) {
      toast.error("Informe a chave API");
      return;
    }
    setIsTesting(true);
    try {
      const result = await testKey.testKey(apiKey);
      if (result.valid) {
        toast.success("Chave válida!");
      } else {
        toast.error(result.error || "Chave inválida");
      }
    } catch (error) {
      toast.error("Erro ao testar chave");
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKey) {
      toast.error("Informe a chave API");
      return;
    }
    try {
      await setKey.mutateAsync(apiKey);
      toast.success("Chave salva com sucesso");
      setApiKey("");
    } catch (error) {
      toast.error("Erro ao salvar chave");
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Configurações de IA"
          description="Configure as preferências e credenciais do módulo de inteligência artificial"
        />

        {/* Status Geral - Card consistente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
            <CardDescription>Ative ou desative todo o módulo de IA e defina o modo de operação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Módulo de IA Ativo</Label>
                <p className="text-sm text-muted-foreground">
                  Habilita todos os agentes de IA da plataforma
                </p>
              </div>
              <Switch
                checked={settings?.enabled ?? false}
                onCheckedChange={(enabled) => handleSaveSettings({ enabled })}
              />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Modo de Operação</Label>
                <Select
                  value={settings?.autopilot_mode || "safe"}
                  onValueChange={(value) => handleSaveSettings({ autopilot_mode: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Assistido - Requer aprovação
                      </div>
                    </SelectItem>
                    <SelectItem value="balanced">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        Balanceado - Só alto risco
                      </div>
                    </SelectItem>
                    <SelectItem value="autopilot">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        Automático - Sem aprovação
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Modelo de IA Padrão</Label>
                <Select
                  value={settings?.default_ai_model || "google/gemini-3-flash-preview"}
                  onValueChange={(value) => handleSaveSettings({ default_ai_model: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="google/gemini-3-flash-preview">Gemini 3 Flash (Recomendado)</SelectItem>
                    <SelectItem value="google/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                    <SelectItem value="google/gemini-2.5-pro">Gemini 2.5 Pro</SelectItem>
                    <SelectItem value="openai/gpt-5-mini">GPT-5 Mini</SelectItem>
                    <SelectItem value="openai/gpt-5">GPT-5</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chave OpenAI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Chave OpenAI (Opcional)
            </CardTitle>
            <CardDescription>
              Use sua própria chave OpenAI para maior controle. Se não configurada, usamos a IA integrada do Lovable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={keyStatus?.configured ? "default" : "secondary"}>
                {keyStatus?.configured ? "Chave Configurada" : "Usando IA Lovable"}
              </Badge>
              {keyStatus?.key_last4 && (
                <span className="text-sm text-muted-foreground font-mono">****{keyStatus.key_last4}</span>
              )}
            </div>

            <div className="flex gap-2">
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="flex-1"
              />
              <Button variant="outline" onClick={handleTestKey} disabled={isTesting || !apiKey}>
                {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Testar"}
              </Button>
              <Button onClick={handleSaveKey} disabled={setKey.isPending || !apiKey}>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Configuração dos Agentes */}
        <Card>
          <CardHeader>
            <CardTitle>Configuração dos Agentes</CardTitle>
            <CardDescription>Ative ou desative cada agente individualmente</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Agente WhatsApp */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <MessageSquare className="h-5 w-5 text-success" />
                </div>
                <div>
                  <Label className="text-base">Agente WhatsApp</Label>
                  <p className="text-sm text-muted-foreground">
                    Processa mensagens e executa baixas/lançamentos
                  </p>
                </div>
              </div>
              <Switch
                checked={settings?.agent_whatsapp_enabled ?? true}
                onCheckedChange={(checked) => handleSaveSettings({ agent_whatsapp_enabled: checked })}
              />
            </div>

            <Separator />

            {/* Agente Monitor */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                  <BellRing className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <Label className="text-base">Monitor Financeiro</Label>
                  <p className="text-sm text-muted-foreground">
                    Gera alertas e insights sobre sua conta
                  </p>
                </div>
              </div>
              <Switch
                checked={settings?.agent_monitor_enabled ?? true}
                onCheckedChange={(checked) => handleSaveSettings({ agent_monitor_enabled: checked })}
              />
            </div>

            <Separator />

            {/* Agente Analista */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <Label className="text-base">Analista Inteligente</Label>
                  <p className="text-sm text-muted-foreground">
                    Chat para perguntas e relatórios
                  </p>
                </div>
              </div>
              <Switch
                checked={settings?.agent_analyst_enabled ?? true}
                onCheckedChange={(checked) => handleSaveSettings({ agent_analyst_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Segurança e Limites
            </CardTitle>
            <CardDescription>Configure limites de valor e permissões de automação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Limite de Valor Alto Risco (R$)</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  defaultValue={settings?.high_risk_amount_limit || ""}
                  onChange={(e) => handleSaveSettings({ high_risk_amount_limit: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Valores acima deste limite requerem aprovação extra
                </p>
              </div>

              <div className="space-y-2">
                <Label>Tolerância de Risco</Label>
                <Select
                  value={settings?.risk_tolerance || "medium"}
                  onValueChange={(value) => handleSaveSettings({ risk_tolerance: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa - Mais conservador</SelectItem>
                    <SelectItem value="medium">Média - Balanceado</SelectItem>
                    <SelectItem value="high">Alta - Mais automático</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir PIN para Alto Risco</Label>
                  <p className="text-sm text-muted-foreground">
                    Solicita PIN de segurança para operações de alto valor
                  </p>
                </div>
                <Switch
                  checked={settings?.require_pin_for_high_risk ?? false}
                  onCheckedChange={(checked) => handleSaveSettings({ require_pin_for_high_risk: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Permitir Baixa Automática</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que a IA execute baixas sem aprovação manual
                  </p>
                </div>
                <Switch
                  checked={settings?.allow_auto_settle ?? false}
                  onCheckedChange={(checked) => handleSaveSettings({ allow_auto_settle: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Criar Contrapartes Automaticamente</Label>
                  <p className="text-sm text-muted-foreground">
                    Cria clientes/fornecedores não encontrados automaticamente
                  </p>
                </div>
                <Switch
                  checked={settings?.allow_auto_create_counterparty ?? false}
                  onCheckedChange={(checked) => handleSaveSettings({ allow_auto_create_counterparty: checked })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Configurações do Monitor */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="h-5 w-5" />
              Configurações do Monitor
            </CardTitle>
            <CardDescription>Configure a frequência de alertas e resumos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Intervalo entre Alertas (minutos)</Label>
                <Input
                  type="number"
                  placeholder="60"
                  defaultValue={settings?.monitor_alert_cooldown_minutes || 60}
                  onChange={(e) => handleSaveSettings({ monitor_alert_cooldown_minutes: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Evita alertas repetidos em curto espaço de tempo
                </p>
              </div>

              <div className="space-y-2">
                <Label>Horário do Resumo Diário</Label>
                <Input
                  type="time"
                  defaultValue={settings?.monitor_digest_time || "08:00"}
                  onChange={(e) => handleSaveSettings({ monitor_digest_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Enviar Resumo Diário</Label>
                <p className="text-sm text-muted-foreground">
                  Receba um digest com os principais alertas do dia
                </p>
              </div>
              <Switch
                checked={settings?.monitor_digest_enabled ?? true}
                onCheckedChange={(checked) => handleSaveSettings({ monitor_digest_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
