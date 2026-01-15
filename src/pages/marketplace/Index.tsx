import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { usePublicAPI, MarketplaceApp } from '@/hooks/usePublicAPI';
import { 
  Search, 
  Plug, 
  CheckCircle, 
  ExternalLink, 
  Star,
  Zap,
  CreditCard,
  Building2,
  ShoppingCart,
  FileText,
  MessageSquare,
  Settings
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  crm: <Zap className="h-5 w-5" />,
  ecommerce: <ShoppingCart className="h-5 w-5" />,
  automation: <Settings className="h-5 w-5" />,
  fiscal: <FileText className="h-5 w-5" />,
  banking: <Building2 className="h-5 w-5" />,
  communication: <MessageSquare className="h-5 w-5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  crm: 'CRM',
  ecommerce: 'E-commerce',
  automation: 'Automação',
  fiscal: 'Fiscal',
  banking: 'Bancário',
  communication: 'Comunicação',
};

const CATEGORY_COLORS: Record<string, string> = {
  crm: 'bg-blue-100 text-blue-800',
  ecommerce: 'bg-purple-100 text-purple-800',
  automation: 'bg-orange-100 text-orange-800',
  fiscal: 'bg-green-100 text-green-800',
  banking: 'bg-slate-100 text-slate-800',
  communication: 'bg-pink-100 text-pink-800',
};

export default function Marketplace() {
  const { 
    marketplaceApps, 
    marketplaceAppsLoading, 
    appConnections,
    connectApp,
    disconnectApp 
  } = usePublicAPI();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<MarketplaceApp | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isAppConnected = (appId: string) => {
    return appConnections.some(c => c.app_id === appId && c.status === 'connected');
  };

  const getConnectionForApp = (appId: string) => {
    return appConnections.find(c => c.app_id === appId);
  };

  const filteredApps = marketplaceApps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          app.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredApps = filteredApps.filter(app => app.is_featured);
  const otherApps = filteredApps.filter(app => !app.is_featured);

  const categories = ['all', ...new Set(marketplaceApps.map(app => app.category))];

  const handleConnect = async (app: MarketplaceApp) => {
    await connectApp.mutateAsync(app.id);
  };

  const handleDisconnect = async (app: MarketplaceApp) => {
    const connection = getConnectionForApp(app.id);
    if (connection) {
      await disconnectApp.mutateAsync(connection.id);
    }
  };

  const openDetails = (app: MarketplaceApp) => {
    setSelectedApp(app);
    setDetailsOpen(true);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Marketplace de Integrações"
        description="Conecte o Caixa Forte às suas ferramentas favoritas"
      />

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar integrações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            {categories.filter(c => c !== 'all').map((category) => (
              <TabsTrigger key={category} value={category} className="capitalize">
                {CATEGORY_LABELS[category] || category}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Featured Apps */}
      {featuredApps.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Destaques
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredApps.map((app) => (
              <AppCard 
                key={app.id} 
                app={app} 
                isConnected={isAppConnected(app.id)}
                onConnect={() => handleConnect(app)}
                onDisconnect={() => handleDisconnect(app)}
                onDetails={() => openDetails(app)}
                isPending={connectApp.isPending || disconnectApp.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Apps */}
      {otherApps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">
            {featuredApps.length > 0 ? 'Outras Integrações' : 'Integrações Disponíveis'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {otherApps.map((app) => (
              <AppCard 
                key={app.id} 
                app={app} 
                isConnected={isAppConnected(app.id)}
                onConnect={() => handleConnect(app)}
                onDisconnect={() => handleDisconnect(app)}
                onDetails={() => openDetails(app)}
                isPending={connectApp.isPending || disconnectApp.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {filteredApps.length === 0 && !marketplaceAppsLoading && (
        <div className="text-center py-12">
          <Plug className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma integração encontrada</h3>
          <p className="text-muted-foreground">
            Tente ajustar os filtros ou termos de busca
          </p>
        </div>
      )}

      {/* App Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          {selectedApp && (
            <>
              <DialogHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${CATEGORY_COLORS[selectedApp.category] || 'bg-muted'}`}>
                    {CATEGORY_ICONS[selectedApp.category] || <Plug className="h-6 w-6" />}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedApp.name}</DialogTitle>
                    <DialogDescription className="mt-1">
                      {selectedApp.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div>
                  <h4 className="font-medium mb-2">Sobre</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedApp.long_description || selectedApp.description}
                  </p>
                </div>

                {selectedApp.features && selectedApp.features.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Funcionalidades</h4>
                    <ul className="grid grid-cols-2 gap-2">
                      {selectedApp.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <Badge className={CATEGORY_COLORS[selectedApp.category]}>
                    {CATEGORY_LABELS[selectedApp.category] || selectedApp.category}
                  </Badge>
                  <Badge variant={selectedApp.pricing_type === 'free' ? 'secondary' : 'outline'}>
                    {selectedApp.pricing_type === 'free' && 'Grátis'}
                    {selectedApp.pricing_type === 'freemium' && 'Freemium'}
                    {selectedApp.pricing_type === 'paid' && 'Pago'}
                  </Badge>
                </div>

                {selectedApp.setup_instructions && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-medium mb-2">Instruções de Configuração</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedApp.setup_instructions}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                {selectedApp.documentation_url && (
                  <Button variant="outline" asChild>
                    <a href={selectedApp.documentation_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Documentação
                    </a>
                  </Button>
                )}
                {isAppConnected(selectedApp.id) ? (
                  <Button 
                    variant="destructive" 
                    onClick={() => handleDisconnect(selectedApp)}
                    disabled={disconnectApp.isPending}
                  >
                    Desconectar
                  </Button>
                ) : (
                  <Button 
                    onClick={() => handleConnect(selectedApp)}
                    disabled={connectApp.isPending}
                  >
                    <Plug className="h-4 w-4 mr-2" />
                    Conectar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// App Card Component
function AppCard({ 
  app, 
  isConnected, 
  onConnect, 
  onDisconnect, 
  onDetails,
  isPending 
}: { 
  app: MarketplaceApp; 
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onDetails: () => void;
  isPending: boolean;
}) {
  return (
    <Card className="flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className={`p-2 rounded-lg ${CATEGORY_COLORS[app.category] || 'bg-muted'}`}>
            {CATEGORY_ICONS[app.category] || <Plug className="h-5 w-5" />}
          </div>
          {isConnected && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Conectado
            </Badge>
          )}
        </div>
        <CardTitle className="text-base mt-3">{app.name}</CardTitle>
        <CardDescription className="line-clamp-2 text-sm">
          {app.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 pb-3">
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-xs">
            {CATEGORY_LABELS[app.category] || app.category}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {app.pricing_type === 'free' && 'Grátis'}
            {app.pricing_type === 'freemium' && 'Freemium'}
            {app.pricing_type === 'paid' && 'Pago'}
          </Badge>
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="flex-1"
          onClick={onDetails}
        >
          Detalhes
        </Button>
        {isConnected ? (
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={onDisconnect}
            disabled={isPending}
          >
            Desconectar
          </Button>
        ) : (
          <Button 
            size="sm" 
            className="flex-1"
            onClick={onConnect}
            disabled={isPending}
          >
            <Plug className="h-3 w-3 mr-1" />
            Conectar
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
