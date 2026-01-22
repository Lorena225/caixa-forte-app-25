import React, { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { AIInsightsPanel } from '@/components/controladoria/AIInsightsPanel';
import { HierarchicalTable } from '@/components/controladoria/HierarchicalTable';
import { RealTimeIndicator } from '@/components/controladoria/RealTimeIndicator';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useRealTimeInsights } from '@/hooks/useRealTimeInsights';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
const mockTransactions = [
  { id: '1', date: '2026-01-22', description: 'Fatura #001 - Cliente XYZ', account: '1.1.1.1', value: 15000, type: 'crédito', category: 'Vendas' },
  { id: '2', date: '2026-01-22', description: 'Pagamento Fornecedor ABC', account: '2.1.1.1', value: 8500, type: 'débito', category: 'Compras' },
  { id: '3', date: '2026-01-21', description: 'Fatura #002 - Cliente XYZ', account: '1.1.1.1', value: 15000, type: 'crédito', category: 'Vendas' },
  { id: '4', date: '2026-01-21', description: 'Salários', account: '2.1.2.1', value: 25000, type: 'débito', category: 'Folha' },
  { id: '5', date: '2026-01-20', description: 'Aluguel', account: '2.1.2.2', value: 5000, type: 'débito', category: 'Aluguel' },
];

const hierarchicalRows = [
  {
    id: 'data_20260122',
    level: 0,
    label: '22 de Janeiro - R$ 23.500',
    value: 23500,
    children: [
      { id: 'tipo_credito', level: 1, label: 'Créditos (R$ 15.000)', value: 15000, children: [
        { id: 'tx_1', level: 2, label: 'Fatura #001 - Cliente XYZ', value: 15000, children: [] },
      ]},
      { id: 'tipo_debito', level: 1, label: 'Débitos (R$ 8.500)', value: 8500, children: [
        { id: 'tx_2', level: 2, label: 'Pagamento Fornecedor ABC', value: 8500, children: [] },
      ]},
    ],
  },
  {
    id: 'data_20260121',
    level: 0,
    label: '21 de Janeiro - R$ 40.000',
    value: 40000,
    children: [
      { id: 'tipo_credito_2', level: 1, label: 'Créditos (R$ 15.000)', value: 15000, children: [
        { id: 'tx_3', level: 2, label: 'Fatura #002 - Cliente XYZ', value: 15000, children: [] },
      ]},
      { id: 'tipo_debito_2', level: 1, label: 'Débitos (R$ 25.000)', value: 25000, children: [
        { id: 'tx_4', level: 2, label: 'Salários', value: 25000, children: [] },
      ]},
    ],
  },
];

export const ControladoriaLivroDiarioPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const aiAnalysis = useAIAnalysis(mockTransactions);
  const anomalies = aiAnalysis.detectAnomalies();

  const financialData = {
    caixaLevel: 350000,
    indices: {
      liquidity: { corrente: 1.25 },
      solvency: { endividamento: 0.45 },
      profitability: { marginLiquida: 0.18 }
    },
    passivoVariation: { percentVariation: 5 },
    diasAtrasados: 8
  };

  const insights = useRealTimeInsights(financialData).generateInsights();

  const anomalyRate = mockTransactions.length > 0
    ? ((anomalies.critical.length + anomalies.warning.length) / mockTransactions.length * 100).toFixed(1)
    : '0.0';

  return (
    <MainLayout>
      <PageHeader
        title="📖 Livro Diário"
        description="Registro inteligente de transações com análise automática"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <RealTimeIndicator
          label="Total Lançamentos"
          value={mockTransactions.length}
          format="number"
          status="normal"
        />
        <RealTimeIndicator
          label="Valor Processado"
          value={67500}
          format="currency"
          trend="up"
          change={5.2}
        />
        <RealTimeIndicator
          label="Taxa Anomalias"
          value={`${anomalyRate}%`}
          format="number"
          status={anomalies.critical.length > 0 ? 'critical' : 'normal'}
        />
      </div>

      {/* AI Insights */}
      <AIInsightsPanel insights={insights.slice(0, 3)} maxItems={3} />

      {/* Transactions Table */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Lançamentos do Período</CardTitle>
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Input
              type="text"
              placeholder="Buscar lançamento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            <Button variant="outline" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </Button>
          </div>

          <HierarchicalTable rows={hierarchicalRows} columns={['Valor']} />
        </CardContent>
      </Card>

      {/* Anomaly Summary */}
      <Card className="mt-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-primary mb-2">💡 Anomalias Detectadas</h4>
          <p className="text-sm text-primary/80">
            Total: {anomalies.critical.length} críticas, {anomalies.warning.length} avisos, {anomalies.info.length} informações
          </p>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ControladoriaLivroDiarioPage;
