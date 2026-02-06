import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Search, RefreshCw, TrendingUp, TrendingDown, 
  AlertTriangle, Calendar, FileText, Play, Pause, XCircle,
  HelpCircle, DollarSign, Users, BarChart3
} from "lucide-react";
import { useContractsStats, useContracts } from "@/hooks/useContracts";
import { ContractsKPIs } from "@/components/contratos/ContractsKPIs";
import { ContractsList } from "@/components/contratos/ContractsList";
import { ContractFormDialog } from "@/components/contratos/ContractFormDialog";
import { GenerateBillingDialog } from "@/components/contratos/GenerateBillingDialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function RecorrenciaPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBillingDialog, setShowBillingDialog] = useState(false);
  
  const { data: stats, isLoading: statsLoading } = useContractsStats();
  const { data: contracts, isLoading: contractsLoading } = useContracts({ 
    status: statusFilter,
    search 
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader 
            title="Gestão de Contratos & Assinaturas" 
            description="Receita recorrente, faturamento automático e ciclo de vida dos contratos"
          />
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowBillingDialog(true)}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Gerar Faturamento
            </Button>
            <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </div>
        </div>

        {/* KPIs Dashboard */}
        <ContractsKPIs stats={stats} isLoading={statsLoading} />

        {/* Tabs de Navegação */}
        <Tabs defaultValue="contratos" className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="contratos" className="gap-2">
                <FileText className="h-4 w-4" />
                Contratos
              </TabsTrigger>
              <TabsTrigger value="vencendo" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                A Vencer ({stats?.vencendo || 0})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar contratos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="todos">Todos Status</option>
                <option value="ativo">Ativos</option>
                <option value="suspenso">Suspensos</option>
                <option value="cancelado">Cancelados</option>
                <option value="rascunho">Rascunhos</option>
              </select>
            </div>
          </div>

          <TabsContent value="contratos">
            <ContractsList 
              contracts={contracts || []} 
              isLoading={contractsLoading}
            />
          </TabsContent>

          <TabsContent value="vencendo">
            <ContractsList 
              contracts={(contracts || []).filter(c => {
                if (!c.data_fim) return false;
                const endDate = new Date(c.data_fim);
                const today = new Date();
                const thirtyDays = new Date();
                thirtyDays.setDate(today.getDate() + 30);
                return endDate >= today && endDate <= thirtyDays;
              })} 
              isLoading={contractsLoading}
            />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
        <ContractFormDialog 
          open={showCreateDialog} 
          onOpenChange={setShowCreateDialog}
        />
        <GenerateBillingDialog 
          open={showBillingDialog} 
          onOpenChange={setShowBillingDialog}
        />
      </div>
    </MainLayout>
  );
}
