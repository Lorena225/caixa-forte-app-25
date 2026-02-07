import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Brain, 
  Search,
  Filter,
  Clock,
  MessageSquare,
  Image as ImageIcon,
  Mic,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Zap,
  Target,
  RefreshCw,
  Eye
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface DecisionLog {
  id: string;
  decision_type: string;
  input_type: string;
  input_summary: string | null;
  extracted_data: Record<string, unknown> | null;
  reasoning: string;
  confidence_score: number | null;
  rules_applied: string[] | null;
  final_action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  phone_number: string | null;
  was_confirmed: boolean;
  confirmed_at: string | null;
  overridden: boolean;
  override_reason: string | null;
  created_at: string;
}

const inputTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  text: { icon: MessageSquare, color: 'text-blue-500', label: 'Texto' },
  image: { icon: ImageIcon, color: 'text-amber-500', label: 'Imagem' },
  audio: { icon: Mic, color: 'text-purple-500', label: 'Áudio' },
  auto: { icon: Zap, color: 'text-green-500', label: 'Automático' },
};

const decisionTypeConfig: Record<string, { label: string; color: string }> = {
  categorization: { label: 'Categorização', color: 'bg-blue-100 text-blue-700' },
  ocr: { label: 'OCR', color: 'bg-amber-100 text-amber-700' },
  voice_intent: { label: 'Intenção de Voz', color: 'bg-purple-100 text-purple-700' },
  anomaly: { label: 'Anomalia', color: 'bg-red-100 text-red-700' },
};

export default function AIDecisionLogsPage() {
  const { currentCompany } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ['ai-decision-logs', currentCompany?.id, activeTab],
    queryFn: async () => {
      let query = supabase
        .from('ai_decision_logs')
        .select('*')
        .eq('company_id', currentCompany?.id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (activeTab !== 'all') {
        query = query.eq('decision_type', activeTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as DecisionLog[];
    },
    enabled: !!currentCompany?.id,
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      log.reasoning.toLowerCase().includes(search) ||
      log.input_summary?.toLowerCase().includes(search) ||
      log.final_action?.toLowerCase().includes(search)
    );
  });

  const stats = {
    total: logs?.length || 0,
    confirmed: logs?.filter(l => l.was_confirmed).length || 0,
    overridden: logs?.filter(l => l.overridden).length || 0,
    avgConfidence: logs?.length 
      ? (logs.reduce((acc, l) => acc + (l.confidence_score || 0), 0) / logs.length).toFixed(0)
      : 0,
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="h-8 w-8 text-violet-500" />
            Log de Decisões da IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Auditoria completa: entenda por que a IA tomou cada decisão
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          <Target className="h-4 w-4 mr-2" />
          {stats.avgConfidence}% confiança média
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Decisões</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Brain className="h-8 w-8 text-violet-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Confirmadas</p>
                <p className="text-2xl font-bold">{stats.confirmed}</p>
              </div>
              <Check className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Corrigidas</p>
                <p className="text-2xl font-bold">{stats.overridden}</p>
              </div>
              <RefreshCw className="h-8 w-8 text-amber-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Acerto</p>
                <p className="text-2xl font-bold">
                  {stats.total > 0 
                    ? ((stats.confirmed / stats.total) * 100).toFixed(0)
                    : 0}%
                </p>
              </div>
              <Target className="h-8 w-8 text-blue-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por raciocínio, entrada ou ação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="categorization">Categorização</TabsTrigger>
                <TabsTrigger value="ocr">OCR</TabsTrigger>
                <TabsTrigger value="voice_intent">Voz</TabsTrigger>
                <TabsTrigger value="anomaly">Anomalia</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Decisões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {isLoading ? (
              <div className="flex items-center justify-center h-40">
                <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                <Brain className="h-12 w-12 mb-4 opacity-30" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs?.map((log) => {
                  const inputConfig = inputTypeConfig[log.input_type] || inputTypeConfig.auto;
                  const decisionConfig = decisionTypeConfig[log.decision_type] || { label: log.decision_type, color: 'bg-gray-100 text-gray-700' };
                  const InputIcon = inputConfig.icon;
                  const isExpanded = expandedId === log.id;

                  return (
                    <Card 
                      key={log.id} 
                      className={cn(
                        "relative overflow-hidden transition-all cursor-pointer hover:shadow-md",
                        isExpanded && "ring-2 ring-primary"
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <div className={cn(
                        "absolute left-0 top-0 bottom-0 w-1",
                        log.was_confirmed ? "bg-green-500" : log.overridden ? "bg-amber-500" : "bg-blue-500"
                      )} />
                      <CardContent className="p-4 pl-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className={cn("p-2 rounded-full bg-muted")}>
                              <InputIcon className={cn("h-5 w-5", inputConfig.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge className={cn("text-xs", decisionConfig.color)}>
                                  {decisionConfig.label}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {inputConfig.label}
                                </Badge>
                                {log.confidence_score && (
                                  <Badge variant="secondary" className="text-xs">
                                    {log.confidence_score.toFixed(0)}% confiança
                                  </Badge>
                                )}
                                {log.was_confirmed && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    <Check className="h-3 w-3 mr-1" />
                                    Confirmada
                                  </Badge>
                                )}
                                {log.overridden && (
                                  <Badge variant="default" className="text-xs bg-amber-500">
                                    <RefreshCw className="h-3 w-3 mr-1" />
                                    Corrigida
                                  </Badge>
                                )}
                              </div>
                              
                              <p className="text-sm font-medium mb-1">
                                {log.input_summary || 'Entrada automática'}
                              </p>
                              
                              <p className="text-sm text-muted-foreground">
                                <span className="font-medium">Raciocínio:</span> {log.reasoning}
                              </p>

                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(log.created_at), { 
                                    addSuffix: true, 
                                    locale: ptBR 
                                  })}
                                </span>
                                {log.phone_number && (
                                  <span className="flex items-center gap-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {log.phone_number}
                                  </span>
                                )}
                                {log.final_action && (
                                  <span className="flex items-center gap-1">
                                    <Zap className="h-3 w-3" />
                                    {log.final_action}
                                  </span>
                                )}
                              </div>

                              {/* Expanded Details */}
                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t space-y-4">
                                  {log.extracted_data && (
                                    <div>
                                      <Label className="text-xs font-medium text-muted-foreground">DADOS EXTRAÍDOS:</Label>
                                      <pre className="mt-1 p-3 rounded-lg bg-muted text-xs overflow-x-auto">
                                        {JSON.stringify(log.extracted_data, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {log.rules_applied && log.rules_applied.length > 0 && (
                                    <div>
                                      <Label className="text-xs font-medium text-muted-foreground">REGRAS APLICADAS:</Label>
                                      <div className="mt-1 flex flex-wrap gap-2">
                                        {(log.rules_applied as string[]).map((rule, i) => (
                                          <Badge key={i} variant="outline" className="text-xs">
                                            {rule}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {log.override_reason && (
                                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                      <Label className="text-xs font-medium text-amber-700">MOTIVO DA CORREÇÃO:</Label>
                                      <p className="mt-1 text-sm text-amber-800">{log.override_reason}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                      <Label className="text-muted-foreground">ID da Entidade:</Label>
                                      <p className="font-mono">{log.entity_id || '-'}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Tipo:</Label>
                                      <p>{log.entity_type || '-'}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Criado em:</Label>
                                      <p>{format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    </div>
                                    {log.confirmed_at && (
                                      <div>
                                        <Label className="text-muted-foreground">Confirmado em:</Label>
                                        <p>{format(new Date(log.confirmed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
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

// Label component for consistency
function Label({ className, children, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("text-sm font-medium", className)} {...props}>
      {children}
    </span>
  );
}
