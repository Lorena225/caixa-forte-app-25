import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Printer, Receipt } from 'lucide-react';
import { useState } from 'react';

const mockCupons = [
  { id: '1', numero: 'CF-001234', data: '2026-01-18 14:32', caixa: 'PDV-01', operador: 'Maria Silva', valor: 89.90, status: 'emitido' },
  { id: '2', numero: 'CF-001233', data: '2026-01-18 14:15', caixa: 'PDV-01', operador: 'Maria Silva', valor: 156.50, status: 'emitido' },
  { id: '3', numero: 'CF-001232', data: '2026-01-18 13:45', caixa: 'PDV-02', operador: 'João Santos', valor: 45.00, status: 'emitido' },
  { id: '4', numero: 'CF-001231', data: '2026-01-18 12:20', caixa: 'PDV-01', operador: 'Maria Silva', valor: 220.00, status: 'cancelado' },
];

export default function CupomFiscal() {
  const [search, setSearch] = useState('');

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Cupom Fiscal"
          description="Gestão de Cupons Fiscais emitidos"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Cupons Hoje</p>
                  <p className="text-2xl font-bold">87</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-2xl font-bold">R$ 12.450</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Printer className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">PDVs Ativos</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cupom fiscal..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cupons Fiscais</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Caixa</TableHead>
                  <TableHead>Operador</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockCupons.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.numero}</TableCell>
                    <TableCell>{item.data}</TableCell>
                    <TableCell>{item.caixa}</TableCell>
                    <TableCell>{item.operador}</TableCell>
                    <TableCell className="text-right">
                      {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'emitido' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
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
