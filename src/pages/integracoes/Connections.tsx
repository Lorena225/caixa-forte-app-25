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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useIntegrationConnections,
  useCreateConnection,
  useDeleteConnection,
  useUpdateConnection,
  ConnectionType,
  connectionTypeLabels,
} from '@/hooks/useEnterpriseIntegrations';
import { Plus, Trash2, Settings, Play, Pause, ShoppingCart, CreditCard, Users, Code, Building2, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeIcons: Record<ConnectionType, React.ReactNode> = {
  woocommerce: <ShoppingCart className="h-5 w-5" />,
  payment_gateway: <CreditCard className="h-5 w-5" />,
  crm: <Users className="h-5 w-5" />,
  custom_api: <Code className="h-5 w-5" />,
  erp: <Building2 className="h-5 w-5" />,
};

export default function Connections() {
  const { data: connections, isLoading } = useIntegrationConnections();
  const createConnection = useCreateConnection();
  const deleteConnection = useDeleteConnection();
  const updateConnection = useUpdateConnection();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<ConnectionType>('woocommerce');

  const handleCreate = async () => {
    if (!newName) return;
    await createConnection.mutateAsync({
      name: newName,
      type: newType,
    });
    setIsCreateOpen(false);
    setNewName('');
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    await updateConnection.mutateAsync({
      id,
      data: { status: currentStatus === 'active' ? 'disabled' : 'active' },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro</Badge>;
      case 'testing':
        return <Badge className="bg-blue-500">Testando</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Desativado</Badge>;
    }
  };

  const groupedConnections = {
    woocommerce: connections?.filter(c => c.type === 'woocommerce') || [],
    payment_gateway: connections?.filter(c => c.type === 'payment_gateway') || [],
    crm: connections?.filter(c => c.type === 'crm') || [],
    custom_api: connections?.filter(c => c.type === 'custom_api') || [],
    erp: connections?.filter(c => c.type === 'erp') || [],
  };

  return (
    <MainLayout>
      <PageHeader
        title="Conexões Enterprise"
        description="Gerencie conexões com WooCommerce, Gateways, CRM e APIs externas"
      >
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />Nova Conexão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conexão</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  placeholder="Ex: WooCommerce Loja Principal"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newType} onValueChange={(v) => setNewType(v as ConnectionType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="woocommerce">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-4 w-4" />WooCommerce / E-commerce
                      </div>
                    </SelectItem>
                    <SelectItem value="payment_gateway">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />Gateway de Pagamento
                      </div>
                    </SelectItem>
                    <SelectItem value="crm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />CRM
                      </div>
                    </SelectItem>
                    <SelectItem value="custom_api">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />API Personalizada / Webhooks
                      </div>
                    </SelectItem>
                    <SelectItem value="erp">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />ERP Externo
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full" disabled={!newName || createConnection.isPending}>
                Criar Conexão
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : connections?.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <Code className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma conexão configurada</h3>
            <p className="text-muted-foreground mb-4">
              Crie sua primeira conexão enterprise para integrar sistemas externos
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />Nova Conexão
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="all" className="mt-6">
          <TabsList>
            <TabsTrigger value="all">Todas ({connections?.length})</TabsTrigger>
            <TabsTrigger value="woocommerce">E-commerce ({groupedConnections.woocommerce.length})</TabsTrigger>
            <TabsTrigger value="payment_gateway">Gateways ({groupedConnections.payment_gateway.length})</TabsTrigger>
            <TabsTrigger value="crm">CRM ({groupedConnections.crm.length})</TabsTrigger>
            <TabsTrigger value="custom_api">APIs ({groupedConnections.custom_api.length})</TabsTrigger>
          </TabsList>

          {['all', 'woocommerce', 'payment_gateway', 'crm', 'custom_api', 'erp'].map(tab => (
            <TabsContent key={tab} value={tab}>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(tab === 'all' ? connections : groupedConnections[tab as ConnectionType])?.map((conn) => (
                  <Card key={conn.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-muted rounded-lg">
                          {typeIcons[conn.type]}
                        </div>
                        <div>
                          <CardTitle className="text-base">{conn.name}</CardTitle>
                          <CardDescription>{connectionTypeLabels[conn.type]}</CardDescription>
                        </div>
                      </div>
                      {getStatusBadge(conn.status)}
                    </CardHeader>
                    <CardContent>
                      <div className="text-xs text-muted-foreground mb-4">
                        {conn.last_sync_at ? (
                          <>Última sync: {format(new Date(conn.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                        ) : (
                          'Nunca sincronizado'
                        )}
                        {conn.last_error && (
                          <p className="text-destructive mt-1 truncate">{conn.last_error}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => handleToggleStatus(conn.id, conn.status)}
                        >
                          {conn.status === 'active' ? (
                            <><Pause className="mr-1 h-3 w-3" />Pausar</>
                          ) : (
                            <><Play className="mr-1 h-3 w-3" />Ativar</>
                          )}
                        </Button>
                        <Button asChild variant="ghost" size="icon">
                          <Link to={`/integracoes/enterprise/${conn.id}`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteConnection.mutate(conn.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </MainLayout>
  );
}
