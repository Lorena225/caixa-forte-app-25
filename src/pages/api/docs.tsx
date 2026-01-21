import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  BookOpen, Code, Key, Webhook, Zap, Shield, Clock,
  Copy, ExternalLink, FileText, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  allRoutes, 
  financeiroRoutes, 
  dashboardRoutes, 
  relatoriosRoutes,
  crmRoutes,
  fiscalRoutes,
  automacoesRoutes,
  estoqueRoutes
} from '@/api/routes';
import { API_SCOPES, WEBHOOK_EVENTS } from '@/types/api';

const API_BASE = 'https://hwiyewggonhyppwaikss.supabase.co/functions/v1';

const methodColors: Record<string, string> = {
  GET: 'bg-blue-100 text-blue-700',
  POST: 'bg-green-100 text-green-700',
  PUT: 'bg-yellow-100 text-yellow-700',
  PATCH: 'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

export default function APIDocs() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    toast.success('Código copiado!');
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const curlExample = `curl -X GET "${API_BASE}/api-v1-faturamento" \\
  -H "Authorization: Bearer cf_your_api_key_here" \\
  -H "Content-Type: application/json"`;

  const jsExample = `const response = await fetch('${API_BASE}/api-v1-faturamento', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer cf_your_api_key_here',
    'Content-Type': 'application/json'
  }
});

const data = await response.json();
console.log(data);`;

  const pythonExample = `import requests

url = "${API_BASE}/api-v1-faturamento"
headers = {
    "Authorization": "Bearer cf_your_api_key_here",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print(data)`;

  const createInvoiceExample = `curl -X POST "${API_BASE}/api-v1-faturamento" \\
  -H "Authorization: Bearer cf_your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{
    "descricao": "Serviços de consultoria",
    "valor": 5000.00,
    "vencimento": "2026-02-15",
    "counterparty_id": "uuid-do-fornecedor"
  }'`;

  const webhookExample = `// Payload recebido no seu endpoint
{
  "event": "payment.received",
  "timestamp": "2026-01-21T14:30:00Z",
  "company_id": "uuid-da-empresa",
  "webhook_id": "uuid-do-webhook",
  "data": {
    "id": "uuid-do-pagamento",
    "valor": 1500.00,
    "data_recebimento": "2026-01-21",
    "conta_bancaria": "Banco do Brasil"
  }
}

// Verificar assinatura
const signature = req.headers['x-webhook-signature'];
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(JSON.stringify(req.body))
  .digest('hex');

if (signature !== expectedSignature) {
  return res.status(401).json({ error: 'Invalid signature' });
}`;

  return (
    <MainLayout>
      <PageHeader
        title="Documentação da API"
        description="Referência completa da API REST do Caixa Forte"
        action={{
          label: "Portal do Desenvolvedor",
          onClick: () => window.location.href = '/developers',
          icon: <Key className="h-4 w-4" />
        }}
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full max-w-3xl">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="auth">Autenticação</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="examples">Exemplos</TabsTrigger>
          <TabsTrigger value="sdks">SDKs</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">API REST v1</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  API RESTful completa com suporte a JSON, paginação e filtros avançados.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Shield className="h-5 w-5 text-green-600" />
                <CardTitle className="text-base">Autenticação Segura</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  API Keys com escopos granulares e rate limiting por chave.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center gap-2 pb-2">
                <Webhook className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-base">Webhooks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Receba notificações em tempo real para eventos importantes.
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm flex items-center justify-between">
                <span>{API_BASE}/api-v1-[módulo]</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => copyCode(API_BASE, 'base-url')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Rate Limiting
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <p className="font-medium">Por Minuto</p>
                  <p className="text-2xl font-bold text-primary">60 requests</p>
                  <p className="text-sm text-muted-foreground">Padrão por API Key</p>
                </div>
                <div className="border rounded-lg p-4">
                  <p className="font-medium">Por Dia</p>
                  <p className="text-2xl font-bold text-primary">10.000 requests</p>
                  <p className="text-sm text-muted-foreground">Limite diário</p>
                </div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                <div>
                  <p className="font-medium text-yellow-800">Excedendo limites</p>
                  <p className="text-sm text-yellow-700">
                    Ao exceder o limite, você receberá status 429 com header Retry-After indicando quando pode tentar novamente.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Módulos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-3">
                {[
                  { name: 'Faturamento', path: 'api-v1-faturamento', endpoints: 5 },
                  { name: 'CRM', path: 'api-v1-crm', endpoints: 8 },
                  { name: 'Fiscal', path: 'api-v1-fiscal', endpoints: 6 },
                ].map(mod => (
                  <div key={mod.path} className="border rounded-lg p-4">
                    <p className="font-medium">{mod.name}</p>
                    <p className="text-sm text-muted-foreground font-mono">{mod.path}</p>
                    <Badge variant="secondary" className="mt-2">{mod.endpoints} endpoints</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auth Tab */}
        <TabsContent value="auth" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Autenticação via API Key
              </CardTitle>
              <CardDescription>
                Todas as requisições devem incluir uma API Key válida
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium mb-2">Header de Autorização</p>
                <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                  Authorization: Bearer cf_sua_api_key_aqui
                </div>
              </div>

              <div>
                <p className="font-medium mb-2">Obtendo uma API Key</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse o <a href="/developers" className="text-primary hover:underline">Portal do Desenvolvedor</a></li>
                  <li>Clique em "Nova API Key"</li>
                  <li>Defina um nome e selecione os escopos necessários</li>
                  <li>Copie a chave gerada (ela só será exibida uma vez)</li>
                </ol>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escopos Disponíveis</CardTitle>
              <CardDescription>
                Controle granular de permissões por API Key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {Object.entries(API_SCOPES).map(([scope, info]) => (
                    <div key={scope} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{scope}</code>
                        <p className="text-sm text-muted-foreground mt-1">{info.description}</p>
                      </div>
                      <Badge variant="outline">{info.label}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Endpoints Tab */}
        <TabsContent value="endpoints" className="space-y-6">
          <Accordion type="multiple" className="space-y-4">
            {/* Financeiro */}
            <AccordionItem value="financeiro" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge>Financeiro</Badge>
                  <span>{financeiroRoutes.length} endpoints</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {financeiroRoutes.map((route, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={methodColors[route.method]}>{route.method}</Badge>
                        <code className="text-sm font-mono">/api/v1{route.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                      <div className="mt-2 flex gap-2">
                        <Badge variant="outline">Escopo: {route.scope}</Badge>
                      </div>
                      {route.parameters && route.parameters.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-xs font-medium mb-2">Parâmetros:</p>
                          <div className="space-y-1">
                            {route.parameters.map((param, pIdx) => (
                              <div key={pIdx} className="text-xs flex gap-2">
                                <code className="bg-muted px-1 rounded">{param.name}</code>
                                <span className="text-muted-foreground">{param.description}</span>
                                {param.required && <Badge variant="destructive" className="text-[10px] h-4">obrigatório</Badge>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Dashboard */}
            <AccordionItem value="dashboard" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Dashboard</Badge>
                  <span>{dashboardRoutes.length} endpoints</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {dashboardRoutes.map((route, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={methodColors[route.method]}>{route.method}</Badge>
                        <code className="text-sm font-mono">/api/v1{route.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                      <Badge variant="outline" className="mt-2">Escopo: {route.scope}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* CRM */}
            <AccordionItem value="crm" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">CRM</Badge>
                  <span>{crmRoutes.length} endpoints</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {crmRoutes.map((route, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={methodColors[route.method]}>{route.method}</Badge>
                        <code className="text-sm font-mono">/api/v1{route.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                      <Badge variant="outline" className="mt-2">Escopo: {route.scope}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Fiscal */}
            <AccordionItem value="fiscal" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Fiscal</Badge>
                  <span>{fiscalRoutes.length} endpoints</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {fiscalRoutes.map((route, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={methodColors[route.method]}>{route.method}</Badge>
                        <code className="text-sm font-mono">/api/v1{route.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                      <Badge variant="outline" className="mt-2">Escopo: {route.scope}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Estoque */}
            <AccordionItem value="estoque" className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">Estoque</Badge>
                  <span>{estoqueRoutes.length} endpoints</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  {estoqueRoutes.map((route, idx) => (
                    <div key={idx} className="border rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className={methodColors[route.method]}>{route.method}</Badge>
                        <code className="text-sm font-mono">/api/v1{route.path}</code>
                      </div>
                      <p className="text-sm text-muted-foreground">{route.description}</p>
                      <Badge variant="outline" className="mt-2">Escopo: {route.scope}</Badge>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Configurando Webhooks
              </CardTitle>
              <CardDescription>
                Receba notificações HTTP quando eventos ocorrerem
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Acesse o Portal do Desenvolvedor</li>
                <li>Crie um novo Webhook com sua URL de destino</li>
                <li>Selecione os eventos que deseja receber</li>
                <li>Salve o secret para validar assinaturas</li>
              </ol>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Payload de exemplo:</p>
                <pre className="text-xs overflow-x-auto">{webhookExample}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eventos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {Object.entries(
                    Object.entries(WEBHOOK_EVENTS).reduce((acc, [event, info]) => {
                      if (!acc[info.category]) acc[info.category] = [];
                      acc[info.category].push({ event, ...info });
                      return acc;
                    }, {} as Record<string, Array<{ event: string; label: string; category: string }>>)
                  ).map(([category, events]) => (
                    <div key={category}>
                      <p className="font-medium text-sm mb-2">{category}</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {events.map(({ event, label }) => (
                          <div key={event} className="border rounded-lg p-3 flex items-center justify-between">
                            <code className="text-xs font-mono">{event}</code>
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>cURL</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{curlExample}</pre>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(curlExample, 'curl')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>JavaScript / TypeScript</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{jsExample}</pre>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(jsExample, 'js')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Python</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{pythonExample}</pre>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(pythonExample, 'python')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Criar Fatura</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{createInvoiceExample}</pre>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="absolute top-2 right-2"
                  onClick={() => copyCode(createInvoiceExample, 'create-invoice')}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SDKs Tab */}
        <TabsContent value="sdks" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  JavaScript / TypeScript
                </CardTitle>
                <CardDescription>SDK oficial para Node.js e navegadores</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                  npm install @caixaforte/sdk
                </div>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{`import { CaixaForte } from '@caixaforte/sdk';

const client = new CaixaForte({
  apiKey: 'cf_sua_api_key'
});

// Listar contas a pagar
const contas = await client.financeiro.contasPagar.list({
  status: 'pendente'
});

// Criar nova conta
const nova = await client.financeiro.contasPagar.create({
  descricao: 'Fornecedor X',
  valor: 1500.00,
  vencimento: '2026-02-01'
});`}</pre>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no NPM
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Python
                </CardTitle>
                <CardDescription>SDK oficial para Python 3.8+</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted rounded-lg p-4 font-mono text-sm">
                  pip install caixaforte
                </div>
                <pre className="bg-muted rounded-lg p-4 text-sm overflow-x-auto">{`from caixaforte import CaixaForte

client = CaixaForte(api_key='cf_sua_api_key')

# Listar contas a pagar
contas = client.financeiro.contas_pagar.list(
    status='pendente'
)

# Criar nova conta
nova = client.financeiro.contas_pagar.create(
    descricao='Fornecedor X',
    valor=1500.00,
    vencimento='2026-02-01'
)`}</pre>
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver no PyPI
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recursos Adicionais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <FileText className="h-6 w-6" />
                  <span>OpenAPI Spec</span>
                  <span className="text-xs text-muted-foreground">Download YAML</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <Code className="h-6 w-6" />
                  <span>Postman Collection</span>
                  <span className="text-xs text-muted-foreground">Importar coleção</span>
                </Button>
                <Button variant="outline" className="h-auto py-4 flex-col gap-2">
                  <BookOpen className="h-6 w-6" />
                  <span>Changelog</span>
                  <span className="text-xs text-muted-foreground">Histórico de versões</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}
