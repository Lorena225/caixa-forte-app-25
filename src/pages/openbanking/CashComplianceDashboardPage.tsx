import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Building2,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  ChevronRight,
  Shield,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const projecaoData = [
  { semana: 'Sem 1', caixa: 50000, tributos: 5000 },
  { semana: 'Sem 2', caixa: 48000, tributos: 8000 },
  { semana: 'Sem 3', caixa: 45000, tributos: 6000 },
  { semana: 'Sem 4', caixa: 42000, tributos: 7000 },
];

const proximasObrigacoes = [
  { nome: 'SPED Fiscal', dias: 10, status: 'pronto' as const },
  { nome: 'ECD', dias: 25, status: 'pronto' as const },
  { nome: 'FCONT', dias: 5, status: 'pendente' as const },
];

const ultimasSubmissoes = [
  { nome: 'SPED Fiscal', data: '15/01', status: 'enviado' },
  { nome: 'ECF', data: '10/01', status: 'enviado' },
  { nome: 'ECD', data: '08/01', status: 'enviado' },
];

const saldosBancarios = [
  { id: 'bb', banco: 'Banco do Brasil', saldo: 10000, sync: '2 min', trend: 'up' as const },
  { id: 'bradesco', banco: 'Bradesco', saldo: 5000, sync: '5 min', trend: 'down' as const },
  { id: 'itau', banco: 'Itaú', saldo: 8500, sync: '1 min', trend: 'up' as const },
];

const complianceScore = 85;

export default function CashComplianceDashboardPage() {
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  const totalSaldo = saldosBancarios.reduce((sum, b) => sum + b.saldo, 0);

  const handleInvestigar = () => {
    toast.info('Abrindo análise de divergências...');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader 
          title="Dashboard Caixa + Compliance" 
          description="Visão integrada de saúde financeira e conformidade tributária"
        />

        {/* 3 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Fiscal */}
          <div className="space-y-6">
            {/* Score Compliance */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-primary" />
                    Score de Compliance
                  </span>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    {complianceScore}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full" viewBox="0 0 120 120">
                    <circle
                      cx="60"
                      cy="60"
                      r="55"
                      fill="none"
                      stroke="currentColor"
                      className="text-muted"
                      strokeWidth="8"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="55"
                      fill="none"
                      stroke="currentColor"
                      className="text-green-500"
                      strokeWidth="8"
                      strokeDasharray={`${(complianceScore / 100) * 345} 345`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-green-600">{complianceScore}%</span>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <Check className="h-3 w-3 mr-1" />
                  Excelente
                </Badge>
              </CardContent>
            </Card>

            {/* Próximas Obrigações */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-primary" />
                  Próximas Obrigações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proximasObrigacoes.map((obrigacao, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{obrigacao.nome}</p>
                      <p className="text-xs text-muted-foreground">Vence em {obrigacao.dias} dias</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        className={cn(
                          obrigacao.status === 'pronto' 
                            ? "bg-green-100 text-green-800 hover:bg-green-100" 
                            : "bg-orange-100 text-orange-800 hover:bg-orange-100"
                        )}
                      >
                        {obrigacao.status === 'pronto' ? 'Enviado' : 'Pendente'}
                      </Badge>
                      {obrigacao.status === 'pronto' && <Check className="h-4 w-4 text-green-600" />}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Últimas Submissões */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Status Últimas Submissões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {ultimasSubmissoes.map((submissao, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium">{submissao.nome}</span>
                    <span className="text-xs text-green-700 font-semibold flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      {submissao.data}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2: Caixa */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Projeção de Caixa vs Obrigações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projecaoData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          borderRadius: 8, 
                          border: '1px solid hsl(var(--border))',
                          backgroundColor: 'hsl(var(--background))'
                        }}
                      />
                      <Legend />
                      <Bar dataKey="caixa" name="Caixa" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="tributos" name="Tributos" fill="hsl(25, 95%, 53%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Análise de Saúde */}
            <Card className="border-l-4 border-l-green-500 bg-green-50/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-green-900 mb-1">Saúde Financeira: Excelente</h4>
                    <p className="text-sm text-green-800">
                      Você terá <span className="font-bold text-lg">{formatCurrency(25000)}</span> livres após pagar tributos
                    </p>
                    <p className="text-xs text-green-700 mt-2">
                      Margem de segurança: 59% do caixa projetado
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recomendações */}
            <Card className="border-l-4 border-l-primary bg-primary/5">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Recomendações
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Manter saldo mínimo operacional de R$ 15.000</li>
                  <li>• Conferir FCONT até 28 de janeiro</li>
                  <li>• Revisar composição de ICMS acumulado</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 3: Bancos */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-primary" />
                  Contas Sincronizadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {saldosBancarios.map((banco) => (
                  <div
                    key={banco.id}
                    onClick={() => setSelectedBank(banco.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition cursor-pointer",
                      selectedBank === banco.id
                        ? "bg-primary/5 border-primary"
                        : "bg-muted/30 border-transparent hover:border-muted-foreground/20"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-semibold">{banco.banco}</p>
                      {banco.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <p className="text-2xl font-bold font-mono mb-2">
                      {formatCurrency(banco.saldo)}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Há {banco.sync}
                      </span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Conectado
                      </Badge>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Saldo Total</p>
                  <p className="text-3xl font-bold text-primary font-mono">
                    {formatCurrency(totalSaldo)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Alerta de Divergências */}
            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Divergências
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-orange-50 rounded-lg p-4 mb-3">
                  <p className="text-sm text-orange-900 font-medium mb-3">
                    ⚠️ 2 contas com divergências detectadas
                  </p>
                  <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
                    <Link to="/conciliacao-automatica">
                      Investigar
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Ações Rápidas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button asChild className="w-full" variant="default">
                  <Link to="/conciliacao-automatica">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Reconciliar Contas
                  </Link>
                </Button>
                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                  <Link to="/nf-xml-auto">
                    <FileText className="h-4 w-4 mr-2" />
                    Lançar NF-e
                  </Link>
                </Button>
                <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
                  <Link to="/controladoria-obrigacoes">
                    <Shield className="h-4 w-4 mr-2" />
                    Ver Compliance
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
