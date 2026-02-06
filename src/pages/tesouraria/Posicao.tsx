import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LiquidityDashboard } from '@/components/tesouraria/LiquidityDashboard';
import { RollingForecastChart } from '@/components/tesouraria/RollingForecastChart';
import { WhatIfSimulator } from '@/components/tesouraria/WhatIfSimulator';
import { BudgetVsActualChart } from '@/components/tesouraria/BudgetVsActualChart';
import { Wallet, LineChart, Calculator, Target } from 'lucide-react';

export default function Posicao() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Posição de Caixa"
          description="Dashboard de liquidez, projeções e simulações financeiras"
        />

        <Tabs defaultValue="liquidez" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="liquidez" className="gap-2">
              <Wallet className="h-4 w-4" />
              Liquidez
            </TabsTrigger>
            <TabsTrigger value="projecao" className="gap-2">
              <LineChart className="h-4 w-4" />
              Rolling Forecast
            </TabsTrigger>
            <TabsTrigger value="simulador" className="gap-2">
              <Calculator className="h-4 w-4" />
              What-If
            </TabsTrigger>
            <TabsTrigger value="orcamento" className="gap-2">
              <Target className="h-4 w-4" />
              Orçado vs Real
            </TabsTrigger>
          </TabsList>

          <TabsContent value="liquidez" className="space-y-6">
            <LiquidityDashboard />
          </TabsContent>

          <TabsContent value="projecao" className="space-y-6">
            <RollingForecastChart />
          </TabsContent>

          <TabsContent value="simulador" className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <WhatIfSimulator />
              <RollingForecastChart />
            </div>
          </TabsContent>

          <TabsContent value="orcamento" className="space-y-6">
            <BudgetVsActualChart />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
