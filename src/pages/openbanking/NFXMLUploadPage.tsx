import { useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Upload, 
  FileText, 
  CheckCircle,
  Building2,
  Calendar,
  DollarSign,
  Package,
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NFEData {
  cnpjEmitente: string;
  nomeEmitente: string;
  valorTotal: number;
  dataEmissao: string;
  vencimento: string;
  numeroNF: string;
  itens: { descricao: string; quantidade: number; valorUnitario: number; valorTotal: number }[];
}

const mockNFEData: NFEData = {
  cnpjEmitente: '12.345.678/0001-90',
  nomeEmitente: 'Fornecedor ABC Ltda',
  valorTotal: 1500.00,
  dataEmissao: '15/01/2026',
  vencimento: '14/02/2026',
  numeroNF: 'NF-e 001234',
  itens: [
    { descricao: 'Material de Escritório', quantidade: 10, valorUnitario: 50.00, valorTotal: 500.00 },
    { descricao: 'Equipamento de Informática', quantidade: 2, valorUnitario: 400.00, valorTotal: 800.00 },
    { descricao: 'Serviço de Instalação', quantidade: 1, valorUnitario: 200.00, valorTotal: 200.00 },
  ]
};

export default function NFXMLUploadPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [nfeData, setNfeData] = useState<NFEData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFile();
  }, []);

  const handleFileSelect = () => {
    processFile();
  };

  const processFile = async () => {
    setIsProcessing(true);
    // Simular processamento
    await new Promise(r => setTimeout(r, 1500));
    setNfeData(mockNFEData);
    setIsProcessing(false);
    toast.success('XML processado com sucesso!');
  };

  const handleLancar = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsProcessing(false);
    toast.success(`NF-e de ${nfeData?.nomeEmitente} lançada automaticamente em Contas a Pagar!`);
    setNfeData(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="NF-e XML Automático" />

        {/* Drop Zone */}
        {!nfeData && (
          <Card 
            className={cn(
              'border-2 border-dashed transition-all duration-200',
              isDragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <CardContent className="p-12">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className="flex flex-col items-center justify-center text-center cursor-pointer"
                onClick={handleFileSelect}
              >
                <div className={cn(
                  'w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors',
                  isDragging ? 'bg-primary/10' : 'bg-gray-100'
                )}>
                  {isProcessing ? (
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Upload className={cn('h-10 w-10', isDragging ? 'text-primary' : 'text-gray-400')} />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isProcessing ? 'Processando XML...' : 'Arraste o arquivo XML aqui'}
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  ou clique para selecionar
                </p>
                <Badge variant="secondary">Formato aceito: .xml</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dados da NF-e */}
        {nfeData && (
          <div className="space-y-6">
            {/* Resumo */}
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  {nfeData.numeroNF}
                  <Badge className="bg-green-100 text-green-700 ml-2">XML Válido</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">CNPJ Emitente</p>
                      <p className="font-semibold text-gray-900">{nfeData.cnpjEmitente}</p>
                      <p className="text-sm text-gray-600">{nfeData.nomeEmitente}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Valor Total</p>
                      <p className="font-semibold text-gray-900 text-lg">{formatCurrency(nfeData.valorTotal)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Data Emissão</p>
                      <p className="font-semibold text-gray-900">{nfeData.dataEmissao}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Vencimento</p>
                      <p className="font-semibold text-gray-900">{nfeData.vencimento}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Itens */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens da Nota
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Qtd</TableHead>
                      <TableHead className="text-right">Valor Unit.</TableHead>
                      <TableHead className="text-right">Valor Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nfeData.itens.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.descricao}</TableCell>
                        <TableCell className="text-center">{item.quantidade}</TableCell>
                        <TableCell className="text-right font-mono">{formatCurrency(item.valorUnitario)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatCurrency(item.valorTotal)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setNfeData(null)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleLancar}
                disabled={isProcessing}
                size="lg"
                className="gap-2"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Lançar em Contas a Pagar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
