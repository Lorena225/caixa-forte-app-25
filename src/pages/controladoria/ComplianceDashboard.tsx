import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  FileSpreadsheet, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Send,
  RefreshCw,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

interface Obrigacao {
  id: string;
  nome: string;
  status: 'pronto' | 'enviado' | 'nao_processado' | 'pendente';
  vencimento: string | null;
  diasRestantes: number | null;
}

const obrigacoes: Obrigacao[] = [
  { id: '1', nome: 'SPED Fiscal', status: 'pronto', vencimento: '28/01/2026', diasRestantes: 7 },
  { id: '2', nome: 'ECD', status: 'nao_processado', vencimento: null, diasRestantes: null },
  { id: '3', nome: 'ECF', status: 'enviado', vencimento: null, diasRestantes: null },
  { id: '4', nome: 'FCONT', status: 'pronto', vencimento: '04/02/2026', diasRestantes: 14 },
  { id: '5', nome: 'DANFE', status: 'pronto', vencimento: null, diasRestantes: null },
];

const getStatusBadge = (obrigacao: Obrigacao) => {
  if (obrigacao.status === 'enviado') {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>;
  }
  if (obrigacao.status === 'nao_processado') {
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>;
  }
  if (obrigacao.diasRestantes && obrigacao.diasRestantes <= 14) {
    return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Vence em {obrigacao.diasRestantes} dias</Badge>;
  }
  return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">OK</Badge>;
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pronto': return 'Pronto';
    case 'enviado': return 'Enviado';
    case 'nao_processado': return 'Não processado';
    case 'pendente': return 'Pendente';
    default: return status;
  }
};

export default function ComplianceDashboard() {
  const [selectedMonth, setSelectedMonth] = useState('01');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEnviarFisco = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1500));
    setIsSubmitting(false);
    toast.success('Obrigações enviadas com sucesso para a Receita Federal');
  };

  const handleGerar = (nome: string) => {
    toast.success(`${nome} gerado com sucesso`);
  };

  const proximasObrigacoes = obrigacoes.filter(o => o.diasRestantes && o.diasRestantes > 0);

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <PageHeader title="Obrigações Fiscais" />
          <div className="flex gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI Grid 2x3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <KPICard
            title="SPED Fiscal"
            value="Pronto"
            subtitle="Vence em 7 dias"
            icon={FileSpreadsheet}
            variant="warning"
          />
          <KPICard
            title="ECD"
            value="Não processado"
            subtitle="OK"
            icon={FileText}
            variant="success"
          />
          <KPICard
            title="ECF"
            value="Enviado"
            subtitle="OK"
            icon={CheckCircle}
            variant="success"
          />
          <KPICard
            title="FCONT"
            value="Pronto"
            subtitle="Vence em 14 dias"
            icon={Clock}
            variant="warning"
          />
          <KPICard
            title="DANFE"
            value="Pronto"
            subtitle="OK"
            icon={FileText}
            variant="success"
          />
          <Card className="relative overflow-hidden">
            <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[160px]">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    fill="none"
                    stroke="#22C55E"
                    strokeWidth="8"
                    strokeDasharray={`${92 * 2.51} ${100 * 2.51}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-900">92%</span>
                </div>
              </div>
              <p className="text-sm font-medium text-gray-500 mt-3">Saúde Fiscal</p>
            </CardContent>
          </Card>
        </div>

        {/* Próximas Obrigações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Próximas Obrigações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {proximasObrigacoes.map((obrigacao) => (
                <div 
                  key={obrigacao.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{obrigacao.nome}</p>
                      <p className="text-sm text-gray-500">Vence em {obrigacao.diasRestantes} dias • {obrigacao.vencimento}</p>
                    </div>
                  </div>
                  <Button onClick={() => handleGerar(obrigacao.nome)} size="sm">
                    Gerar
                  </Button>
                </div>
              ))}
              {proximasObrigacoes.length === 0 && (
                <p className="text-center text-gray-500 py-8">Nenhuma obrigação pendente</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer - Conexão Receitanet */}
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Conectado a Receitanet</p>
                  <p className="text-sm text-gray-500">Última sincronização: Hoje às 14:35</p>
                </div>
              </div>
              <Button 
                onClick={handleEnviarFisco}
                disabled={isSubmitting}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white gap-2"
              >
                {isSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar para Fisco
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
