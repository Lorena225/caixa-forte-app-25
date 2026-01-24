import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Printer, BookOpen } from 'lucide-react';
import { showExportToast, showPrintToast } from '@/utils/devFeedback';

const diarioData = [
  { 
    data: '2026-01-02', 
    lote: 'LT001', 
    lancamentos: [
      { conta: '1.1.01.001 - Caixa Geral', debito: 100000, credito: 0, historico: 'Saldo inicial do exercício' },
      { conta: '3.1.01.001 - Capital Social', debito: 0, credito: 100000, historico: '' },
    ]
  },
  { 
    data: '2026-01-05', 
    lote: 'LT002', 
    lancamentos: [
      { conta: '1.1.02.001 - Clientes', debito: 15000, credito: 0, historico: 'Venda a prazo NF 1234' },
      { conta: '4.1.01.001 - Receita de Vendas', debito: 0, credito: 15000, historico: '' },
    ]
  },
  { 
    data: '2026-01-08', 
    lote: 'LT003', 
    lancamentos: [
      { conta: '1.1.01.001 - Caixa Geral', debito: 8500, credito: 0, historico: 'Recebimento cliente NF 1230' },
      { conta: '1.1.02.001 - Clientes', debito: 0, credito: 8500, historico: '' },
    ]
  },
  { 
    data: '2026-01-10', 
    lote: 'LT004', 
    lancamentos: [
      { conta: '5.1.01.001 - CMV', debito: 6500, credito: 0, historico: 'Custo mercadoria vendida NF 1235' },
      { conta: '1.1.03.001 - Estoques', debito: 0, credito: 6500, historico: '' },
    ]
  },
];

export default function LivroDiario() {
  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Livro Diário"
          description="Registro cronológico de todos os lançamentos contábeis"
        />

        <div className="flex gap-4 justify-between">
          <div className="flex gap-2">
            <Select defaultValue="2026-01">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2026-01">Janeiro/2026</SelectItem>
                <SelectItem value="2025-12">Dezembro/2025</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => showPrintToast()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => showExportToast('PDF')}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted/50">
            <div className="flex items-center gap-3">
              <BookOpen className="h-6 w-6 text-primary" />
              <div>
                <CardTitle>Livro Diário - Janeiro/2026</CardTitle>
                <p className="text-sm text-muted-foreground">Empresa: Caixa Forte Ltda | CNPJ: 12.345.678/0001-90</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-6">
              {diarioData.map((registro, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        {new Date(registro.data).toLocaleDateString('pt-BR')}
                      </span>
                      <span className="text-sm text-muted-foreground font-mono">
                        Lote: {registro.lote}
                      </span>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Conta</TableHead>
                        <TableHead>Histórico</TableHead>
                        <TableHead className="text-right">Débito</TableHead>
                        <TableHead className="text-right">Crédito</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registro.lancamentos.map((lanc, lancIndex) => (
                        <TableRow key={lancIndex}>
                          <TableCell className="font-mono text-sm">{lanc.conta}</TableCell>
                          <TableCell className="text-muted-foreground">{lanc.historico}</TableCell>
                          <TableCell className="text-right">
                            {lanc.debito > 0 ? formatCurrency(lanc.debito) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            {lanc.credito > 0 ? formatCurrency(lanc.credito) : '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
