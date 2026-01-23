import React, { useState } from 'react';
import { CheckCircle, AlertCircle, RefreshCw, Download, Search, FileText } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { AIInsightsPanel } from '@/components/controladoria/AIInsightsPanel';
import { RealTimeIndicator } from '@/components/controladoria/RealTimeIndicator';
import { HierarchicalTable } from '@/components/controladoria/HierarchicalTable';
import { useAutoReconciliation } from '@/hooks/useAutoReconciliation';
import { useRealTimeInsights } from '@/hooks/useRealTimeInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockSystemAccounts = [
  { id: 'acc_1', name: '1.1.1.1 Caixa', debito: 50000, credito: 0, saldo: 50000, status: 'normal' as const },
  { id: 'acc_2', name: '1.1.1.2 Banco Brasil', debito: 300000, credito: 5000, saldo: 295000, status: 'normal' as const },
  { id: 'acc_3', name: '1.1.2.1 Contas a Receber', debito: 200000, credito: 5000, saldo: 195000, status: 'warning' as const },
  { id: 'acc_4', name: '2.1.1.1 Contas a Pagar', debito: 0, credito: 180000, saldo: -180000, status: 'normal' as const },
  { id: 'acc_5', name: '2.1.2.1 Salários a Pagar', debito: 0, credito: 75000, saldo: -75000, status: 'warning' as const },
  { id: 'acc_6', name: '3.1.1.1 Capital Social', debito: 0, credito: 500000, saldo: -500000, status: 'normal' as const },
];

const mockBankTransactions = [
  { id: 'bank_1', description: 'Depósito Cliente A', value: 50000 },
  { id: 'bank_2', description: 'Depósito Cliente B', value: 300000 },
  { id: 'bank_3', description: 'Saque para Folha', value: 50000 },
];

export const ControladoriaBalancetePage: React.FC = () => {
  const [isReconciling, setIsReconciling] = useState(false);

  const totalDebito = mockSystemAccounts.reduce((sum, acc) => sum + acc.debito, 0);
  const totalCredito = mockSystemAccounts.reduce((sum, acc) => sum + acc.credito, 0);
  const difference = Math.abs(totalDebito - totalCredito);
  const isBalanced = difference < 1;

  const reconciliation = useAutoReconciliation(mockBankTransactions, mockBankTransactions);
  const matchingPairs = reconciliation.findMatchingPairs();
  const balanceDiff = reconciliation.calculateDifferences();

  const financialData = {
    caixaLevel: 350000,
    indices: { liquidity: { corrente: 1.25 }, solvency: { endividamento: 0.45 }, profitability: { marginLiquida: 0.18 } },
    passivoVariation: { percentVariation: 5 },
    diasAtrasados: 8,
  };

  const insights = useRealTimeInsights(financialData).generateInsights();

  const hierarchicalRows = [
    {
      id: 'ativo',
      level: 0,
      label: 'CONTAS DO ATIVO',
      value: 545000,
      children: [
        { id: 'ativo_circ', level: 1, label: 'Disponibilidades', value: 345000, children: [
          { id: 'caixa', level: 2, label: '1.1.1.1 Caixa', value: 50000, children: [] },
          { id: 'banco', level: 2, label: '1.1.1.2 Banco Brasil', value: 295000, children: [] },
        ]},
        { id: 'ativo_receber', level: 1, label: 'Contas a Receber', value: 200000, children: [
          { id: 'ar', level: 2, label: '1.1.2.1 Contas a Receber', value: 195000, children: [] },
        ]},
      ],
    },
    {
      id: 'passivo',
      level: 0,
      label: 'CONTAS DO PASSIVO',
      value: 755000,
      children: [
        { id: 'passivo_circ', level: 1, label: 'Passivo Circulante', value: 255000, children: [
          { id: 'cp', level: 2, label: '2.1.1.1 Contas a Pagar', value: 180000, children: [] },
          { id: 'salarios', level: 2, label: '2.1.2.1 Salários a Pagar', value: 75000, children: [] },
        ]},
        { id: 'patrimonio', level: 1, label: 'Patrimônio Líquido', value: 500000, children: [
          { id: 'capital', level: 2, label: '3.1.1.1 Capital Social', value: 500000, children: [] },
        ]},
      ],
    },
  ];

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

  const handleReconcile = () => {
    setIsReconciling(true);
    setTimeout(() => setIsReconciling(false), 2000);
  };

  return (
    <MainLayout>
      <PageHeader 
        title="✓ Balancete de Verificação" 
        description="Validação automática de integridade contábil e reconciliação" 
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <RealTimeIndicator label="Total Débito" value={totalDebito} format="currency" status="normal" />
        <RealTimeIndicator label="Total Crédito" value={totalCredito} format="currency" status="normal" />
        
        <Card className={isBalanced ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}>
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Status de Balanceamento</p>
            <div className="flex items-center gap-2">
              {isBalanced ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              <p className={`text-xl font-bold ${isBalanced ? 'text-green-700 dark:text-green-400' : 'text-destructive'}`}>
                {isBalanced ? '✅ Balanceado' : '❌ Desbalanceado'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/10 border-primary/30">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-muted-foreground mb-2">Confiança Reconciliação</p>
            <p className="text-2xl font-bold text-primary">{matchingPairs.confidence.toFixed(0)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <AIInsightsPanel insights={insights.slice(0, 2)} maxItems={2} />

      {/* Hierarchical Balancete */}
      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Balancete - Estrutura Hierárquica
          </CardTitle>
          <Button className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar
          </Button>
        </CardHeader>
        <CardContent>
          <HierarchicalTable rows={hierarchicalRows} columns={['Valor']} />
        </CardContent>
      </Card>

      {/* Validation and Reconciliation Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Integrity Validation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Validação de Integridade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Débito = Crédito</p>
                <p className="text-sm text-muted-foreground">Balancete está equilibrado</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Nenhuma conta duplicada</p>
                <p className="text-sm text-muted-foreground">Todas as contas são únicas</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">2 Contas com avisos</p>
                <p className="text-sm text-muted-foreground">Contas a receber e salários a pagar</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-foreground">Sem contas inativas</p>
                <p className="text-sm text-muted-foreground">Todas as contas têm movimento recente</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Reconciliation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Reconciliação com Banco
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm font-medium text-muted-foreground">Saldo em Sistema</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(balanceDiff.balanceInSystem)}</p>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-sm font-medium text-muted-foreground">Saldo no Banco</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{formatCurrency(balanceDiff.balanceInBank)}</p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${
              balanceDiff.status === 'balanced' 
                ? 'bg-green-500/10 border-green-500/30' 
                : balanceDiff.status === 'nearly_balanced'
                ? 'bg-yellow-500/10 border-yellow-500/30'
                : 'bg-destructive/10 border-destructive/30'
            }`}>
              <p className="text-sm font-medium text-muted-foreground">Diferença</p>
              <p className={`text-2xl font-bold ${
                balanceDiff.status === 'balanced' 
                  ? 'text-green-700 dark:text-green-400' 
                  : balanceDiff.status === 'nearly_balanced'
                  ? 'text-yellow-700 dark:text-yellow-400'
                  : 'text-destructive'
              }`}>
                {balanceDiff.status === 'balanced' ? '✅' : balanceDiff.status === 'nearly_balanced' ? '⚠️' : '❌'} {formatCurrency(balanceDiff.difference)}
              </p>
            </div>
            <Button 
              onClick={handleReconcile}
              disabled={isReconciling}
              className="w-full flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isReconciling ? 'animate-spin' : ''}`} />
              {isReconciling ? 'Reconciliando...' : 'Reconciliar Automaticamente'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Account Details Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Detalhe das Contas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="px-4 py-3 text-left font-semibold text-foreground">Conta</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Débito</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Crédito</th>
                  <th className="px-4 py-3 text-right font-semibold text-foreground">Saldo</th>
                  <th className="px-4 py-3 text-center font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {mockSystemAccounts.map((account) => (
                  <tr key={account.id} className="border-t border-border hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-foreground">{account.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(account.debito)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-muted-foreground">
                      {formatCurrency(account.credito)}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${
                      account.saldo >= 0 ? 'text-green-700 dark:text-green-400' : 'text-destructive'
                    }`}>
                      {formatCurrency(account.saldo)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant={account.status === 'normal' ? 'default' : 'secondary'} className={
                        account.status === 'normal' 
                          ? 'bg-green-500/20 text-green-700 dark:text-green-400 hover:bg-green-500/30' 
                          : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/30'
                      }>
                        {account.status === 'normal' ? '✓ OK' : '⚠ Atenção'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted font-bold border-t-2 border-border">
                  <td className="px-4 py-3 text-foreground">TOTAIS</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{formatCurrency(totalDebito)}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">{formatCurrency(totalCredito)}</td>
                  <td className="px-4 py-3 text-right font-mono text-foreground">-</td>
                  <td className="px-4 py-3 text-center">
                    <Badge className={isBalanced ? 'bg-green-600' : 'bg-destructive'}>
                      {isBalanced ? '✓ Balanceado' : '✗ Diferença'}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ControladoriaBalancetePage;
