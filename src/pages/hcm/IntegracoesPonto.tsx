import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { 
  Plus, Clock, RefreshCw, CheckCircle2, XCircle, 
  Settings, Link2, Unlink, Play, AlertTriangle
} from 'lucide-react';
import { useHCM } from '@/hooks/useHCM';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const providers = [
  { id: 'pontomais', name: 'Pontomais', logo: '🕐', description: 'Integração com Pontomais REP-P' },
  { id: 'tangerino', name: 'Tangerino', logo: '🍊', description: 'API Tangerino Cloud' },
  { id: 'dimep', name: 'Dimep', logo: '⏰', description: 'Dimep REP-C e REP-A' },
  { id: 'ahgora', name: 'Ahgora', logo: '📊', description: 'Ahgora Multi-Ponto' },
  { id: 'secullum', name: 'Secullum', logo: '🔒', description: 'Secullum Acesso' },
  { id: 'oitchau', name: 'Oitchau', logo: '✨', description: 'Controle de ponto digital' },
  { id: 'custom', name: 'API Customizada', logo: '🔧', description: 'Webhook personalizado' },
];

export default function IntegracoesPonto() {
  const { integrations, integrationsLoading, createIntegration } = useHCM();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    provider: '',
    provider_name: '',
    api_url: '',
    company_code: '',
    sync_frequency: 'daily',
  });

  const handleSelectProvider = (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setFormData({
        ...formData,
        provider: providerId,
        provider_name: provider.name,
      });
      setSelectedProvider(providerId);
    }
  };

  const handleSubmit = async () => {
    if (!formData.provider || !formData.provider_name) {
      toast.error('Selecione um provedor');
      return;
    }

    await createIntegration.mutateAsync({
      ...formData,
      sync_enabled: true,
      is_active: true,
    });
    setDialogOpen(false);
    setFormData({
      provider: '',
      provider_name: '',
      api_url: '',
      company_code: '',
      sync_frequency: 'daily',
    });
    setSelectedProvider('');
  };

  const handleSync = async (integrationId: string) => {
    setSyncingId(integrationId);
    // Simula sincronização
    await new Promise(resolve => setTimeout(resolve, 2000));
    toast.success('Sincronização iniciada! Os dados serão importados em breve.');
    setSyncingId(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Hub de Integrações de Ponto</h1>
            <p className="text-muted-foreground">
              Gateway API para sistemas externos de ponto eletrônico
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Configurar Nova Integração</DialogTitle>
              </DialogHeader>

              {!selectedProvider ? (
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {providers.map((provider) => (
                    <Card
                      key={provider.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleSelectProvider(provider.id)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="text-3xl">{provider.logo}</div>
                        <div>
                          <p className="font-semibold">{provider.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {provider.description}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                    <div className="text-3xl">
                      {providers.find(p => p.id === selectedProvider)?.logo}
                    </div>
                    <div>
                      <p className="font-semibold">{formData.provider_name}</p>
                      <button
                        onClick={() => setSelectedProvider('')}
                        className="text-sm text-primary hover:underline"
                      >
                        Alterar provedor
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label>URL da API</Label>
                      <Input
                        value={formData.api_url}
                        onChange={e => setFormData({...formData, api_url: e.target.value})}
                        placeholder="https://api.provedor.com/v1"
                      />
                    </div>

                    <div>
                      <Label>Código da Empresa</Label>
                      <Input
                        value={formData.company_code}
                        onChange={e => setFormData({...formData, company_code: e.target.value})}
                        placeholder="Identificador no sistema externo"
                      />
                    </div>

                    <div>
                      <Label>Frequência de Sincronização</Label>
                      <Select
                        value={formData.sync_frequency}
                        onValueChange={v => setFormData({...formData, sync_frequency: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="realtime">Tempo Real (Webhook)</SelectItem>
                          <SelectItem value="hourly">A cada hora</SelectItem>
                          <SelectItem value="daily">Diária (6h)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                        <div className="text-sm">
                          <p className="font-medium text-warning">API Key Necessária</p>
                          <p className="text-muted-foreground">
                            A chave de API será solicitada após salvar a configuração.
                            Ela será armazenada de forma segura e criptografada.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSubmit} disabled={createIntegration.isPending}>
                      {createIntegration.isPending ? 'Salvando...' : 'Salvar Integração'}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="bg-info/5 border-info/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Clock className="h-8 w-8 text-info" />
              <div>
                <h3 className="font-semibold">Como Funciona</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  O sistema busca automaticamente as batidas de ponto do sistema externo e calcula:
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Horas Trabalhadas</strong> vs <strong>Jornada Padrão</strong></li>
                  <li><strong>Banco de Horas</strong> (crédito/débito)</li>
                  <li><strong>Horas Extras 50%/100%</strong> (dias úteis/feriados)</li>
                  <li><strong>Adicional Noturno</strong> (22h-05h)</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Esses dados alimentam automaticamente a <strong>Folha de Pagamento</strong> e o <strong>Custeio Industrial</strong>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Integrations List */}
        {integrationsLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : integrations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1 h-full ${
                  integration.is_active ? 'bg-success' : 'bg-muted-foreground'
                }`} />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {providers.find(p => p.id === integration.provider)?.logo || '🔗'}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{integration.provider_name}</CardTitle>
                        <CardDescription>{integration.company_code || 'Sem código'}</CardDescription>
                      </div>
                    </div>
                    <Badge variant={integration.is_active ? 'default' : 'secondary'}>
                      {integration.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Sincronização</span>
                    <Badge variant="outline">
                      {integration.sync_frequency === 'daily' && 'Diária'}
                      {integration.sync_frequency === 'hourly' && 'Horária'}
                      {integration.sync_frequency === 'realtime' && 'Tempo Real'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Última Sync</span>
                    <span className="flex items-center gap-1">
                      {integration.last_sync_status === 'success' ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : integration.last_sync_status === 'error' ? (
                        <XCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      )}
                      {integration.last_sync_at 
                        ? new Date(integration.last_sync_at).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </span>
                  </div>

                  {integration.last_sync_error && (
                    <p className="text-xs text-destructive bg-destructive/10 p-2 rounded">
                      {integration.last_sync_error}
                    </p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleSync(integration.id)}
                      disabled={syncingId === integration.id}
                    >
                      {syncingId === integration.id ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Sincronizar
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Nenhuma Integração Configurada</h3>
              <p className="text-muted-foreground mt-1">
                Configure uma integração para importar automaticamente as batidas de ponto.
              </p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Integração
              </Button>
            </div>
          </Card>
        )}

        {/* Available Providers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Provedores Suportados</CardTitle>
            <CardDescription>
              Sistemas de ponto eletrônico compatíveis com o gateway
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {providers.map((provider) => {
                const isConnected = integrations.some(i => i.provider === provider.id);
                return (
                  <div
                    key={provider.id}
                    className={`p-4 rounded-lg border text-center ${
                      isConnected 
                        ? 'bg-success/5 border-success/20' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-3xl mb-2">{provider.logo}</div>
                    <p className="text-sm font-medium">{provider.name}</p>
                    {isConnected && (
                      <Badge variant="outline" className="mt-2 text-success border-success/20">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
