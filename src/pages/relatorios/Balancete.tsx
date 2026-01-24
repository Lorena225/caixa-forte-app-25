import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileDown, Printer } from 'lucide-react';
import { showExportToast, showPrintToast } from '@/utils/devFeedback';

const balanceteData = [
  { codigo: '1', conta: 'ATIVO', nivel: 1, saldoAnterior: 0, debitos: 1250000, creditos: 212500, saldoAtual: 1037500 },
  { codigo: '1.1', conta: 'ATIVO CIRCULANTE', nivel: 2, saldoAnterior: 0, debitos: 595000, creditos: 112500, saldoAtual: 482500 },
  { codigo: '1.1.01', conta: 'Caixa e Equivalentes', nivel: 3, saldoAnterior: 0, debitos: 280000, creditos: 55000, saldoAtual: 225000 },
  { codigo: '1.1.02', conta: 'Contas a Receber', nivel: 3, saldoAnterior: 0, debitos: 189500, creditos: 45000, saldoAtual: 144500 },
  { codigo: '1.1.03', conta: 'Estoques', nivel: 3, saldoAnterior: 0, debitos: 125500, creditos: 12500, saldoAtual: 113000 },
  { codigo: '1.2', conta: 'ATIVO NÃO CIRCULANTE', nivel: 2, saldoAnterior: 0, debitos: 655000, creditos: 100000, saldoAtual: 555000 },
  { codigo: '2', conta: 'PASSIVO', nivel: 1, saldoAnterior: 0, debitos: 95000, creditos: 540000, saldoAtual: 445000 },
  { codigo: '2.1', conta: 'PASSIVO CIRCULANTE', nivel: 2, saldoAnterior: 0, debitos: 65000, creditos: 280000, saldoAtual: 215000 },
  { codigo: '2.2', conta: 'PASSIVO NÃO CIRCULANTE', nivel: 2, saldoAnterior: 0, debitos: 30000, creditos: 260000, saldoAtual: 230000 },
  { codigo: '3', conta: 'PATRIMÔNIO LÍQUIDO', nivel: 1, saldoAnterior: 0, debitos: 0, creditos: 497500, saldoAtual: 497500 },
  { codigo: '4', conta: 'RECEITAS', nivel: 1, saldoAnterior: 0, debitos: 25000, creditos: 850000, saldoAtual: 825000 },
  { codigo: '5', conta: 'DESPESAS', nivel: 1, saldoAnterior: 0, debitos: 720000, creditos: 15000, saldoAtual: 705000 },
];

export default function Balancete() {
  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalDebitos = balanceteData.filter(d => d.nivel === 1).reduce((sum, item) => sum + item.debitos, 0);
  const totalCreditos = balanceteData.filter(d => d.nivel === 1).reduce((sum, item) => sum + item.creditos, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Balancete de Verificação"
          description="Demonstração dos saldos das contas contábeis"
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
                <SelectItem value="2025-11">Novembro/2025</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="analitico">
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analitico">Analítico</SelectItem>
                <SelectItem value="sintetico">Sintético</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => showPrintToast()}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline" onClick={() => showExportToast('Excel')}>
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Balancete - Janeiro/2026</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead className="text-right">Saldo Anterior</TableHead>
                  <TableHead className="text-right">Débitos</TableHead>
                  <TableHead className="text-right">Créditos</TableHead>
                  <TableHead className="text-right">Saldo Atual</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceteData.map((item, index) => (
                  <TableRow key={index} className={item.nivel === 1 ? 'bg-muted/50 font-semibold' : item.nivel === 2 ? 'font-medium' : ''}>
                    <TableCell className="font-mono">{item.codigo}</TableCell>
                    <TableCell style={{ paddingLeft: `${(item.nivel - 1) * 20 + 16}px` }}>
                      {item.conta}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(item.saldoAnterior)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.debitos)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.creditos)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.saldoAtual)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-primary/10 font-bold">
                  <TableCell colSpan={2}>TOTAIS</TableCell>
                  <TableCell className="text-right">R$ 0,00</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalDebitos)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(totalCreditos)}</TableCell>
                  <TableCell className="text-right">-</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
