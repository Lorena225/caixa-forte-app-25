import { MainLayout } from '@/components/layout/MainLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { Settings, Upload, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';
import ReconciliationConfig from './ReconciliationConfig';
import ReconciliationImport from './ReconciliationImport';
import ReconciliationExceptions from './ReconciliationExceptions';
import ReconciliationHistory from './ReconciliationHistory';
import CashDashboard from './CashDashboard';

export default function ConciliacaoIndex() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Conciliação Bancária"
          description="Motor de automação de baixas e gestão de caixa"
        />

        <Tabs defaultValue="import" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
            <TabsTrigger value="import" className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </TabsTrigger>
            <TabsTrigger value="exceptions" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Exceções</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Automáticas</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Caixa</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Configuração</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import">
            <ReconciliationImport />
          </TabsContent>
          
          <TabsContent value="exceptions">
            <ReconciliationExceptions />
          </TabsContent>
          
          <TabsContent value="history">
            <ReconciliationHistory />
          </TabsContent>
          
          <TabsContent value="dashboard">
            <CashDashboard />
          </TabsContent>
          
          <TabsContent value="config">
            <ReconciliationConfig />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
