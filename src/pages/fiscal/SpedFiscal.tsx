import { useState } from 'react';
import { FileText, Upload, CheckCircle, AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { useSpedFiscalMovements, useSpedFiscalStats, useValidateSpedMovements } from '@/hooks/useSpedFiscal';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

export default function SpedFiscal() {
  const [activeTab, setActiveTab] = useState('movimentos');
  const [operationType, setOperationType] = useState('__all__');
  const [documentType, setDocumentType] = useState('__all__');
  
  const { data: movements = [], isLoading } = useSpedFiscalMovements({
    operationType,
    documentType,
  });
  const { data: stats } = useSpedFiscalStats();
  const validateMutation = useValidateSpedMovements();
  
  const handleValidateAll = () => {
    const pendingIds = movements.filter(m => !m.is_validated).map(m => m.id);
    if (pendingIds.length === 0) {
      toast.info('Não há movimentos pendentes de validação');
      return;
    }
    validateMutation.mutate(pendingIds);
  };
  
  const handleGenerateSped = () => {
    toast.info('Geração de SPED Fiscal em desenvolvimento');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SPED Fiscal"
        description="Escrituração Fiscal Digital - EFD ICMS/IPI"
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Movimentos</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats?.totalMovimentos || 0}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Entradas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.totalEntradas || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Saídas</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{formatCurrency(stats?.totalSaidas || 0)}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pendentes Validação</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-yellow-600">{stats?.pendentesValidacao || 0}</p></CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="movimentos">Movimentos</TabsTrigger>
            <TabsTrigger value="validacao">Validação</TabsTrigger>
            <TabsTrigger value="geracao">Geração</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleValidateAll}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Validar Todos
            </Button>
            <Button onClick={handleGenerateSped}>
              <FileText className="h-4 w-4 mr-2" />
              Gerar SPED
            </Button>
          </div>
        </div>

        <TabsContent value="movimentos" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Movimentos Fiscais</CardTitle>
                <div className="flex gap-2">
                  <Select value={operationType} onValueChange={setOperationType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="entrada">Entradas</SelectItem>
                      <SelectItem value="saida">Saídas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Documento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      <SelectItem value="NFE">NF-e</SelectItem>
                      <SelectItem value="NFCE">NFC-e</SelectItem>
                      <SelectItem value="CTE">CT-e</SelectItem>
                      <SelectItem value="NFSE">NFS-e</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : movements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum movimento encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>CFOP</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-right">ICMS</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.slice(0, 50).map((mov) => (
                      <TableRow key={mov.id}>
                        <TableCell>
                          {format(new Date(mov.document_date), 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={mov.operation_type === 'entrada' ? 'secondary' : 'default'}>
                            {mov.operation_type === 'entrada' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {mov.document_type} {mov.document_number}
                        </TableCell>
                        <TableCell className="font-mono">{mov.cfop_code}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(mov.total_value)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(mov.icms_value)}
                        </TableCell>
                        <TableCell className="text-center">
                          {mov.is_validated ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Validado
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Pendente
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="validacao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Validação de Movimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Regras de Validação</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      CFOP válido e compatível com operação
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      NCM com 8 dígitos
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      CST ICMS/PIS/COFINS consistentes
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Valores de impostos calculados corretamente
                    </li>
                  </ul>
                </div>
                <Button onClick={handleValidateAll} disabled={validateMutation.isPending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${validateMutation.isPending ? 'animate-spin' : ''}`} />
                  Executar Validação Completa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geracao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Gerar SPED Fiscal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Selecione o período para geração do arquivo SPED Fiscal (EFD ICMS/IPI).
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Período Atual</h4>
                    <p className="text-2xl font-bold">
                      {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {stats?.totalMovimentos || 0} movimentos
                    </p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Totais de Impostos</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>ICMS:</span>
                        <span className="font-mono">{formatCurrency(stats?.totalIcms || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>PIS:</span>
                        <span className="font-mono">{formatCurrency(stats?.totalPis || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>COFINS:</span>
                        <span className="font-mono">{formatCurrency(stats?.totalCofins || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button onClick={handleGenerateSped} className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar Arquivo SPED Fiscal
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Geração</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                Nenhum arquivo gerado ainda
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
