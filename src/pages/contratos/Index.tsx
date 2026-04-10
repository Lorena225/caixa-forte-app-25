import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileText, Users, Building2, BarChart3, RotateCcw } from "lucide-react";
import { useContractsStats } from "@/hooks/useContracts";

export default function ContratosIndex() {
  const navigate = useNavigate();
  const { data: stats } = useContractsStats();

  const menuItems = [
    {
      title: "Contratos",
      description: "Gestão de contratos com clientes e fornecedores",
      icon: FileText,
      route: "/contratos/lista",
      color: "text-blue-500",
    },
    {
      title: "Fornecedores",
      description: "Cadastro e condições comerciais",
      icon: Building2,
      route: "/contratos/fornecedores",
      color: "text-emerald-500",
    },
    {
      title: "Clientes",
      description: "Condições comerciais e limites",
      icon: Users,
      route: "/contratos/clientes",
      color: "text-purple-500",
    },
    {
      title: "Análises",
      description: "Avaliações de fornecedores e clientes",
      icon: BarChart3,
      route: "/contratos/analises",
      color: "text-amber-500",
    },
    {
      title: "Devoluções",
      description: "Devoluções de produtos e fiscais",
      icon: RotateCcw,
      route: "/contratos/devolucoes",
      color: "text-red-500",
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Contratos & Relacionamentos" 
          description="Gestão de contratos, fornecedores e clientes"
        />

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Contratos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Contratos Ativos</CardTitle>
              <FileText className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.ativos || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">A Vencer</CardTitle>
              <FileText className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.vencendo || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
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
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <CardDescription className="text-xs">{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
