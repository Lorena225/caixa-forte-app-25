import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator, 
  Play, 
  RefreshCw, 
  Package, 
  Factory, 
  ShoppingCart,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp
} from "lucide-react";
import { useMRPRequirements, useRunMRP } from "@/hooks/usePCP";
import { toast } from "sonner";

export default function MRP() {
  const [dateRange, setDateRange] = useState("30");
  const { data: requirements = [], isLoading, refetch } = useMRPRequirements();
  const runMRP = useRunMRP();

  const handleRunMRP = async () => {
    try {
      await runMRP.mutateAsync(parseInt(dateRange));
      toast.success("Cálculo MRP executado com sucesso!");
      refetch();
    } catch (error) {
      toast.error("Erro ao executar MRP");
    }
  };

  const productionRequirements = requirements.filter(r => r.requirement_type === 'production');
  const purchaseRequirements = requirements.filter(r => r.requirement_type === 'purchase');
  const pendingRequirements = requirements.filter(r => r.status === 'pending');

  const stats = [
    {
      title: "Necessidades Pendentes",
      value: pendingRequirements.length,
      icon: Clock,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: "Ordens de Produção",
      value: productionRequirements.length,
      icon: Factory,
      color: "text-blue-600",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Requisições de Compra",
      value: purchaseRequirements.length,
      icon: ShoppingCart,
      color: "text-green-600",
      bgColor: "bg-green-500/10"
    },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader
            title="MRP - Planejamento de Materiais"
            description="Cálculo de necessidades e planejamento de produção"
          />
          <div className="flex items-center gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Horizonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Próximos 7 dias</SelectItem>
                <SelectItem value="15">Próximos 15 dias</SelectItem>
                <SelectItem value="30">Próximos 30 dias</SelectItem>
                <SelectItem value="60">Próximos 60 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={handleRunMRP} 
              disabled={runMRP.isPending}
              className="gap-2"
            >
              {runMRP.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Executar MRP
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requirements Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" className="gap-2">
              <Package className="h-4 w-4" />
              Todas ({requirements.length})
            </TabsTrigger>
            <TabsTrigger value="production" className="gap-2">
              <Factory className="h-4 w-4" />
              Produção ({productionRequirements.length})
            </TabsTrigger>
            <TabsTrigger value="purchase" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Compra ({purchaseRequirements.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <RequirementsTable requirements={requirements} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="production">
            <RequirementsTable requirements={productionRequirements} isLoading={isLoading} />
          </TabsContent>
          <TabsContent value="purchase">
            <RequirementsTable requirements={purchaseRequirements} isLoading={isLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function RequirementsTable({ requirements, isLoading }: { requirements: any[]; isLoading: boolean }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>;
      case 'planned':
        return <Badge variant="secondary" className="gap-1"><TrendingUp className="h-3 w-3" /> Planejado</Badge>;
      case 'released':
        return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" /> Liberado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'production':
        return <Badge variant="default" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20">Produção</Badge>;
      case 'purchase':
        return <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Compra</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Produto</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Quantidade</TableHead>
            <TableHead>Data Necessária</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          ) : requirements.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma necessidade calculada.</p>
                <p className="text-sm">Execute o MRP para gerar as necessidades.</p>
              </TableCell>
            </TableRow>
          ) : (
            requirements.map(req => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">
                  {req.products?.name || 'Produto não encontrado'}
                </TableCell>
                <TableCell>{getTypeBadge(req.requirement_type)}</TableCell>
                <TableCell className="text-right font-mono">
                  {req.required_quantity?.toLocaleString('pt-BR')}
                </TableCell>
                <TableCell>
                  {new Date(req.required_date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{getStatusBadge(req.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {req.source_type === 'sales_order' ? 'Pedido de Venda' : 
                   req.source_type === 'forecast' ? 'Previsão' : 
                   req.source_type === 'bom_explosion' ? 'Explosão BOM' : req.source_type}
                </TableCell>
                <TableCell>
                  <Button variant="outline" size="sm">
                    {req.requirement_type === 'production' ? 'Criar OP' : 'Criar RC'}
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
