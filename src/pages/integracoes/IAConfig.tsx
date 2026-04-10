import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  Key, 
  Shield, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  Settings,
  Zap
} from 'lucide-react';
import {
  useAIKeyStatus,
  useTestAIKey,
  useSetAIKey,
  useRotateAIKey,
  useRevokeAIKey,
  useAICompanySettings,
  useUpdateAISettings
} from '@/hooks/useAIKeyManagement';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function IAConfig() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  
  const { data: keyStatus, isLoading: loadingStatus } = useAIKeyStatus();
  const { data: settings, isLoading: loadingSettings } = useAICompanySettings();
  const { testKey, isLoading: testingKey } = useTestAIKey();
  const setKeyMutation = useSetAIKey();
  const rotateKeyMutation = useRotateAIKey();
  const revokeKeyMutation = useRevokeAIKey();
  const updateSettingsMutation = useUpdateAISettings();
  
  const handleTestKey = async () => {
    if (!apiKey) return;
    const result = await testKey(apiKey);
    if (result.valid) {
      // Toast is shown by the hook
    }
  };
  
  const handleSaveKey = () => {
    if (!apiKey) return;
    if (isRotating) {
      rotateKeyMutation.mutate(apiKey, {
        onSuccess: () => {
          setApiKey('');
          setIsRotating(false);
        }
      });
    } else {
      setKeyMutation.mutate(apiKey, {
        onSuccess: () => {
          setApiKey('');
        }
      });
    }
  };
  
  const handleRevoke = () => {
    revokeKeyMutation.mutate();
  };
  
  const handleSettingChange = (key: string, value: any) => {
    updateSettingsMutation.mutate({ [key]: value });
  };
  
  const isLoading = loadingStatus || loadingSettings;
  const isSaving = setKeyMutation.isPending || rotateKeyMutation.isPending;
  
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="IA (ChatGPT)" 
          description="Configure a integração com OpenAI para automação inteligente"
        />
        
        {/* Status Banner */}
        {!isLoading && (
          <Alert variant={keyStatus?.ai_available ? "default" : "destructive"}>
            {keyStatus?.ai_available ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {keyStatus?.ai_available ? 'IA Disponível' : 'IA Desativada'}
            </AlertTitle>
            <AlertDescription>
              {keyStatus?.configured 
                ? `Usando chave da empresa (****${keyStatus.key_last4})`
                : keyStatus?.using_global_fallback 
                  ? 'Usando chave global do sistema'
                  : 'Configure uma chave OpenAI para ativar a IA'
              }
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-2">
          {/* API Key Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Chave OpenAI
              </CardTitle>
              <CardDescription>
                Configure sua própria chave de API da OpenAI (BYOK)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {keyStatus?.configured && !isRotating ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Chave configurada</p>
                      <p className="text-xs text-muted-foreground">
                        ****{keyStatus.key_last4} • Atualizada em {new Date(keyStatus.updated_at!).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Badge variant="default">Ativa</Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => setIsRotating(true)}
                      className="flex-1"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Rotacionar
                    </Button>
                    
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="flex-1">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Desativar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Desativar IA?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Isso irá revogar sua chave OpenAI e desativar todas as funcionalidades de IA. 
                            Você precisará configurar uma nova chave para reativar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={handleRevoke}
                            className="bg-destructive text-destructive-foreground"
                          >
                            Desativar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isRotating && (
                    <Alert>
                      <RefreshCw className="h-4 w-4" />
                      <AlertDescription>
                        Insira a nova chave para rotacionar. A chave anterior será desativada.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Chave de API</Label>
                    <div className="relative">
                      <Input
                        id="api-key"
                        type={showKey ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowKey(!showKey)}
                      >
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Obtenha sua chave em <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a>
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleTestKey}
                      disabled={!apiKey || testingKey}
                      className="flex-1"
                    >
                      {testingKey ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Testar
                    </Button>
                    
                    <Button 
                      onClick={handleSaveKey}
                      disabled={!apiKey || isSaving}
                      className="flex-1"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      {isRotating ? 'Rotacionar' : 'Salvar'}
                    </Button>
                  </div>
                  
                  {isRotating && (
                    <Button 
                      variant="ghost" 
                      onClick={() => { setIsRotating(false); setApiKey(''); }}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Agent Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Configurações do Agente
              </CardTitle>
              <CardDescription>
                Defina o comportamento e permissões da IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>IA Habilitada</Label>
                  <p className="text-xs text-muted-foreground">Ativar/desativar processamento por IA</p>
                </div>
                <Switch
                  checked={settings?.enabled ?? false}
                  onCheckedChange={(checked) => handleSettingChange('enabled', checked)}
                  disabled={!keyStatus?.ai_available}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label>Modo de Operação</Label>
                <Select
                  value={settings?.autopilot_mode ?? 'safe'}
                  onValueChange={(value) => handleSettingChange('autopilot_mode', value)}
                  disabled={!settings?.enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="safe">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-green-500" />
                        Safe - Sempre pede confirmação
                      </div>
                    </SelectItem>
                    <SelectItem value="balanced">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-yellow-500" />
                        Balanced - Auto para baixo risco
                      </div>
                    </SelectItem>
                    <SelectItem value="autopilot">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-red-500" />
                        Autopilot - Máxima automação
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Limite de Alto Risco (R$)</Label>
                <Input
                  type="number"
                  value={settings?.high_risk_amount_limit ?? 10000}
                  onChange={(e) => handleSettingChange('high_risk_amount_limit', parseFloat(e.target.value))}
                  disabled={!settings?.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Transações acima deste valor exigem confirmação extra
                </p>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label className="text-sm font-medium">Permissões</Label>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">Auto-baixar transações</span>
                    <p className="text-xs text-muted-foreground">Baixar automaticamente quando conciliar</p>
                  </div>
                  <Switch
                    checked={settings?.allow_auto_settle ?? false}
                    onCheckedChange={(checked) => handleSettingChange('allow_auto_settle', checked)}
                    disabled={!settings?.enabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">Criar e baixar transações</span>
                    <p className="text-xs text-muted-foreground">Criar novas transações e baixar</p>
                  </div>
                  <Switch
                    checked={settings?.allow_auto_create_and_settle ?? false}
                    onCheckedChange={(checked) => handleSettingChange('allow_auto_create_and_settle', checked)}
                    disabled={!settings?.enabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">Criar contrapartes</span>
                    <p className="text-xs text-muted-foreground">Criar clientes/fornecedores automaticamente</p>
                  </div>
                  <Switch
                    checked={settings?.allow_auto_create_counterparty ?? false}
                    onCheckedChange={(checked) => handleSettingChange('allow_auto_create_counterparty', checked)}
                    disabled={!settings?.enabled}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-sm">PIN para alto risco</span>
                    <p className="text-xs text-muted-foreground">Exigir PIN para operações de alto valor</p>
                  </div>
                  <Switch
                    checked={settings?.require_pin_for_high_risk ?? true}
                    onCheckedChange={(checked) => handleSettingChange('require_pin_for_high_risk', checked)}
                    disabled={!settings?.enabled}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
