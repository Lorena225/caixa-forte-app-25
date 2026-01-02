import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useIntegrations, useCreateIntegration, useDeleteIntegration, IntegrationProvider } from '@/hooks/useIntegrations';
import { useIntegrationConnections } from '@/hooks/useEnterpriseIntegrations';
import { Plus, FileSpreadsheet, FileText, Trash2, Settings, Upload, RefreshCw, ShoppingCart, CreditCard, Users, Code, AlertTriangle, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const providerLabels: Record<IntegrationProvider, string> = {
  ofx: 'Arquivo OFX',
  csv: 'Arquivo CSV',
  stripe: 'Stripe',
  mercadopago: 'Mercado Pago',
  asaas: 'Asaas',
  pagarme: 'Pagar.me',
  omie: 'Omie',
  tiny: 'Tiny ERP',
  bling: 'Bling',
  openfinance: 'Open Finance',
  other: 'Outro',
};

const providerIcons: Record<string, React.ReactNode> = {
  ofx: <FileText className="h-6 w-6" />,
  csv: <FileSpreadsheet className="h-6 w-6" />,
};

export default function IntegracoesIndex() {
  const { data: integrations, isLoading } = useIntegrations();
  const { data: connections } = useIntegrationConnections();
  const createIntegration = useCreateIntegration();
  const deleteIntegration = useDeleteIntegration();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newProvider, setNewProvider] = useState<IntegrationProvider>('ofx');

  const handleCreate = async () => {
    if (!newName) return;
    await createIntegration.mutateAsync({
      name: newName,
      provider: newProvider,
      auth_type: 'file',
    });
    setIsCreateOpen(false);
    setNewName('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500">Conectado</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      case 'disabled':
        return <Badge variant="secondary">Desativado</Badge>;
      default:
        return <Badge variant="outline">Desconectado</Badge>;
    }
  };

  const activeConnections = connections?.filter(c => c.status === 'active').length || 0;
  const errorConnections = connections?.filter(c => c.status === 'error').length || 0;

  return (
    <MainLayout>
      <PageHeader
        title="Integrações"
        description="Conecte bancos, gateways, e-commerce e ERPs"
      >
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Integração</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Integração</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: Banco Itaú, Mercado Pago Loja 1"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newProvider} onValueChange={(v) => setNewProvider(v as IntegrationProvider)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ofx">Arquivo OFX (Extrato bancário)</SelectItem>
                    <SelectItem value="csv">Arquivo CSV</SelectItem>
                    <SelectItem value="mercadopago">Mercado Pago (em breve)</SelectItem>
                    <SelectItem value="stripe">Stripe (em breve)</SelectItem>
                    <SelectItem value="asaas">Asaas (em breve)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newName || createIntegration.isPending}>
                Criar Integração
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Enterprise Integration Summary */}
      <div className="grid gap-4 md:grid-cols-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Conexões Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeConnections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Com Erro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{errorConnections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Conexões</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connections?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Integrações Arquivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{integrations?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Enterprise Features */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-4">Integrações Enterprise</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <Zap className="h-5 w-5 text-purple-600" />
                </div>
                <CardTitle className="text-base">Conexões</CardTitle>
              </div>
              <CardDescription>WooCommerce, Gateways, CRM, APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/integracoes/connections">Gerenciar Conexões</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <RefreshCw className="h-5 w-5 text-blue-600" />
                </div>
                <CardTitle className="text-base">Jobs</CardTitle>
              </div>
              <CardDescription>Sincronizações e processamentos</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/integracoes/jobs">Ver Jobs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <CardTitle className="text-base">Logs</CardTitle>
              </div>
              <CardDescription>Requisições HTTP e webhooks</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/integracoes/enterprise-logs">Ver Logs</Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <CardTitle className="text-base">DLQ</CardTitle>
              </div>
              <CardDescription>Erros e reprocessamento</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link to="/integracoes/dlq">Ver Erros</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* File-based Integrations */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Integrações por Arquivo</h3>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : integrations?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma integração de arquivo</h3>
              <p className="text-muted-foreground mb-4">
                Crie uma integração para importar extratos OFX/CSV
              </p>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />Nova Integração
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {integrations?.map((integration) => (
              <Card key={integration.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg">
                      {providerIcons[integration.provider] || <FileText className="h-6 w-6" />}
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <CardDescription>{providerLabels[integration.provider]}</CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(integration.status)}
                </CardHeader>
                <CardContent>
                  <div className="text-xs text-muted-foreground mb-4">
                    {integration.last_sync_at ? (
                      <>Última sync: {format(new Date(integration.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                    ) : (
                      'Nunca sincronizado'
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link to={`/integracoes/${integration.id}/importar`}>
                        <Upload className="mr-1 h-3 w-3" />Importar
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="icon">
                      <Link to={`/integracoes/${integration.id}/configurar`}>
                        <Settings className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteIntegration.mutate(integration.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Central de Conciliação
            </CardTitle>
            <CardDescription>Revise e aprove matches pendentes</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/integracoes/conciliacao">Abrir Conciliação</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Logs de Importação
            </CardTitle>
            <CardDescription>Histórico de importações de arquivos</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to="/integracoes/logs">Ver Logs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
