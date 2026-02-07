import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Lightbulb, 
  AlertTriangle, 
  TrendingUp, 
  Brain, 
  Check, 
  X, 
  Clock,
  Sparkles,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface AIInsight {
  id: string;
  insight_type: string;
  severity: string;
  title: string;
  description: string;
  data_json: Record<string, unknown>;
  z_score: number | null;
  confidence_score: number | null;
  suggested_action: string | null;
  action_taken: boolean;
  is_dismissed: boolean;
  created_at: string;
}

const insightTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  anomaly: { icon: AlertTriangle, color: 'text-red-500', label: 'Anomalia' },
  suggestion: { icon: Lightbulb, color: 'text-amber-500', label: 'Sugestão' },
  pattern: { icon: Activity, color: 'text-blue-500', label: 'Padrão' },
  forecast: { icon: TrendingUp, color: 'text-green-500', label: 'Previsão' },
  alert: { icon: Zap, color: 'text-purple-500', label: 'Alerta' },
};

const severityConfig: Record<string, { bg: string; text: string }> = {
  info: { bg: 'bg-blue-100', text: 'text-blue-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  critical: { bg: 'bg-red-100', text: 'text-red-700' },
};

export default function IntelligenceFeed() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights', currentCompany?.id, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('ai_insights')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .eq('is_dismissed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (activeTab !== 'all') {
        query = query.eq('insight_type', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AIInsight[];
    },
    enabled: !!currentCompany?.id,
  });

  const dismissMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('ai_insights')
        .update({ is_dismissed: true, dismissed_at: new Date().toISOString() })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success('Insight arquivado');
    },
  });

  const actionMutation = useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('ai_insights')
        .update({ action_taken: true, action_taken_at: new Date().toISOString() })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast.success('Ação marcada como executada');
    },
  });

  const stats = {
    total: insights?.length || 0,
    anomalies: insights?.filter(i => i.insight_type === 'anomaly').length || 0,
    suggestions: insights?.filter(i => i.insight_type === 'suggestion').length || 0,
    critical: insights?.filter(i => i.severity === 'critical').length || 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-violet-500" />
            Feed de Inteligência
          </h1>
          <p className="text-muted-foreground mt-1">
            Insights proativos e sugestões da IA para otimizar sua gestão financeira
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Sparkles className="h-4 w-4 mr-2" />
          {stats.total} insights ativos
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Ativos</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Brain className="h-8 w-8 text-violet-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Anomalias</p>
                <p className="text-2xl font-bold">{stats.anomalies}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Sugestões</p>
                <p className="text-2xl font-bold">{stats.suggestions}</p>
              </div>
              <Lightbulb className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Críticos</p>
                <p className="text-2xl font-bold">{stats.critical}</p>
              </div>
              <Target className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Feed */}
      <Card>
        <CardHeader className="pb-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="anomaly">Anomalias</TabsTrigger>
              <TabsTrigger value="suggestion">Sugestões</TabsTrigger>
              <TabsTrigger value="pattern">Padrões</TabsTrigger>
              <TabsTrigger value="forecast">Previsões</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : insights?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-30" />
                <p>Nenhum insight ativo no momento</p>
                <p className="text-sm">A IA está monitorando suas finanças</p>
              </div>
            ) : (
              <div className="space-y-4">
                {insights?.map((insight) => {
                  const typeConfig = insightTypeConfig[insight.insight_type] || insightTypeConfig.alert;
                  const sevConfig = severityConfig[insight.severity] || severityConfig.info;
                  const TypeIcon = typeConfig.icon;

                  return (
                    <Card key={insight.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${insight.severity === 'critical' ? 'bg-red-500' : insight.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <CardContent className="p-4 pl-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={`p-2 rounded-full ${sevConfig.bg}`}>
                              <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold truncate">{insight.title}</h4>
                                <Badge variant="outline" className={`text-xs ${sevConfig.text}`}>
                                  {typeConfig.label}
                                </Badge>
                                {insight.z_score && insight.z_score > 3 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Z-Score: {insight.z_score.toFixed(1)}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                {insight.description}
                              </p>
                              {insight.suggested_action && (
                                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                                  <span className="font-medium">💡 Ação sugerida: </span>
                                  {insight.suggested_action}
                                </div>
                              )}
                              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(insight.created_at), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </span>
                                {insight.confidence_score && (
                                  <span>Confiança: {insight.confidence_score.toFixed(0)}%</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => actionMutation.mutate(insight.id)}
                              disabled={insight.action_taken}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="h-4 w-4 mr-1" />
                              {insight.action_taken ? 'Feito' : 'Executar'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissMutation.mutate(insight.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
