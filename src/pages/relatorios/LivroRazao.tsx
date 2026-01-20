import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Printer, Search } from 'lucide-react';
import { useState } from 'react';

const razaoData = [
  { data: '2026-01-02', lote: 'LT001', historico: 'Saldo inicial', debito: 100000, credito: 0, saldo: 100000 },
  { data: '2026-01-05', lote: 'LT002', historico: 'Venda NF 1234 - Cliente ABC', debito: 15000, credito: 0, saldo: 115000 },
  { data: '2026-01-08', lote: 'LT003', historico: 'Recebimento NF 1230', debito: 0, credito: 8500, saldo: 106500 },
  { data: '2026-01-10', lote: 'LT004', historico: 'Venda NF 1235 - Cliente XYZ', debito: 22000, credito: 0, saldo: 128500 },
  { data: '2026-01-12', lote: 'LT005', historico: 'Transferência entre contas', debito: 0, credito: 5000, saldo: 123500 },
  { data: '2026-01-15', lote: 'LT006', historico: 'Venda NF 1236 - Cliente DEF', debito: 18500, credito: 0, saldo: 142000 },
  { data: '2026-01-18', lote: 'LT007', historico: 'Recebimento NF 1234', debito: 0, credito: 15000, saldo: 127000 },
];

export default function LivroRazao() {
  const [search, setSearch] = useState('');
  const [contaSelecionada, setContaSelecionada] = useState('1.1.01.001');

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Livro Razão"
          description="Registro detalhado das movimentações por conta contábil"
        />

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-wrap">
            <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
              <SelectTrigger className="w-60">
                <SelectValue placeholder="Selecione a conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1.1.01.001">1.1.01.001 - Caixa Geral</SelectItem>
                <SelectItem value="1.1.01.002">1.1.01.002 - Banco Itaú</SelectItem>
                <SelectItem value="1.1.02.001">1.1.02.001 - Clientes</SelectItem>
                <SelectItem value="2.1.01.001">2.1.01.001 - Fornecedores</SelectItem>
              </SelectContent>
            </Select>
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
            <Button variant="outline">
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="bg-muted/50">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Conta: {contaSelecionada} - Caixa Geral</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Período: 01/01/2026 a 31/01/2026</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Saldo Atual</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(127000)}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Histórico</TableHead>
                  <TableHead className="text-right">Débito</TableHead>
                  <TableHead className="text-right">Crédito</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {razaoData.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-mono text-xs">{item.lote}</TableCell>
                    <TableCell>{item.historico}</TableCell>
                    <TableCell className="text-right">
                      {item.debito > 0 ? formatCurrency(item.debito) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.credito > 0 ? formatCurrency(item.credito) : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.saldo)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
