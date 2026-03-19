import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, TrendingUp, TrendingDown, Users, DollarSign, 
  Clock, AlertTriangle, Target, Brain, Sparkles, ArrowUp, ArrowDown,
  RefreshCw
} from 'lucide-react';
import { useHCMKpis, usePeopleAnalytics } from '@/hooks/hcm/useHCMKpis';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PeopleAnalytics() {
  const { 
    hcmKpis, hcmKpisLoading, 
    employees, 
    analytics 
  } = useHCM();

  // Mock data for charts (in real implementation, this comes from analytics snapshots)
  const headcountTrend = [
    { month: 'Jul', count: 42 },
    { month: 'Ago', count: 45 },
    { month: 'Set', count: 44 },
    { month: 'Out', count: 48 },
    { month: 'Nov', count: 52 },
    { month: 'Dez', count: 55 },
    { month: 'Jan', count: employees.length || 58 },
  ];

  const turnoverTrend = [
    { month: 'Jul', rate: 2.1 },
    { month: 'Ago', rate: 1.8 },
    { month: 'Set', rate: 2.5 },
    { month: 'Out', rate: 1.2 },
    { month: 'Nov', rate: 1.9 },
    { month: 'Dez', rate: 2.3 },
    { month: 'Jan', rate: hcmKpis?.turnoverRate || 1.5 },
  ];

  // Calculate department distribution
  const departmentData = employees.reduce((acc, emp) => {
    const dept = emp.departamento?.nome || 'Sem Departamento';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const departmentChartData = Object.entries(departmentData)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  // Contract type distribution
  const contractData = employees.reduce((acc, emp) => {
    const type = emp.contract_type.toUpperCase();
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const contractChartData = Object.entries(contractData).map(([name, value]) => ({ name, value }));

  // AI Insights
  const aiInsights = [
    {
      type: 'warning',
      title: 'Risco de Turnover',
      description: 'Departamento de Vendas apresenta taxa de saída 40% acima da média.',
      action: 'Revisar política de comissões',
      icon: AlertTriangle,
    },
    {
      type: 'success',
      title: 'Boa Performance',
      description: 'Custo de folha representa 18% do faturamento, abaixo da meta de 22%.',
      action: 'Manter estratégia atual',
      icon: TrendingUp,
    },
    {
      type: 'info',
      title: 'Oportunidade',
      description: '12 colaboradores completam 2 anos de empresa no próximo mês.',
      action: 'Planejar promoções',
      icon: Users,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              People Analytics
              <Badge variant="outline" className="ml-2">
                <Brain className="h-3 w-3 mr-1" />
                IA Preditiva
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Métricas em tempo real e insights estratégicos de RH
            </p>
          </div>
        </div>

        {/* Main KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Headcount</p>
                  {hcmKpisLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{hcmKpis?.totalColaboradores || 0}</p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-success">
                    <ArrowUp className="h-3 w-3" />
                    <span>+{hcmKpis?.contratacoesMes || 0} este mês</span>
                  </div>
                </div>
                <Users className="h-10 w-10 text-primary/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Turnover</p>
                  {hcmKpisLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{hcmKpis?.turnoverRate || 0}%</p>
                  )}
                  <div className="flex items-center gap-1 text-sm text-destructive">
                    <ArrowDown className="h-3 w-3" />
                    <span>{hcmKpis?.desligamentosMes || 0} saídas</span>
                  </div>
                </div>
                <TrendingDown className="h-10 w-10 text-destructive/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Custo Folha</p>
                  {hcmKpisLoading ? (
                    <Skeleton className="h-8 w-20" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {formatCurrency(hcmKpis?.totalFolhaBase || 0)}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Base mensal</p>
                </div>
                <DollarSign className="h-10 w-10 text-success/30" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Horas Extras</p>
                  {hcmKpisLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold">{hcmKpis?.totalHorasExtras?.toFixed(0) || 0}h</p>
                  )}
                  <p className="text-sm text-muted-foreground">No mês atual</p>
                </div>
                <Clock className="h-10 w-10 text-warning/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights */}
        <Card className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Insights da IA
            </CardTitle>
            <CardDescription>
              Análise preditiva baseada nos dados de RH
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {aiInsights.map((insight, i) => (
                <Card key={i} className="bg-background">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${
                        insight.type === 'warning' ? 'bg-warning/10' :
                        insight.type === 'success' ? 'bg-success/10' : 'bg-info/10'
                      }`}>
                        <insight.icon className={`h-5 w-5 ${
                          insight.type === 'warning' ? 'text-warning' :
                          insight.type === 'success' ? 'text-success' : 'text-info'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {insight.action}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Headcount Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evolução do Headcount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={headcountTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Turnover Trend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Taxa de Turnover (%)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={turnoverTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        borderColor: 'hsl(var(--border))'
                      }}
                    />
                    <Bar 
                      dataKey="rate" 
                      fill="hsl(var(--destructive))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* By Department */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Distribuição por Departamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={departmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {departmentChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* By Contract Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tipos de Contrato</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {contractChartData.map((item, i) => {
                  const percentage = employees.length > 0 
                    ? Math.round((item.value / employees.length) * 100) 
                    : 0;
                  return (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{item.name}</span>
                        <span>{item.value} ({percentage}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
                {contractChartData.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    Sem dados para exibir
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cost Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5" />
              Análise de Custos
            </CardTitle>
            <CardDescription>
              Headcount Cost vs Faturamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Meta Custo/Receita</p>
                <p className="text-4xl font-bold text-primary mt-2">22%</p>
                <p className="text-sm text-muted-foreground mt-1">Máximo definido</p>
              </div>
              <div className="text-center p-6 bg-success/5 rounded-lg border border-success/20">
                <p className="text-sm text-muted-foreground">Custo Atual</p>
                <p className="text-4xl font-bold text-success mt-2">18%</p>
                <p className="text-sm text-success mt-1">4% abaixo da meta ✓</p>
              </div>
              <div className="text-center p-6 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">Projeção Próximo Mês</p>
                <p className="text-4xl font-bold mt-2">19%</p>
                <p className="text-sm text-muted-foreground mt-1">
                  +2 contratações previstas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Absenteeism */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Absenteísmo</CardTitle>
              <CardDescription>Faltas e atestados do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Taxa de Absenteísmo</span>
                  <Badge variant="outline" className="bg-warning/10 text-warning">
                    2.3%
                  </Badge>
                </div>
                <Progress value={23} className="h-2" />
                <div className="grid grid-cols-3 gap-4 text-center pt-4">
                  <div>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-muted-foreground">Faltas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">8</p>
                    <p className="text-xs text-muted-foreground">Atestados</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">4</p>
                    <p className="text-xs text-muted-foreground">Licenças</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tempo Médio de Casa</CardTitle>
              <CardDescription>Análise de retenção</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-4">
                  <p className="text-4xl font-bold text-primary">2.4</p>
                  <p className="text-sm text-muted-foreground">anos em média</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium">Menos de 1 ano</p>
                    <p className="text-muted-foreground">35% do time</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="font-medium">Mais de 5 anos</p>
                    <p className="text-muted-foreground">12% do time</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
