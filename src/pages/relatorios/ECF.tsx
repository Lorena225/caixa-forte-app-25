import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileDown, CheckCircle, AlertTriangle, Clock, FileText } from 'lucide-react';

const ecfBlocos = [
  { bloco: '0', descricao: 'Abertura e Identificação', status: 'completo', registros: 15 },
  { bloco: 'C', descricao: 'Informações Recuperadas', status: 'completo', registros: 245 },
  { bloco: 'E', descricao: 'Informações Recuperadas ECD', status: 'completo', registros: 1200 },
  { bloco: 'J', descricao: 'Plano de Contas e Mapeamento', status: 'completo', registros: 89 },
  { bloco: 'K', descricao: 'Saldos das Contas Contábeis', status: 'completo', registros: 156 },
  { bloco: 'L', descricao: 'Lucro Líquido - Lucro Real', status: 'pendente', registros: 0 },
  { bloco: 'M', descricao: 'Livro de Apuração do Lucro Real', status: 'pendente', registros: 0 },
  { bloco: 'N', descricao: 'Cálculo do IRPJ e CSLL', status: 'pendente', registros: 0 },
  { bloco: 'Y', descricao: 'Informações Gerais', status: 'parcial', registros: 12 },
  { bloco: '9', descricao: 'Encerramento', status: 'aguardando', registros: 0 },
];

export default function ECF() {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completo':
        return <Badge className="bg-green-100 text-green-700">Completo</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
      case 'parcial':
        return <Badge className="bg-blue-100 text-blue-700">Parcial</Badge>;
      case 'aguardando':
        return <Badge className="bg-gray-100 text-gray-700">Aguardando</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completo':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pendente':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'parcial':
        return <Clock className="h-5 w-5 text-blue-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="ECF - Escrituração Contábil Fiscal"
          description="Geração e acompanhamento da ECF para entrega à Receita Federal"
        />

        <div className="flex gap-4 justify-between">
          <div className="flex gap-2">
            <Select defaultValue="2025">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Ano-Calendário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              Validar Arquivo
            </Button>
            <Button className="bg-[#0085FF] hover:bg-[#0070DD]">
              <FileDown className="h-4 w-4 mr-2" />
              Gerar ECF
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ano-Calendário</p>
                  <p className="text-2xl font-bold">2025</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Blocos Completos</p>
                  <p className="text-2xl font-bold">5/10</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pendências</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prazo Entrega</p>
                  <p className="text-2xl font-bold">31/07</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Blocos da ECF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ecfBlocos.map((bloco, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(bloco.status)}
                    <div>
                      <p className="font-medium">Bloco {bloco.bloco} - {bloco.descricao}</p>
                      <p className="text-sm text-muted-foreground">{bloco.registros} registros</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(bloco.status)}
                    <Button variant="ghost" size="sm">
                      Editar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
