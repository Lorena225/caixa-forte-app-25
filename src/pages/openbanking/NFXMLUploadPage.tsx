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
  ArrowRight,
  RotateCcw,
  ExternalLink,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

type PageState = 'upload' | 'preview' | 'success';

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
  const [pageState, setPageState] = useState<PageState>('upload');
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
    await new Promise(r => setTimeout(r, 1500));
    setNfeData(mockNFEData);
    setIsProcessing(false);
    setPageState('preview');
    toast.success('XML processado com sucesso!');
  };

  const handleLancar = async () => {
    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsProcessing(false);
    setPageState('success');
    toast.success(`NF-e lançada automaticamente em Contas a Pagar!`);
  };

  const handleReset = () => {
    setPageState('upload');
    setNfeData(null);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader 
          title="Lançamento Automático de NF-e" 
          description="Envie arquivos XML de NF-e para processamento automático e lançamento em Contas a Pagar"
        />

        {/* ETAPA 1: UPLOAD */}
        {pageState === 'upload' && (
          <div className="space-y-6">
            <Card 
              className={cn(
                'border-2 border-dashed transition-all duration-200 cursor-pointer',
                isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
              )}
            >
              <CardContent className="p-12">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleFileSelect}
                  className="flex flex-col items-center justify-center text-center"
                >
                  <div className={cn(
                    'w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors',
                    isDragging ? 'bg-primary/10' : 'bg-muted'
                  )}>
                    {isProcessing ? (
                      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className={cn('h-10 w-10', isDragging ? 'text-primary' : 'text-muted-foreground')} />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {isProcessing ? 'Processando XML...' : 'Arraste o arquivo XML aqui'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    ou clique para selecionar arquivo de NF-e
                  </p>
                  <Badge variant="secondary">Formato: .xml | Tamanho máximo: 5 MB</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-6">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Como usar:
                </h4>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li>1. Clique na área acima ou arraste um arquivo XML de NF-e</li>
                  <li>2. O sistema extrairá automaticamente os dados da nota fiscal</li>
                  <li>3. Revise os dados extraídos antes de lançar</li>
                  <li>4. Confirme para lançar automaticamente em Contas a Pagar</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ETAPA 2: PREVIEW */}
        {pageState === 'preview' && nfeData && (
          <div className="space-y-6">
            {/* Sucesso do processamento */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-green-900">Arquivo processado com sucesso</p>
                <p className="text-sm text-green-700">Os dados foram extraídos automaticamente do XML</p>
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">CNPJ Emitente</p>
                      <p className="font-bold text-lg">{nfeData.cnpjEmitente}</p>
                      <p className="text-sm text-muted-foreground truncate">{nfeData.nomeEmitente}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Valor Total</p>
                      <p className="font-bold text-lg text-green-600">{formatCurrency(nfeData.valorTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Data Emissão</p>
                      <p className="font-bold text-lg">{nfeData.dataEmissao}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase font-medium">Vencimento</p>
                      <p className="font-bold text-lg text-orange-600">{nfeData.vencimento}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Itens */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Itens da NF-e
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
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
                <div className="bg-muted/50 px-6 py-4 border-t text-right">
                  <p className="text-lg font-bold">
                    Total: {formatCurrency(nfeData.valorTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex gap-4">
              <Button 
                onClick={handleLancar}
                disabled={isProcessing}
                size="lg"
                className="flex-1 gap-2"
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="h-5 w-5" />
                )}
                Lançar em Contas a Pagar
              </Button>
              <Button variant="outline" size="lg" onClick={handleReset} className="flex-1">
                Cancelar
              </Button>
            </div>

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-blue-900">
                <span className="font-semibold">Informação:</span> Ao confirmar, a NF-e será lançada automaticamente em "Contas a Pagar" com o status "Aguardando Recebimento".
              </p>
            </div>
          </div>
        )}

        {/* ETAPA 3: SUCESSO */}
        {pageState === 'success' && nfeData && (
          <div className="max-w-lg mx-auto text-center py-12 space-y-6">
            <div className="flex justify-center">
              <div className="bg-green-100 rounded-full p-6">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-2">NF-e Lançada com Sucesso!</h2>
              <p className="text-muted-foreground">
                A nota fiscal foi processada e lançada automaticamente em Contas a Pagar.
              </p>
            </div>

            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Emitente:</span>
                  <span className="font-semibold">{nfeData.nomeEmitente}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">CNPJ:</span>
                  <span className="font-semibold">{nfeData.cnpjEmitente}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-semibold text-green-600">{formatCurrency(nfeData.valorTotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vencimento:</span>
                  <span className="font-semibold">{nfeData.vencimento}</span>
                </div>
              </CardContent>
            </Card>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
              <p className="text-sm font-semibold text-blue-900 mb-2">Próximas ações sugeridas:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ A fatura aparecerá em "Contas a Pagar" dentro de segundos</li>
                <li>✓ Verifique a classificação contábil da despesa</li>
                <li>✓ Confirme o recebimento quando a mercadoria chegar</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <Button onClick={handleReset} variant="outline" size="lg" className="flex-1 gap-2">
                <RotateCcw className="h-4 w-4" />
                Lançar Outro XML
              </Button>
              <Button asChild size="lg" className="flex-1 gap-2">
                <Link to="/contas-pagar">
                  <ExternalLink className="h-4 w-4" />
                  Ver Contas a Pagar
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
