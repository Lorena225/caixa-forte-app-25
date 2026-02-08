import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, DollarSign, Clock, Calendar, Gift, TrendingUp, 
  AlertTriangle, Cake, UserPlus, UserMinus, Briefcase, 
  Settings, FileText, BarChart3, Smartphone
} from 'lucide-react';
import { useHCM } from '@/hooks/useHCM';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';

export default function HCMIndex() {
  const navigate = useNavigate();
  const { hcmKpis, hcmKpisLoading, requests } = useHCM();

  const pendingRequests = requests?.filter(r => r.status === 'pendente') || [];

  const kpiCards = [
    {
      title: 'Colaboradores',
      value: hcmKpis?.totalColaboradores || 0,
      subtitle: `${hcmKpis?.ativos || 0} ativos`,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/hcm/colaboradores',
    },
    {
      title: 'Em Férias',
      value: hcmKpis?.emFerias || 0,
      icon: Calendar,
      color: 'text-success',
      bgColor: 'bg-success/10',
      href: '/hcm/colaboradores?status=ferias',
    },
    {
      title: 'Afastados',
      value: hcmKpis?.afastados || 0,
      icon: AlertTriangle,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      href: '/hcm/colaboradores?status=afastado',
    },
    {
      title: 'Aniversariantes',
      value: hcmKpis?.aniversariantes || 0,
      icon: Cake,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
      href: '/hcm/colaboradores',
    },
    {
      title: 'Folha Base',
      value: formatCurrency(hcmKpis?.totalFolhaBase || 0),
      subtitle: 'Salários fixos',
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-600/10',
      href: '/hcm/folha',
    },
    {
      title: 'Horas Extras',
      value: `${(hcmKpis?.totalHorasExtras || 0).toFixed(1)}h`,
      subtitle: 'Mês atual',
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      href: '/hcm/ponto',
    },
  ];

  const modules = [
    {
      title: 'Colaboradores',
      description: 'Cadastro unificado e gestão de contratos',
      icon: Users,
      href: '/hcm/colaboradores',
      color: 'border-l-primary',
      iconColor: 'text-primary',
    },
    {
      title: 'Folha Inteligente',
      description: 'Cálculo automático com variáveis do CRM',
      icon: DollarSign,
      href: '/hcm/folha',
      color: 'border-l-success',
      iconColor: 'text-success',
    },
    {
      title: 'Integrações de Ponto',
      description: 'Gateway API para sistemas externos',
      icon: Clock,
      href: '/hcm/integracoes-ponto',
      color: 'border-l-info',
      iconColor: 'text-info',
    },
    {
      title: 'Benefícios',
      description: 'VT, VR, Planos de Saúde',
      icon: Gift,
      href: '/hcm/beneficios',
      color: 'border-l-purple-500',
      iconColor: 'text-purple-500',
    },
    {
      title: 'Portal do Colaborador',
      description: 'App PWA mobile-first',
      icon: Smartphone,
      href: '/hcm/portal',
      color: 'border-l-pink-500',
      iconColor: 'text-pink-500',
    },
    {
      title: 'People Analytics',
      description: 'Métricas e IA preditiva',
      icon: BarChart3,
      href: '/hcm/analytics',
      color: 'border-l-amber-500',
      iconColor: 'text-amber-500',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Human Capital Management</h1>
            <p className="text-muted-foreground">
              Gestão estratégica de talentos e remuneração variável
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            <TrendingUp className="h-3 w-3 mr-1" />
            Turnover: {hcmKpis?.turnoverRate || 0}%
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpiCards.map((card) => (
            <Card 
              key={card.title}
              className="cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(card.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div className="min-w-0">
                    {hcmKpisLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <p className="text-xl font-bold truncate">{card.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground truncate">{card.title}</p>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Movement Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-success/5 border-success/20">
            <CardContent className="p-4 flex items-center gap-3">
              <UserPlus className="h-8 w-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-success">
                  {hcmKpis?.contratacoesMes || 0}
                </p>
                <p className="text-sm text-muted-foreground">Contratações do mês</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="p-4 flex items-center gap-3">
              <UserMinus className="h-8 w-8 text-destructive" />
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {hcmKpis?.desligamentosMes || 0}
                </p>
                <p className="text-sm text-muted-foreground">Desligamentos do mês</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-info/5 border-info/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Briefcase className="h-8 w-8 text-info" />
              <div>
                <p className="text-2xl font-bold text-info">
                  {hcmKpis?.emExperiencia || 0}
                </p>
                <p className="text-sm text-muted-foreground">Em experiência</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-warning/5 border-warning/20">
            <CardContent className="p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-warning">
                  {hcmKpis?.solicitacoesPendentes || 0}
                </p>
                <p className="text-sm text-muted-foreground">Solicitações pendentes</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((module) => (
            <Card
              key={module.title}
              className={`cursor-pointer hover:shadow-md transition-all border-l-4 ${module.color}`}
              onClick={() => navigate(module.href)}
            >
              <CardContent className="p-4 flex items-center gap-4">
                <module.icon className={`h-10 w-10 ${module.iconColor}`} />
                <div>
                  <p className="font-semibold">{module.title}</p>
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending Requests & Last Payroll */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pending Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Solicitações Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.slice(0, 5).map((req) => (
                    <div 
                      key={req.id} 
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted"
                      onClick={() => navigate('/hcm/solicitacoes')}
                    >
                      <div>
                        <p className="font-medium">{req.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {req.employee?.full_name} • {req.request_type}
                        </p>
                      </div>
                      <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                        Pendente
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma solicitação pendente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Last Payroll Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Última Folha Paga
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {hcmKpis?.ultimaFolhaPaga ? (
                <>
                  <div className="text-center py-4">
                    <p className="text-3xl font-bold text-success">
                      {formatCurrency(hcmKpis.ultimaFolhaPaga)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Referência: {hcmKpis.mesUltimaFolha}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Custo vs Orçamento</span>
                      <span className="font-medium">78%</span>
                    </div>
                    <Progress value={78} className="h-2" />
                  </div>
                  <button
                    onClick={() => navigate('/hcm/folha')}
                    className="w-full text-center text-sm text-primary hover:underline"
                  >
                    Ver detalhes da folha →
                  </button>
                </>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma folha processada
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Access */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Acesso Rápido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={() => navigate('/hcm/colaboradores/novo')}
                className="p-3 text-left hover:bg-muted rounded-lg transition-colors"
              >
                <UserPlus className="h-5 w-5 text-primary mb-1" />
                <p className="font-medium text-sm">Novo Colaborador</p>
              </button>
              <button
                onClick={() => navigate('/hcm/folha/nova')}
                className="p-3 text-left hover:bg-muted rounded-lg transition-colors"
              >
                <DollarSign className="h-5 w-5 text-success mb-1" />
                <p className="font-medium text-sm">Processar Folha</p>
              </button>
              <button
                onClick={() => navigate('/hcm/ponto')}
                className="p-3 text-left hover:bg-muted rounded-lg transition-colors"
              >
                <Clock className="h-5 w-5 text-info mb-1" />
                <p className="font-medium text-sm">Espelho de Ponto</p>
              </button>
              <button
                onClick={() => navigate('/hcm/relatorios')}
                className="p-3 text-left hover:bg-muted rounded-lg transition-colors"
              >
                <FileText className="h-5 w-5 text-muted-foreground mb-1" />
                <p className="font-medium text-sm">Relatórios</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
