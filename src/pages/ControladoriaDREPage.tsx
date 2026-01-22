import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { AIInsightsPanel } from '@/components/controladoria/AIInsightsPanel';
import { RealTimeIndicator } from '@/components/controladoria/RealTimeIndicator';
import { useAIAnalysis } from '@/hooks/useAIAnalysis';
import { useRealTimeInsights } from '@/hooks/useRealTimeInsights';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Target, BarChart3, Lightbulb, LineChart } from 'lucide-react';

export const ControladoriaDREPage: React.FC = () => {
  const indices = useAIAnalysis([]).calculateIndices(1500000, 330000, 420000, 500000, 200000, 100000);

  const financialData = {
    caixaLevel: 350000,
    indices: indices,
    passivoVariation: { percentVariation: 5 },
    diasAtrasados: 8,
  };

  const insights = useRealTimeInsights(financialData).generateInsights();

  // DRE Calculations
  const receitas = 500000;
  const devolvidas = 5000;
  const descontos = 10000;
  const receitaLiquida = receitas - devolvidas - descontos;
  const custos = 200000;
  const lucroBruto = receitaLiquida - custos;
  const despesasOp = 100000;
  const lucroOp = lucroBruto - despesasOp;
  const juros = 15000;
  const ebt = lucroOp - juros;
  const ir = ebt * 0.27;
  const lucroLiquido = ebt - ir;

  // Margin calculations
  const marginBruta = (lucroBruto / receitaLiquida * 100).toFixed(1);
  const marginOp = (lucroOp / receitaLiquida * 100).toFixed(1);
  const marginLiquida = (lucroLiquido / receitaLiquida * 100).toFixed(1);

  const formatCurrency = (value: number) => `R$ ${value.toLocaleString('pt-BR')}`;

  return (
    <MainLayout>
      <PageHeader 
        title="📈 Demonstração de Resultado (DRE)" 
        description="Análise de receitas, despesas e variações com insights da IA" 
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <RealTimeIndicator label="Receita Bruta" value={receitas} format="currency" status="normal" trend="up" change={8.5} />
        <RealTimeIndicator label="Lucro Bruto" value={lucroBruto} format="currency" status="normal" trend="up" change={12.3} />
        <RealTimeIndicator label="Lucro Operacional" value={lucroOp} format="currency" status="normal" trend="up" change={15.6} />
        <RealTimeIndicator label="Lucro Líquido" value={lucroLiquido} format="currency" status="normal" trend="up" change={10.2} />
      </div>

      {/* AI Insights */}
      <AIInsightsPanel insights={insights.slice(0, 3)} maxItems={3} />

      {/* DRE Cascade Structure */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Demonstração de Resultado - Estrutura em Cascata
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Receita Bruta */}
            <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border-l-4 border-green-600">
              <span className="font-semibold text-foreground">Receita Bruta</span>
              <span className="font-bold text-lg text-green-700 dark:text-green-400">{formatCurrency(receitas)}</span>
            </div>

            {/* Deductions */}
            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg text-destructive ml-6">
              <span className="text-sm">- Devoluções</span>
              <span className="font-semibold">-{formatCurrency(devolvidas)}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg text-destructive ml-6">
              <span className="text-sm">- Descontos Comerciais</span>
              <span className="font-semibold">-{formatCurrency(descontos)}</span>
            </div>

            {/* Receita Líquida */}
            <div className="border-t-2 border-border pt-2">
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded-lg font-semibold border-l-4 border-primary">
                <span className="text-foreground">=== Receita Líquida ===</span>
                <span className="text-primary">{formatCurrency(receitaLiquida)}</span>
              </div>
            </div>

            {/* COGS */}
            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg text-destructive ml-6">
              <span className="text-sm">- Custos (COGS)</span>
              <span className="font-semibold">-{formatCurrency(custos)}</span>
            </div>

            {/* Lucro Bruto */}
            <div className="border-t-2 border-border pt-2">
              <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg font-semibold border-l-4 border-yellow-600">
                <span className="text-foreground">=== Lucro Bruto ===</span>
                <span className="text-yellow-700 dark:text-yellow-400">{formatCurrency(lucroBruto)} ({marginBruta}%)</span>
              </div>
            </div>

            {/* Despesas Operacionais */}
            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg text-destructive ml-6">
              <span className="text-sm">- Despesas Operacionais</span>
              <span className="font-semibold">-{formatCurrency(despesasOp)}</span>
            </div>

            {/* EBIT */}
            <div className="border-t-2 border-border pt-2">
              <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg font-semibold border-l-4 border-purple-600">
                <span className="text-foreground">=== EBIT (Lucro Operacional) ===</span>
                <span className="text-purple-700 dark:text-purple-400">{formatCurrency(lucroOp)} ({marginOp}%)</span>
              </div>
            </div>

            {/* Juros */}
            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg text-destructive ml-6">
              <span className="text-sm">- Despesas com Juros</span>
              <span className="font-semibold">-{formatCurrency(juros)}</span>
            </div>

            {/* EBT */}
            <div className="border-t-2 border-border pt-2">
              <div className="flex justify-between items-center p-3 bg-indigo-500/10 rounded-lg font-semibold border-l-4 border-indigo-600">
                <span className="text-foreground">=== EBT (Antes do IR) ===</span>
                <span className="text-indigo-700 dark:text-indigo-400">{formatCurrency(ebt)}</span>
              </div>
            </div>

            {/* IR */}
            <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg text-destructive ml-6">
              <span className="text-sm">- Imposto de Renda (27%)</span>
              <span className="font-semibold">-{formatCurrency(Math.round(ir))}</span>
            </div>

            {/* Lucro Líquido */}
            <div className="border-t-2 border-green-500 pt-2">
              <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-lg font-bold border-l-4 border-green-600 text-lg">
                <span className="text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Lucro Líquido
                </span>
                <span className="text-green-700 dark:text-green-400">{formatCurrency(lucroLiquido)} ({marginLiquida}%)</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {/* Margens de Lucro */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Margens de Lucro
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-yellow-500/10 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Margem Bruta</p>
              <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{marginBruta}%</p>
              <p className="text-xs text-muted-foreground mt-1">Lucro Bruto / Receita Líquida</p>
            </div>
            <div className="bg-purple-500/10 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Margem Operacional</p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{marginOp}%</p>
              <p className="text-xs text-muted-foreground mt-1">EBIT / Receita Líquida</p>
            </div>
            <div className="bg-green-500/10 p-3 rounded-lg">
              <p className="text-sm text-muted-foreground">Margem Líquida</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">{marginLiquida}%</p>
              <p className="text-xs text-muted-foreground mt-1">Lucro Líquido / Receita Líquida</p>
            </div>
          </CardContent>
        </Card>

        {/* Análise de Custos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Análise de Custos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm text-muted-foreground">COGS</span>
              <span className="font-semibold">{((custos / receitaLiquida) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm text-muted-foreground">Despesas Operacionais</span>
              <span className="font-semibold">{((despesasOp / receitaLiquida) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm text-muted-foreground">Despesas Financeiras</span>
              <span className="font-semibold">{((juros / receitaLiquida) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-muted rounded">
              <span className="text-sm text-muted-foreground">Impostos</span>
              <span className="font-semibold">{((ir / receitaLiquida) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-green-500/10 rounded font-semibold">
              <span className="text-sm text-muted-foreground">Lucro Líquido</span>
              <span className="text-green-700 dark:text-green-400">{marginLiquida}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Recomendações da IA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Recomendações da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="p-2 bg-primary/10 rounded border-l-2 border-primary">
              <p className="font-medium text-primary">✓ Margem bruta saudável</p>
              <p className="text-xs text-muted-foreground mt-1">58,8% está acima da média do mercado</p>
            </div>
            <div className="p-2 bg-yellow-500/10 rounded border-l-2 border-yellow-500">
              <p className="font-medium text-yellow-700 dark:text-yellow-400">⚠ Despesas crescendo</p>
              <p className="text-xs text-muted-foreground mt-1">Despesas operacionais aumentaram 7% vs mês anterior</p>
            </div>
            <div className="p-2 bg-green-500/10 rounded border-l-2 border-green-500">
              <p className="font-medium text-green-700 dark:text-green-400">💡 Oportunidade</p>
              <p className="text-xs text-muted-foreground mt-1">Reduzir COGS em 3% geraria +R$ 6.000 em lucro</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trend Analysis */}
      <Card className="mt-6 bg-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <h4 className="font-semibold text-primary mb-2 flex items-center gap-2">
            <LineChart className="w-5 h-5" />
            Análise de Tendências
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            Comportamento dos últimos 12 meses mostra crescimento consistente da receita (+8.5% YoY) 
            com manutenção das margens operacionais. A projeção para o próximo trimestre indica 
            potencial de expansão de 12% no lucro líquido, considerando sazonalidade histórica.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-card rounded-lg">
              <p className="text-xs text-muted-foreground">Crescimento Receita</p>
              <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" /> +8.5%
              </p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <p className="text-xs text-muted-foreground">Variação Custos</p>
              <p className="text-lg font-bold text-yellow-600 flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" /> +3.2%
              </p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <p className="text-xs text-muted-foreground">Eficiência Operacional</p>
              <p className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" /> +5.3%
              </p>
            </div>
            <div className="text-center p-3 bg-card rounded-lg">
              <p className="text-xs text-muted-foreground">Projeção Lucro</p>
              <p className="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                <TrendingUp className="w-4 h-4" /> +12%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default ControladoriaDREPage;
