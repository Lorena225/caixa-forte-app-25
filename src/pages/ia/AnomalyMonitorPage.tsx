import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  Shield,
  Activity,
  TrendingUp,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine
} from 'recharts';

interface AnomalyInsight {
  id: string;
  title: string;
  description: string;
  severity: string;
  z_score: number | null;
  confidence_score: number | null;
  data_json: {
    transaction_id?: string;
    amount?: number;
    category_id?: string;
    threshold?: number;
  };
  action_taken: boolean;
  created_at: string;
}

export default function AnomalyMonitorPage() {
  const { currentCompany } = useAuth();
  const [activeTab, setActiveTab] = useState('realtime');

  // Fetch anomalies
  const { data: anomalies, isLoading, refetch } = useQuery({
    queryKey: ['anomalies', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_insights')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .eq('insight_type', 'anomaly')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as AnomalyInsight[];
    },
    enabled: !!currentCompany?.id,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  // Fetch transaction stats for chart
  const { data: transactionStats } = useQuery({
    queryKey: ['transaction-stats', currentCompany?.id],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('transactions')
        .select('total_amount, transaction_date, category_id')
        .eq('company_id', currentCompany?.id)
        .gte('transaction_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('transaction_date', { ascending: true });

      if (error) throw error;
      
      // Group by date and calculate stats
      const grouped = (data || []).reduce((acc: Record<string, { total: number; count: number; max: number }>, t) => {
        const date = t.transaction_date;
        if (!acc[date]) {
          acc[date] = { total: 0, count: 0, max: 0 };
        }
        const absAmount = Math.abs(t.total_amount || 0);
        acc[date].total += absAmount;
        acc[date].count += 1;
        acc[date].max = Math.max(acc[date].max, absAmount);
        return acc;
      }, {});

      return Object.entries(grouped).map(([date, stats]) => ({
        date,
        total: stats.total,
        average: stats.total / stats.count,
        max: stats.max,
        count: stats.count
      }));
    },
    enabled: !!currentCompany?.id,
  });

  // Calculate stats
  const stats = {
    total: anomalies?.length || 0,
    critical: anomalies?.filter(a => a.severity === 'critical').length || 0,
    warning: anomalies?.filter(a => a.severity === 'warning').length || 0,
    resolved: anomalies?.filter(a => a.action_taken).length || 0,
    pending: anomalies?.filter(a => !a.action_taken).length || 0,
  };

  const healthScore = stats.total === 0 ? 100 : Math.max(0, 100 - (stats.critical * 20) - (stats.warning * 5));

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-500" />
            Monitor de Anomalias
          </h1>
          <p className="text-muted-foreground mt-1">
            Detecção em tempo real de padrões atípicos nas transações financeiras
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Health Score and Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="md:col-span-2 border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">Score de Saúde</p>
                <p className="text-4xl font-bold">{healthScore}%</p>
              </div>
              <div className={`p-4 rounded-full ${healthScore >= 80 ? 'bg-green-100' : healthScore >= 50 ? 'bg-amber-100' : 'bg-red-100'}`}>
                {healthScore >= 80 ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : healthScore >= 50 ? (
                  <AlertTriangle className="h-8 w-8 text-amber-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
            </div>
            <Progress 
              value={healthScore} 
              className={`h-2 ${healthScore >= 80 ? '[&>div]:bg-green-500' : healthScore >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {healthScore >= 80 ? 'Sistema operando normalmente' : 
               healthScore >= 50 ? 'Atenção: anomalias detectadas' : 
               'Crítico: múltiplas anomalias requerem ação'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="text-2xl font-bold">{stats.critical}</p>
            <p className="text-sm text-muted-foreground">Críticas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="text-2xl font-bold">{stats.warning}</p>
            <p className="text-sm text-muted-foreground">Alertas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{stats.pending}</p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Tempo Real
          </TabsTrigger>
          <TabsTrigger value="chart" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Gráfico de Padrões
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Realtime Tab */}
        <TabsContent value="realtime">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-green-500" />
                Detecções em Tempo Real
                <Badge variant="outline" className="ml-2 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-green-500 mr-2 inline-block" />
                  Monitorando
                </Badge>
              </CardTitle>
              <CardDescription>
                Anomalias detectadas automaticamente pelo sistema de Z-Score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : anomalies?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                    <p className="font-medium">Nenhuma anomalia detectada</p>
                    <p className="text-sm">O sistema está monitorando suas transações</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {anomalies?.filter(a => !a.action_taken).slice(0, 20).map((anomaly) => (
                      <Card 
                        key={anomaly.id} 
                        className={`border-l-4 ${
                          anomaly.severity === 'critical' ? 'border-l-red-500 bg-red-50/50' :
                          anomaly.severity === 'warning' ? 'border-l-amber-500 bg-amber-50/50' :
                          'border-l-blue-500 bg-blue-50/50'
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                                anomaly.severity === 'critical' ? 'text-red-500' :
                                anomaly.severity === 'warning' ? 'text-amber-500' :
                                'text-blue-500'
                              }`} />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{anomaly.title}</h4>
                                  <Badge variant={anomaly.severity === 'critical' ? 'destructive' : 'secondary'}>
                                    {anomaly.severity}
                                  </Badge>
                                  {anomaly.z_score && (
                                    <Badge variant="outline">
                                      Z-Score: {anomaly.z_score.toFixed(2)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {anomaly.description}
                                </p>
                                {anomaly.data_json?.amount && (
                                  <p className="text-sm font-medium">
                                    Valor: R$ {Math.abs(anomaly.data_json.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground mt-2">
                                  <Clock className="h-3 w-3 inline mr-1" />
                                  {formatDistanceToNow(new Date(anomaly.created_at), { addSuffix: true, locale: ptBR })}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chart Tab */}
        <TabsContent value="chart">
          <Card>
            <CardHeader>
              <CardTitle>Padrão de Transações (30 dias)</CardTitle>
              <CardDescription>
                Visualize o comportamento financeiro e identifique desvios
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={transactionStats || []}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMax" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(v) => format(new Date(v), 'dd/MM')}
                      className="text-xs"
                    />
                    <YAxis 
                      tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                      className="text-xs"
                    />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                      labelFormatter={(label) => format(new Date(label), 'dd/MM/yyyy')}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#3b82f6" 
                      fillOpacity={1} 
                      fill="url(#colorTotal)"
                      name="Total"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="max" 
                      stroke="#ef4444" 
                      fillOpacity={1} 
                      fill="url(#colorMax)"
                      name="Máximo"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Anomalias</CardTitle>
              <CardDescription>
                Todas as anomalias detectadas, incluindo as resolvidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {anomalies?.map((anomaly) => (
                    <div 
                      key={anomaly.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        anomaly.action_taken ? 'bg-muted/50' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {anomaly.action_taken ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertTriangle className={`h-5 w-5 ${
                            anomaly.severity === 'critical' ? 'text-red-500' : 'text-amber-500'
                          }`} />
                        )}
                        <div>
                          <p className={`font-medium ${anomaly.action_taken ? 'text-muted-foreground line-through' : ''}`}>
                            {anomaly.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(anomaly.created_at), "dd/MM/yyyy 'às' HH:mm")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {anomaly.z_score && (
                          <Badge variant="outline">Z: {anomaly.z_score.toFixed(1)}</Badge>
                        )}
                        <Badge variant={anomaly.action_taken ? 'default' : 'secondary'}>
                          {anomaly.action_taken ? 'Resolvido' : 'Pendente'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
