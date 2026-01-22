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
  DollarSign,
  FileText,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const projecaoData = [
  { semana: 'Sem 1', caixa: 25000, obrigacoes: 8000 },
  { semana: 'Sem 2', caixa: 32000, obrigacoes: 12000 },
  { semana: 'Sem 3', caixa: 28000, obrigacoes: 5000 },
  { semana: 'Sem 4', caixa: 35000, obrigacoes: 10000 },
];

const proximasObrigacoes = [
  { nome: 'SPED', dias: 10, status: 'pronto' },
  { nome: 'ECD', dias: 25, status: 'pendente' },
];

const ultimasSubmissoes = [
  { nome: 'SPED', data: '15/01', status: 'enviado' },
  { nome: 'ECF', data: '10/01', status: 'enviado' },
];

const saldosBancarios = [
  { banco: 'Banco do Brasil', saldo: 10000, sync: '2 min' },
  { banco: 'Bradesco', saldo: 5000, sync: '5 min' },
  { banco: 'Itaú', saldo: 8500, sync: '1 min' },
];

export default function CashComplianceDashboardPage() {
  const handleInvestigar = () => {
    toast.info('Abrindo análise de divergências...');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Dashboard Caixa + Compliance" />

        {/* 3 Colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Fiscal */}
          <div className="space-y-6">
            {/* Score Compliance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5 text-primary" />
                  Score de Compliance
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-4">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#E5E7EB"
                      strokeWidth="12"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      fill="none"
                      stroke="#22C55E"
                      strokeWidth="12"
                      strokeDasharray={`${85 * 3.52} ${100 * 3.52}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-bold text-gray-900">85%</span>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700">Saudável</Badge>
              </CardContent>
            </Card>

            {/* Próximas Obrigações */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Próximas Obrigações
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proximasObrigacoes.map((obrigacao, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{obrigacao.nome}</span>
                    <Badge variant="outline">Vence em {obrigacao.dias} dias</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Últimas Submissões */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Status Últimas Submissões
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ultimasSubmissoes.map((submissao, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="font-medium">{submissao.nome}</span>
                    </div>
                    <span className="text-sm text-gray-600">Enviado ({submissao.data})</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Coluna 2: Caixa */}
          <div className="space-y-6">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Projeção de Caixa vs Obrigações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projecaoData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="semana" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${v/1000}k`} />
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ borderRadius: 8, border: '1px solid #E5E7EB' }}
                      />
                      <Legend />
                      <Bar dataKey="caixa" name="Caixa" fill="#0066CC" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="obrigacoes" name="Obrigações" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-800">
                      Você terá R$ 25.000 livres após pagar tributos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna 3: Bancos */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-primary" />
                  Saldo de Contas Sincronizadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {saldosBancarios.map((banco, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium">{banco.banco}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        Sync há {banco.sync}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-lg">{formatCurrency(banco.saldo)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Alerta de Divergências */}
            <Card className="border-l-4 border-l-yellow-500 bg-yellow-50/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-1">2 contas com divergências</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Existem transações não conciliadas que precisam de atenção
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={handleInvestigar}
                      className="gap-1"
                    >
                      <Search className="h-4 w-4" />
                      Investigar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Resumo Total */}
            <Card className="bg-primary text-white">
              <CardContent className="p-6 text-center">
                <p className="text-primary-foreground/80 text-sm mb-1">Saldo Total Sincronizado</p>
                <p className="text-3xl font-bold">{formatCurrency(23500)}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
