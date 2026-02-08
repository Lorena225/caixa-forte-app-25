import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Play, 
  RefreshCw, 
  Package, 
  Factory, 
  ShoppingCart,
  Clock
} from "lucide-react";
import { useMRPRequirements, useRunMRP } from "@/hooks/usePCP";
import { RequirementsTable } from "@/components/producao/RequirementsTable";
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
  const pendingRequirements = requirements.filter(r => r.status !== 'converted');

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
            description="Cálculo de necessidades e conversão automática em OPs/RCs"
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
