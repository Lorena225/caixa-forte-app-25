import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { AIInsightsPanel } from '@/components/controladoria/AIInsightsPanel';
import { RealTimeIndicator } from '@/components/controladoria/RealTimeIndicator';
import { HierarchicalTable } from '@/components/controladoria/HierarchicalTable';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useRealTimeInsights } from '@/hooks/useRealTimeInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const ControladoriaBalancoPage: React.FC = () => {
  const indices = useAIAnalysis([]).calculateIndices(1500000, 330000, 420000, 500000, 200000, 100000);

  const financialData = {
    caixaLevel: 350000,
    indices: indices,
    passivoVariation: { percentVariation: 5 },
    diasAtrasados: 8,
  };

  const insights = useRealTimeInsights(financialData).generateInsights();

  const healthScore = Math.round(
    (indices.liquidity.corrente / 2 + (1 - indices.solvency.endividamento) + indices.profitability.roe) * 25
  );

  const balanceRows = [
    {
      id: 'ativo',
      level: 0,
      label: 'ATIVO TOTAL',
      value: 1500000,
      children: [
        {
          id: 'circ',
          level: 1,
          label: 'Ativo Circulante',
          value: 825000,
          children: [
            { id: 'caixa', level: 2, label: 'Caixa e Bancos', value: 250000, children: [] },
            { id: 'ar', level: 2, label: 'Contas a Receber', value: 200000, children: [] },
            { id: 'estoque', level: 2, label: 'Estoques', value: 375000, children: [] },
          ],
        },
        {
          id: 'ncirc',
          level: 1,
          label: 'Ativo Não-Circulante',
          value: 675000,
          children: [
            { id: 'imob', level: 2, label: 'Imobilizado', value: 600000, children: [] },
            { id: 'diferido', level: 2, label: 'Diferido', value: 75000, children: [] },
          ],
        },
      ],
    },
    {
      id: 'passivo',
      level: 0,
      label: 'PASSIVO TOTAL',
      value: 750000,
      children: [
        {
          id: 'pcirc',
          level: 1,
          label: 'Passivo Circulante',
          value: 330000,
          children: [
            { id: 'ap', level: 2, label: 'Contas a Pagar', value: 180000, children: [] },
            { id: 'empc', level: 2, label: 'Empréstimos CP', value: 150000, children: [] },
          ],
        },
        {
          id: 'pncirc',
          level: 1,
          label: 'Passivo Não-Circulante',
          value: 420000,
          children: [
            { id: 'empl', level: 2, label: 'Financiamentos LP', value: 420000, children: [] },
          ],
        },
      ],
    },
    {
      id: 'pl',
      level: 0,
      label: 'PATRIMÔNIO LÍQUIDO',
      value: 750000,
      children: [
        { id: 'capital', level: 1, label: 'Capital Social', value: 500000, children: [] },
        { id: 'reservas', level: 1, label: 'Reservas', value: 150000, children: [] },
        { id: 'lucros', level: 1, label: 'Resultados Acumulados', value: 100000, children: [] },
      ],
    },
  ];

  return (
    <MainLayout>
      <PageHeader
        title="📊 Balanço Patrimonial"
        description="Análise inteligente da saúde financeira da empresa"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground mb-1">Pontuação de Saúde</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-500">{healthScore}</p>
            <p className="text-xs text-green-600 dark:text-green-500">✅ Saudável</p>
          </CardContent>
        </Card>
        <RealTimeIndicator
          label="Liquidez Corrente"
          value={indices.liquidity.corrente.toFixed(2)}
          unit="x"
          format="number"
          status={indices.liquidity.corrente > 1.2 ? 'normal' : 'warning'}
        />
        <RealTimeIndicator
          label="Endividamento"
          value={(indices.solvency.endividamento * 100).toFixed(1)}
          unit="%"
          format="number"
          status={indices.solvency.endividamento > 0.6 ? 'warning' : 'normal'}
        />
        <RealTimeIndicator
          label="Margem Líquida"
          value={(indices.profitability.marginLiquida * 100).toFixed(1)}
          unit="%"
          format="number"
          status="normal"
          trend="up"
          change={3.2}
        />
      </div>

      {/* AI Insights */}
      <AIInsightsPanel insights={insights.slice(0, 2)} maxItems={2} />

      {/* Balance Sheet Structure */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Estrutura Patrimonial</CardTitle>
        </CardHeader>
        <CardContent>
          <HierarchicalTable rows={balanceRows} columns={['Valor']} />
        </CardContent>
      </Card>

      {/* Financial Indices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Liquidity Indices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Índices de Liquidez</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Corrente:</span>
              <span className="font-semibold">{indices.liquidity.corrente.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Imediata:</span>
              <span className="font-semibold">{indices.liquidity.immediata.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Geral:</span>
              <span className="font-semibold">{indices.liquidity.geral.toFixed(2)}x</span>
            </div>
          </CardContent>
        </Card>

        {/* Solvency Indices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Índices de Solvência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Endividamento:</span>
              <span className="font-semibold">{(indices.solvency.endividamento * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Estrutura Capital:</span>
              <span className="font-semibold">{indices.solvency.capitalStructure.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cobertura Juros:</span>
              <span className="font-semibold">{indices.solvency.interestCoverage.toFixed(2)}x</span>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Indices */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Índices de Rentabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROE:</span>
              <span className="font-semibold">{(indices.profitability.roe * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ROA:</span>
              <span className="font-semibold">{(indices.profitability.roa * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margem Bruta:</span>
              <span className="font-semibold">{(indices.profitability.marginBruta * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margem Operacional:</span>
              <span className="font-semibold">{(indices.profitability.marginOperacional * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Margem Líquida:</span>
              <span className="font-semibold">{(indices.profitability.marginLiquida * 100).toFixed(1)}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ControladoriaBalancoPage;
