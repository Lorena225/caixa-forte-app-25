import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Brain, 
  TrendingUp, 
  DollarSign,
  RefreshCw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  MessageSquare
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Mock data para decisões da IA
const mockDecisoes = [
  {
    id: '1',
    tipo: 'baixa_automatica',
    titulo: 'Baixa automática sugerida',
    descricao: 'Pagamento identificado no extrato corresponde à fatura #INV-2024-0892',
    valor: 15420.00,
    confianca: 98,
    status: 'pendente',
    data: new Date(),
    detalhes: {
      origem: 'Extrato Bancário - Banco do Brasil',
      destino: 'Fatura #INV-2024-0892 - Cliente ABC Ltda',
      justificativa: 'Match exato de valor e data próxima ao vencimento'
    }
  },
  {
    id: '2',
    tipo: 'alerta_anomalia',
    titulo: 'Anomalia detectada em despesa',
    descricao: 'Despesa 47% acima da média histórica para categoria "Marketing"',
    valor: 28500.00,
    confianca: 85,
    status: 'pendente',
    data: new Date(Date.now() - 86400000),
    detalhes: {
      categoria: 'Marketing',
      media_historica: 19387.00,
      desvio: '+47%',
      justificativa: 'Comparação com média dos últimos 6 meses'
    }
  },
  {
    id: '3',
    tipo: 'previsao_fluxo',
    titulo: 'Previsão de déficit de caixa',
    descricao: 'Projeção indica possível déficit na próxima semana',
    valor: -45000.00,
    confianca: 72,
    status: 'aprovado',
    data: new Date(Date.now() - 172800000),
    detalhes: {
      periodo: 'Próximos 7 dias',
      receitas_previstas: 85000.00,
      despesas_previstas: 130000.00,
      justificativa: 'Baseado em contas a pagar agendadas e histórico de recebimentos'
    }
  },
  {
    id: '4',
    tipo: 'classificacao',
    titulo: 'Classificação automática sugerida',
    descricao: 'Despesa classificada como "Serviços de TI" com base no histórico',
    valor: 3200.00,
    confianca: 94,
    status: 'rejeitado',
    data: new Date(Date.now() - 259200000),
    detalhes: {
      fornecedor: 'TechSoft Solutions',
      categoria_sugerida: 'Serviços de TI',
      justificativa: 'Fornecedor historicamente classificado nesta categoria (15 transações)'
    }
  },
];

const statusConfig = {
  pendente: { label: 'Pendente', color: 'bg-warning/20 text-warning', icon: Clock },
  aprovado: { label: 'Aprovado', color: 'bg-success/20 text-success', icon: CheckCircle2 },
  rejeitado: { label: 'Rejeitado', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

const tipoConfig = {
  baixa_automatica: { label: 'Baixa Automática', icon: RefreshCw, color: 'text-primary' },
  alerta_anomalia: { label: 'Alerta de Anomalia', icon: AlertTriangle, color: 'text-warning' },
  previsao_fluxo: { label: 'Previsão de Fluxo', icon: TrendingUp, color: 'text-accent-foreground' },
  classificacao: { label: 'Classificação', icon: Brain, color: 'text-primary' },
};

export default function Decisoes() {
  const pendentes = mockDecisoes.filter(d => d.status === 'pendente');
  const aprovados = mockDecisoes.filter(d => d.status === 'aprovado');
  const rejeitados = mockDecisoes.filter(d => d.status === 'rejeitado');

  const renderDecisao = (decisao: typeof mockDecisoes[0]) => {
    const status = statusConfig[decisao.status as keyof typeof statusConfig];
    const tipo = tipoConfig[decisao.tipo as keyof typeof tipoConfig];
    const StatusIcon = status.icon;
    const TipoIcon = tipo.icon;

    return (
      <Card key={decisao.id} className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 flex-1">
              <div className={`p-2 rounded-lg bg-muted ${tipo.color}`}>
                <TipoIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-foreground">{decisao.titulo}</h4>
                  <Badge variant="outline" className="text-xs">
                    {tipo.label}
                  </Badge>
                  <Badge className={`text-xs ${status.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {decisao.descricao}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    {formatCurrency(Math.abs(decisao.valor))}
                  </span>
                  <span className="flex items-center gap-1">
                    <Brain className="h-3 w-3" />
                    {decisao.confianca}% confiança
                  </span>
                  <span>
                    {format(decisao.data, "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
              </div>
            </div>

            {decisao.status === 'pendente' && (
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="outline" className="gap-1">
                  <Eye className="h-4 w-4" />
                  Detalhes
                </Button>
                <Button size="sm" variant="default" className="gap-1 bg-success hover:bg-success/90">
                  <ThumbsUp className="h-4 w-4" />
                  Aprovar
                </Button>
                <Button size="sm" variant="destructive" className="gap-1">
                  <ThumbsDown className="h-4 w-4" />
                  Rejeitar
                </Button>
              </div>
            )}

            {decisao.status !== 'pendente' && (
              <Button size="sm" variant="ghost" className="gap-1">
                <Eye className="h-4 w-4" />
                Ver
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Decisões da IA"
          description="Revise e aprove as decisões sugeridas pelo assistente inteligente"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/20">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendentes.length}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/20">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{aprovados.length}</p>
                <p className="text-xs text-muted-foreground">Aprovadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/20">
                <XCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{rejeitados.length}</p>
                <p className="text-xs text-muted-foreground">Rejeitadas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/20">
                <Brain className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">89%</p>
                <p className="text-xs text-muted-foreground">Taxa de Acerto</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs com decisões */}
        <Tabs defaultValue="pendentes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pendentes" className="gap-2">
              <Clock className="h-4 w-4" />
              Pendentes ({pendentes.length})
            </TabsTrigger>
            <TabsTrigger value="aprovadas" className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Aprovadas ({aprovados.length})
            </TabsTrigger>
            <TabsTrigger value="rejeitadas" className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejeitadas ({rejeitados.length})
            </TabsTrigger>
            <TabsTrigger value="todas" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Todas ({mockDecisoes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-3">
            {pendentes.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
                  <h3 className="font-semibold text-lg">Tudo em dia!</h3>
                  <p className="text-muted-foreground">Não há decisões pendentes de revisão.</p>
                </CardContent>
              </Card>
            ) : (
              pendentes.map(renderDecisao)
            )}
          </TabsContent>

          <TabsContent value="aprovadas" className="space-y-3">
            {aprovados.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma decisão aprovada ainda.
                </CardContent>
              </Card>
            ) : (
              aprovados.map(renderDecisao)
            )}
          </TabsContent>

          <TabsContent value="rejeitadas" className="space-y-3">
            {rejeitados.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  Nenhuma decisão rejeitada.
                </CardContent>
              </Card>
            ) : (
              rejeitados.map(renderDecisao)
            )}
          </TabsContent>

          <TabsContent value="todas" className="space-y-3">
            {mockDecisoes.map(renderDecisao)}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
