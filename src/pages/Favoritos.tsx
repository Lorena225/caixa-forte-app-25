import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Star, 
  Plus, 
  TrendingUp, 
  Wallet, 
  Users, 
  Package, 
  FileText,
  BarChart3,
  Receipt,
  CreditCard,
  X,
} from 'lucide-react';

interface FavoriteItem {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  category: string;
}

// Default favorite items for new users
const defaultFavorites: FavoriteItem[] = [
  { 
    id: '1', 
    title: 'Dashboard Executivo', 
    description: 'Visão geral financeira',
    route: '/paineis/executivo', 
    icon: BarChart3,
    category: 'Painéis' 
  },
  { 
    id: '2', 
    title: 'Contas a Receber', 
    description: 'Gestão de recebíveis',
    route: '/ar', 
    icon: Wallet,
    category: 'Financeiro' 
  },
  { 
    id: '3', 
    title: 'Contas a Pagar', 
    description: 'Gestão de pagamentos',
    route: '/ap', 
    icon: Receipt,
    category: 'Financeiro' 
  },
  { 
    id: '4', 
    title: 'Nova Venda', 
    description: 'Registrar nova venda',
    route: '/vendas/nova', 
    icon: CreditCard,
    category: 'Vendas' 
  },
  { 
    id: '5', 
    title: 'Produtos', 
    description: 'Cadastro de produtos',
    route: '/cadastros/produtos', 
    icon: Package,
    category: 'Cadastros' 
  },
  { 
    id: '6', 
    title: 'Clientes', 
    description: 'Cadastro de clientes',
    route: '/cadastros/clientes-fornecedores', 
    icon: Users,
    category: 'Cadastros' 
  },
];

// Suggestions for adding new favorites
const suggestions: FavoriteItem[] = [
  { id: 's1', title: 'Fluxo de Caixa', description: 'Projeção financeira', route: '/fluxo-caixa', icon: TrendingUp, category: 'Financeiro' },
  { id: 's2', title: 'DRE', description: 'Resultado do exercício', route: '/dre', icon: FileText, category: 'Relatórios' },
  { id: 's3', title: 'Tesouraria', description: 'Posição consolidada', route: '/tesouraria', icon: Wallet, category: 'Financeiro' },
  { id: 's4', title: 'Estoque', description: 'Gestão de estoque', route: '/estoque', icon: Package, category: 'Estoque' },
];

export default function Favoritos() {
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteItem[]>(defaultFavorites);

  const handleRemoveFavorite = (id: string) => {
    setFavorites(prev => prev.filter(f => f.id !== id));
  };

  const handleAddFavorite = (item: FavoriteItem) => {
    if (!favorites.find(f => f.route === item.route)) {
      setFavorites(prev => [...prev, { ...item, id: `fav-${Date.now()}` }]);
    }
  };

  const availableSuggestions = suggestions.filter(
    s => !favorites.find(f => f.route === s.route)
  );

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Favoritos"
          description="Acesso rápido aos seus módulos e páginas preferidos"
        />

        {/* Favoritos Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((item) => (
            <Card 
              key={item.id} 
              className="group cursor-pointer hover:shadow-lg transition-all hover:border-primary/50"
              onClick={() => navigate(item.route)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{item.title}</CardTitle>
                      <CardDescription className="text-xs">{item.description}</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFavorite(item.id);
                    }}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              </CardContent>
            </Card>
          ))}

          {/* Add New Card */}
          <Card className="border-dashed cursor-pointer hover:border-primary/50 transition-colors flex items-center justify-center min-h-[140px]">
            <div className="text-center text-muted-foreground">
              <Plus className="h-8 w-8 mx-auto mb-2 text-primary/50" />
              <p className="text-sm font-medium">Adicionar favorito</p>
            </div>
          </Card>
        </div>

        {/* Sugestões */}
        {availableSuggestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Sugestões</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {availableSuggestions.map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  className="h-auto flex items-center gap-3 p-4 justify-start"
                  onClick={() => handleAddFavorite(item)}
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Star className="h-4 w-4 ml-auto text-muted-foreground" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
