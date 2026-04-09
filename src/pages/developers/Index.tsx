import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePublicAPI, API_SCOPES, WEBHOOK_EVENTS } from '@/hooks/usePublicAPI';
import { Key, Webhook, Activity, BookOpen, Code, Copy, Eye, EyeOff, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function DeveloperPortal() {
  const {
    apiKeys, apiKeysLoading, createApiKey, revokeApiKey,
    apiLogs, apiLogsLoading,
    webhooks, webhooksLoading, createWebhook, toggleWebhook, deleteWebhook,
    apiStats, refetchAll,
  } = usePublicAPI();

  const [newKeyDialogOpen, setNewKeyDialogOpen] = useState(false);
  const [newWebhookDialogOpen, setNewWebhookDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);

  const handleCreateKey = async () => {
    if (!newKeyName || newKeyScopes.length === 0) {
      toast.error('Preencha o nome e selecione ao menos um escopo');
      return;
    }
    
    const result = await createApiKey.mutateAsync({
      name: newKeyName,
      scopes: newKeyScopes,
    });
    
    setGeneratedKey(result.key);
    setNewKeyName('');
    setNewKeyScopes([]);
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName || !newWebhookUrl || newWebhookEvents.length === 0) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    await createWebhook.mutateAsync({
      name: newWebhookName,
      endpoint_url: newWebhookUrl,
      events: newWebhookEvents,
    });
    
    setNewWebhookDialogOpen(false);
    setNewWebhookName('');
    setNewWebhookUrl('');
    setNewWebhookEvents([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <MainLayout>
      <PageHeader
        title="Portal do Desenvolvedor"
        description="Gerencie suas API Keys, webhooks e monitore o uso da API"
        action={{
          label: "Atualizar",
          onClick: refetchAll,
          icon: <RefreshCw className="h-4 w-4" />
        }}
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiStats?.requestsToday || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requests Mês</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiStats?.requestsMonth || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Erros Hoje</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{apiStats?.errorsToday || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keys Ativas</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{apiStats?.activeKeys || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="keys" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keys">
            <Key className="h-4 w-4 mr-2" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks">
            <Webhook className="h-4 w-4 mr-2" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="logs">
            <Activity className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="docs">
            <BookOpen className="h-4 w-4 mr-2" />
            Documentação
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Suas API Keys</h3>
            <Dialog open={newKeyDialogOpen} onOpenChange={setNewKeyDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova API Key
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar API Key</DialogTitle>
                  <DialogDescription>
                    Crie uma nova chave de API para integrar com o Vitrio
                  </DialogDescription>
                </DialogHeader>
                
                {generatedKey ? (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <p className="text-sm text-green-800 font-medium mb-2">
                        ✅ API Key criada com sucesso!
                      </p>
                      <p className="text-xs text-green-600 mb-3">
                        Copie a chave abaixo. Ela não será exibida novamente.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showKey ? 'text' : 'password'}
                          value={generatedKey}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button variant="outline" size="icon" onClick={() => setShowKey(!showKey)}>
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedKey)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={() => { setGeneratedKey(null); setNewKeyDialogOpen(false); }}>
                        Fechar
                      </Button>
                    </DialogFooter>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label>Nome da Key</Label>
                      <Input
                        placeholder="Ex: Integração WooCommerce"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label className="mb-3 block">Escopos de Acesso</Label>
                      <ScrollArea className="h-48 border rounded-lg p-3">
                        <div className="space-y-2">
                          {API_SCOPES.map((scope) => (
                            <div key={scope.value} className="flex items-start gap-2">
                              <Checkbox
                                id={scope.value}
                                checked={newKeyScopes.includes(scope.value)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setNewKeyScopes([...newKeyScopes, scope.value]);
                                  } else {
                                    setNewKeyScopes(newKeyScopes.filter(s => s !== scope.value));
                                  }
                                }}
                              />
                              <div>
                                <Label htmlFor={scope.value} className="font-medium cursor-pointer">
                                  {scope.label}
                                </Label>
                                <p className="text-xs text-muted-foreground">{scope.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                    
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewKeyDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleCreateKey} disabled={createApiKey.isPending}>
                        {createApiKey.isPending ? 'Criando...' : 'Criar Key'}
                      </Button>
                    </DialogFooter>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Prefixo</TableHead>
                  <TableHead>Escopos</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">{key.key_prefix}...</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.slice(0, 2).map((scope) => (
                          <Badge key={scope} variant="outline" className="text-xs">
                            {scope.split(':')[0]}
                          </Badge>
                        ))}
                        {key.scopes.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{key.scopes.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{key.rate_limit_per_minute}/min</TableCell>
                    <TableCell>
                      {key.last_used_at 
                        ? format(new Date(key.last_used_at), 'dd/MM HH:mm', { locale: ptBR })
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.is_active ? 'default' : 'secondary'}>
                        {key.is_active ? 'Ativa' : 'Revogada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {key.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => revokeApiKey.mutate(key.id)}
                        >
                          Revogar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {apiKeys.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma API Key criada ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Seus Webhooks</h3>
            <Dialog open={newWebhookDialogOpen} onOpenChange={setNewWebhookDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Webhook
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Criar Webhook</DialogTitle>
                  <DialogDescription>
                    Receba notificações em tempo real quando eventos ocorrerem
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label>Nome</Label>
                    <Input
                      placeholder="Ex: Webhook Make"
                      value={newWebhookName}
                      onChange={(e) => setNewWebhookName(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label>URL do Endpoint</Label>
                    <Input
                      placeholder="https://seu-servidor.com/webhook"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label className="mb-3 block">Eventos</Label>
                    <ScrollArea className="h-48 border rounded-lg p-3">
                      <div className="space-y-2">
                        {Object.entries(
                          WEBHOOK_EVENTS.reduce((acc, event) => {
                            if (!acc[event.category]) acc[event.category] = [];
                            acc[event.category].push(event);
                            return acc;
                          }, {} as Record<string, typeof WEBHOOK_EVENTS>)
                        ).map(([category, events]) => (
                          <div key={category} className="mb-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">{category}</p>
                            {events.map((event) => (
                              <div key={event.value} className="flex items-center gap-2 ml-2">
                                <Checkbox
                                  id={event.value}
                                  checked={newWebhookEvents.includes(event.value)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setNewWebhookEvents([...newWebhookEvents, event.value]);
                                    } else {
                                      setNewWebhookEvents(newWebhookEvents.filter(e => e !== event.value));
                                    }
                                  }}
                                />
                                <Label htmlFor={event.value} className="text-sm cursor-pointer">
                                  {event.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewWebhookDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateWebhook} disabled={createWebhook.isPending}>
                    {createWebhook.isPending ? 'Criando...' : 'Criar Webhook'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead>Eventos</TableHead>
                  <TableHead>Último Disparo</TableHead>
                  <TableHead>Falhas</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">{webhook.name}</TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate">
                      {webhook.endpoint_url}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{webhook.events.length} eventos</Badge>
                    </TableCell>
                    <TableCell>
                      {webhook.last_triggered_at 
                        ? format(new Date(webhook.last_triggered_at), 'dd/MM HH:mm', { locale: ptBR })
                        : 'Nunca'
                      }
                    </TableCell>
                    <TableCell>
                      {webhook.failure_count > 0 ? (
                        <Badge variant="destructive">{webhook.failure_count}</Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={webhook.is_active}
                        onCheckedChange={(checked) => 
                          toggleWebhook.mutate({ id: webhook.id, is_active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => deleteWebhook.mutate(webhook.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {webhooks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum webhook configurado ainda
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Requisições</CardTitle>
              <CardDescription>Últimas 100 requisições à API</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Horário</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Latência</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant={log.status_code < 400 ? 'default' : 'destructive'}>
                          {log.status_code}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.latency_ms}ms</TableCell>
                    </TableRow>
                  ))}
                  {apiLogs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        Nenhuma requisição registrada ainda
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Docs Tab */}
        <TabsContent value="docs" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Autenticação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Todas as requisições devem incluir sua API Key no header:
                </p>
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`Authorization: Bearer cf_sua_api_key_aqui`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Rate Limiting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Limites padrão de requisições:
                </p>
                <ul className="text-sm space-y-1">
                  <li>• 60 requests/minuto</li>
                  <li>• 10.000 requests/dia</li>
                </ul>
                <p className="text-xs text-muted-foreground">
                  Headers de resposta incluem X-RateLimit-Remaining
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Exemplos de Código</CardTitle>
              <CardDescription>Como fazer requisições à API do Vitrio</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="curl">
                <TabsList>
                  <TabsTrigger value="curl">cURL</TabsTrigger>
                  <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                  <TabsTrigger value="python">Python</TabsTrigger>
                </TabsList>
                
                <TabsContent value="curl" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`# Listar transações
curl -X GET "https://api.caixaforte.com/v1/financeiro/transacoes" \\
  -H "Authorization: Bearer cf_sua_api_key" \\
  -H "Content-Type: application/json"

# Criar lead
curl -X POST "https://api.caixaforte.com/v1/crm/leads" \\
  -H "Authorization: Bearer cf_sua_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{"nome": "João Silva", "email": "joao@email.com", "telefone": "11999999999"}'`}
                  </pre>
                </TabsContent>
                
                <TabsContent value="javascript" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`// Usando fetch
const response = await fetch('https://api.caixaforte.com/v1/financeiro/transacoes', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer cf_sua_api_key',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);

// Criar lead
const lead = await fetch('https://api.caixaforte.com/v1/crm/leads', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer cf_sua_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nome: 'João Silva',
    email: 'joao@email.com',
    telefone: '11999999999'
  })
});`}
                  </pre>
                </TabsContent>
                
                <TabsContent value="python" className="mt-4">
                  <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import requests

# Configuração
API_KEY = 'cf_sua_api_key'
BASE_URL = 'https://api.caixaforte.com/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

# Listar transações
response = requests.get(f'{BASE_URL}/financeiro/transacoes', headers=headers)
transacoes = response.json()

# Criar lead
lead_data = {
    'nome': 'João Silva',
    'email': 'joao@email.com',
    'telefone': '11999999999'
}
response = requests.post(f'{BASE_URL}/crm/leads', headers=headers, json=lead_data)`}
                  </pre>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endpoints Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">📊 Financeiro</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p><Badge className="mr-2">GET</Badge>/v1/financeiro/transacoes</p>
                    <p><Badge className="mr-2">POST</Badge>/v1/financeiro/transacoes</p>
                    <p><Badge className="mr-2">GET</Badge>/v1/financeiro/fluxo-caixa</p>
                    <p><Badge className="mr-2">GET</Badge>/v1/financeiro/contas-bancarias</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">👥 CRM</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p><Badge className="mr-2">GET</Badge>/v1/crm/leads</p>
                    <p><Badge className="mr-2">POST</Badge>/v1/crm/leads</p>
                    <p><Badge className="mr-2">GET</Badge>/v1/crm/oportunidades</p>
                    <p><Badge className="mr-2">PUT</Badge>/v1/crm/oportunidades/:id</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">📄 Fiscal</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p><Badge className="mr-2">GET</Badge>/v1/fiscal/notas</p>
                    <p><Badge className="mr-2">POST</Badge>/v1/fiscal/notas/emitir</p>
                    <p><Badge className="mr-2">POST</Badge>/v1/fiscal/notas/:id/cancelar</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">📦 Estoque</h4>
                  <div className="space-y-1 text-sm font-mono">
                    <p><Badge className="mr-2">GET</Badge>/v1/estoque/produtos</p>
                    <p><Badge className="mr-2">GET</Badge>/v1/estoque/movimentacoes</p>
                    <p><Badge className="mr-2">POST</Badge>/v1/estoque/movimentacoes</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
