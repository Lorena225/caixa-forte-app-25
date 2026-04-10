import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, FileText, Calculator, TrendingUp, Package, DollarSign } from "lucide-react";
import { useVendasStats } from "@/hooks/useVendas";
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function VendasIndex() {
  const navigate = useNavigate();
  const hoje = new Date();
  const { data: stats } = useVendasStats({
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });

  const menuItems = [
    {
      title: "Nova Venda",
      description: "Criar nova venda ou pedido",
      icon: ShoppingCart,
      route: "/vendas/nova",
      color: "text-emerald-500",
    },
    {
      title: "Pedidos",
      description: "Gerenciar pedidos e vendas",
      icon: FileText,
      route: "/vendas/pedidos",
      color: "text-blue-500",
    },
    {
      title: "Orçamentos",
      description: "Propostas comerciais",
      icon: Calculator,
      route: "/vendas/orcamentos",
      color: "text-amber-500",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Vendas" 
          description="Gestão comercial e faturamento"
        />

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalVendas || 0}</div>
              <p className="text-xs text-muted-foreground">pedidos realizados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Faturadas</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.faturadas || 0}</div>
              <p className="text-xs text-muted-foreground">vendas finalizadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">faturamento do mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.ticketMedio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">por venda</p>
            </CardContent>
          </Card>
        </div>

        {/* Menu Cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {menuItems.map((item) => (
            <Card 
              key={item.route}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(item.route)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-muted ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={() => navigate("/vendas/nova")}>
            <ShoppingCart className="mr-2 h-5 w-5" />
            Iniciar Nova Venda
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
