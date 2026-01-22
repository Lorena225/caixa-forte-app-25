import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { 
  ArrowRightLeft, 
  AlertTriangle, 
  DollarSign, 
  Target,
  CheckCircle,
  Eye,
  Sparkles,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

interface SugestaoMatching {
  id: string;
  bancoDescricao: string;
  bancoValor: number;
  caixaDescricao: string;
  caixaValor: number;
  confianca: number;
}

interface Divergencia {
  id: string;
  transacao: string;
  valor: number;
  data: string;
  sugestaoIA: string;
}

const sugestoesMatching: SugestaoMatching[] = [
  { id: '1', bancoDescricao: 'Depósito XYZ Ltda', bancoValor: 1000, caixaDescricao: 'Fatura 001 - XYZ', caixaValor: 1000, confianca: 95 },
  { id: '2', bancoDescricao: 'TED Fornecedor ABC', bancoValor: 2500, caixaDescricao: 'Pagamento NF 4521', caixaValor: 2500, confianca: 88 },
  { id: '3', bancoDescricao: 'PIX Recebido Cliente', bancoValor: 750, caixaDescricao: 'Fatura 002', caixaValor: 750, confianca: 92 },
  { id: '4', bancoDescricao: 'Débito Automático', bancoValor: 450, caixaDescricao: 'Assinatura Software', caixaValor: 450, confianca: 99 },
];

const divergencias: Divergencia[] = [
  { id: '1', transacao: 'Cobrança Serasa', valor: 500, data: '15/01/2026', sugestaoIA: 'Provável taxa de consulta - lançar como despesa administrativa' },
  { id: '2', transacao: 'Tarifa Bancária', valor: 85.50, data: '14/01/2026', sugestaoIA: 'Tarifa mensal de manutenção - lançar em despesas bancárias' },
  { id: '3', transacao: 'Estorno Não Identificado', valor: 230, data: '12/01/2026', sugestaoIA: 'Possível devolução de cliente - verificar vendas recentes' },
];

export default function AutomaticReconciliationPage() {
  const [concordados, setConcordados] = useState<string[]>([]);
  const [lancados, setLancados] = useState<string[]>([]);

  const handleConcordar = (id: string) => {
    setConcordados(prev => [...prev, id]);
    toast.success('Transação conciliada com sucesso!');
  };

  const handleRevisar = (sugestao: SugestaoMatching) => {
    toast.info(`Abrindo revisão de: ${sugestao.bancoDescricao}`);
  };

  const handleLancar = (divergencia: Divergencia) => {
    setLancados(prev => [...prev, divergencia.id]);
    toast.success(`Lançamento de ${divergencia.transacao} realizado!`);
  };

  const sugestoesAtivas = sugestoesMatching.filter(s => !concordados.includes(s.id));
  const divergenciasAtivas = divergencias.filter(d => !lancados.includes(d.id));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Conciliação Automática" />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KPICard
            title="Transações Não Conciliadas"
            value="15"
            icon={ArrowRightLeft}
            variant="warning"
          />
          <KPICard
            title="Divergências"
            value="3"
            icon={AlertTriangle}
            variant="danger"
          />
          <KPICard
            title="Valor Não Conciliado"
            value="R$ 5.234,50"
            icon={DollarSign}
            variant="info"
          />
          <KPICard
            title="Acurácia"
            value="98.5%"
            icon={Target}
            variant="success"
          />
        </div>

        {/* Abas */}
        <Tabs defaultValue="sugestoes" className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sugestoes" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Sugestões de Matching
              <Badge variant="secondary" className="ml-1">{sugestoesAtivas.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="divergencias" className="gap-2">
              <AlertTriangle className="h-4 w-4" />
              Divergências
              <Badge variant="secondary" className="ml-1">{divergenciasAtivas.length}</Badge>
            </TabsTrigger>
          </TabsList>

          {/* Aba Sugestões */}
          <TabsContent value="sugestoes">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Banco</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Caixa</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Confiança</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sugestoesAtivas.map((sugestao) => (
                      <TableRow key={sugestao.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{sugestao.bancoDescricao}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sugestao.bancoValor)}</TableCell>
                        <TableCell>{sugestao.caixaDescricao}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(sugestao.caixaValor)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={sugestao.confianca} className="w-16 h-2" />
                            <span className="text-sm font-medium">{sugestao.confianca}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm"
                              onClick={() => handleConcordar(sugestao.id)}
                              className="gap-1"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Concordar
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevisar(sugestao)}
                              className="gap-1"
                            >
                              <Eye className="h-4 w-4" />
                              Revisar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sugestoesAtivas.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Todas as sugestões foram processadas!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Aba Divergências */}
          <TabsContent value="divergencias">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transação</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Sugestão IA</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {divergenciasAtivas.map((divergencia) => (
                      <TableRow key={divergencia.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium">{divergencia.transacao}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(divergencia.valor)}</TableCell>
                        <TableCell>{divergencia.data}</TableCell>
                        <TableCell>
                          <div className="flex items-start gap-2 max-w-md">
                            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm text-gray-600">{divergencia.sugestaoIA}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            size="sm"
                            onClick={() => handleLancar(divergencia)}
                            className="gap-1"
                          >
                            <Plus className="h-4 w-4" />
                            Lançar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {divergenciasAtivas.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p>Todas as divergências foram resolvidas!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
