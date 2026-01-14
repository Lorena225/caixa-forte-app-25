import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, DollarSign, Gift, Clock, UserMinus, Cake, AlertTriangle } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';

export default function RHIndex() {
  const navigate = useNavigate();
  const { kpis, kpisLoading, funcionarios, ferias } = useRH();

  const cards = [
    {
      title: 'Funcionários Ativos',
      value: kpis?.totalAtivos || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      href: '/rh/funcionarios',
    },
    {
      title: 'Em Férias',
      value: kpis?.emFerias || 0,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      href: '/rh/ferias',
    },
    {
      title: 'Afastados',
      value: kpis?.afastados || 0,
      icon: UserMinus,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      href: '/rh/funcionarios?status=afastado',
    },
    {
      title: 'Aniversariantes',
      value: kpis?.aniversariantes || 0,
      icon: Cake,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      href: '/rh/funcionarios',
    },
    {
      title: 'Folha do Mês',
      value: formatCurrency(kpis?.ultimaFolha || 0),
      subtitle: kpis?.mesReferencia,
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      href: '/rh/folha',
    },
  ];

  // Próximas férias
  const proximasFerias = ferias
    ?.filter(f => f.status === 'aprovada' && new Date(f.data_inicio) > new Date())
    .slice(0, 5);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Recursos Humanos</h1>
          <p className="text-muted-foreground">Gestão de funcionários, folha e benefícios</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <Card 
              key={card.title} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(card.href)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                  <div>
                    {kpisLoading ? (
                      <Skeleton className="h-6 w-16" />
                    ) : (
                      <p className="text-xl font-bold">{card.value}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
            onClick={() => navigate('/rh/funcionarios')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="font-medium">Funcionários</p>
                <p className="text-sm text-muted-foreground">Cadastro e gestão</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500"
            onClick={() => navigate('/rh/folha')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="font-medium">Folha de Pagamento</p>
                <p className="text-sm text-muted-foreground">Processar e consultar</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-purple-500"
            onClick={() => navigate('/rh/ferias')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Calendar className="h-8 w-8 text-purple-500" />
              <div>
                <p className="font-medium">Férias</p>
                <p className="text-sm text-muted-foreground">Programação e controle</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-orange-500"
            onClick={() => navigate('/rh/beneficios')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <Gift className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium">Benefícios</p>
                <p className="text-sm text-muted-foreground">Gestão de benefícios</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Próximas Férias */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Próximas Férias
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proximasFerias && proximasFerias.length > 0 ? (
                <div className="space-y-3">
                  {proximasFerias.map((f) => (
                    <div key={f.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <p className="font-medium">{f.funcionario?.nome_completo}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(f.data_inicio).toLocaleDateString('pt-BR')} - {new Date(f.data_fim).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">{f.dias} dias</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Nenhuma férias programada</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Acesso Rápido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <button 
                onClick={() => navigate('/rh/ponto')}
                className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors"
              >
                <p className="font-medium">Ponto Eletrônico</p>
                <p className="text-sm text-muted-foreground">Registro e aprovação</p>
              </button>
              <button 
                onClick={() => navigate('/rh/cargos')}
                className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors"
              >
                <p className="font-medium">Cargos e Departamentos</p>
                <p className="text-sm text-muted-foreground">Estrutura organizacional</p>
              </button>
              <button 
                onClick={() => navigate('/rh/relatorios')}
                className="w-full text-left p-3 hover:bg-muted rounded-lg transition-colors"
              >
                <p className="font-medium">Relatórios</p>
                <p className="text-sm text-muted-foreground">Folha analítica, encargos</p>
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
