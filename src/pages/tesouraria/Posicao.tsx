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

        <a href="/ia/agente-caixa" className="flex items-center gap-3 p-3 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-colors">
          <div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-sm">🤖</div>
          <div className="flex-1">
            <p className="text-sm font-medium text-cyan-900">Agente IA de Fluxo de Caixa</p>
            <p className="text-xs text-cyan-700">Projeção 30/60/90 dias, alertas de saldo crítico e sugestões de aplicação automáticas</p>
          </div>
          <span className="text-xs font-medium text-cyan-700">Abrir agente →</span>
        </a>

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
