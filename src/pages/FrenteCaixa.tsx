import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/formatters';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  Banknote, 
  QrCode,
  Search,
  Package,
  User,
  Calculator,
} from 'lucide-react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// Mock products for demonstration
const mockProducts = [
  { id: '1', name: 'Produto A', price: 29.90, sku: 'SKU001' },
  { id: '2', name: 'Produto B', price: 49.90, sku: 'SKU002' },
  { id: '3', name: 'Produto C', price: 19.90, sku: 'SKU003' },
  { id: '4', name: 'Produto D', price: 99.90, sku: 'SKU004' },
  { id: '5', name: 'Serviço X', price: 150.00, sku: 'SVC001' },
  { id: '6', name: 'Serviço Y', price: 250.00, sku: 'SVC002' },
];

export default function FrenteCaixa() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [customer, setCustomer] = useState<string | null>(null);

  const filteredProducts = mockProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: typeof mockProducts[0]) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0;
  const total = subtotal - discount;

  const handleCheckout = (paymentMethod: string) => {
    console.log('Checkout with:', paymentMethod, { cart, customer, total });
    // TODO: Implement actual checkout
    setCart([]);
    setCustomer(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Frente de Caixa"
          description="PDV - Ponto de Venda"
        >
          <Button variant="outline" onClick={() => navigate('/vendas')}>
            <ShoppingCart className="h-4 w-4 mr-2" />
            Histórico
          </Button>
        </PageHeader>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Produtos */}
          <div className="lg:col-span-2 space-y-4">
            {/* Busca */}
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou código..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline">
                <User className="h-4 w-4 mr-2" />
                {customer || 'Selecionar Cliente'}
              </Button>
            </div>

            {/* Grid de Produtos */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
              {filteredProducts.map((product) => (
                <Card 
                  key={product.id}
                  className="cursor-pointer hover:shadow-md hover:border-primary/50 transition-all"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4 text-center">
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-lg bg-primary/10 mb-3">
                      <Package className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sku}</p>
                    <p className="text-lg font-bold text-primary mt-1">
                      {formatCurrency(product.price)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Carrinho */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Carrinho
                  {cart.length > 0 && (
                    <Badge variant="secondary" className="ml-auto">
                      {cart.reduce((sum, item) => sum + item.quantity, 0)} itens
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Carrinho vazio</p>
                    <p className="text-xs">Clique em um produto para adicionar</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(item.price)} cada
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <Button 
                              variant="outline" 
                              size="icon" 
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-sm font-semibold w-20 text-right">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Separator />

                    {/* Totais */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Subtotal</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm text-primary">
                          <span>Desconto</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total</span>
                        <span className="text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>

                    <Separator />

                    {/* Pagamento */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button 
                        variant="outline" 
                        className="flex-col h-auto py-3"
                        onClick={() => handleCheckout('dinheiro')}
                      >
                        <Banknote className="h-5 w-5 mb-1" />
                        <span className="text-xs">Dinheiro</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-col h-auto py-3"
                        onClick={() => handleCheckout('cartao')}
                      >
                        <CreditCard className="h-5 w-5 mb-1" />
                        <span className="text-xs">Cartão</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        className="flex-col h-auto py-3"
                        onClick={() => handleCheckout('pix')}
                      >
                        <QrCode className="h-5 w-5 mb-1" />
                        <span className="text-xs">PIX</span>
                      </Button>
                    </div>

                    <Button className="w-full" size="lg" onClick={() => handleCheckout('mixed')}>
                      <Calculator className="h-5 w-5 mr-2" />
                      Finalizar Venda
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
