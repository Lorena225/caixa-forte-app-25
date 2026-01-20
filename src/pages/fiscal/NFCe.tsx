import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, FileDown, Receipt, Eye } from 'lucide-react';
import { useState } from 'react';

const mockNFCe = [
  { id: '1', numero: '000123', serie: '1', data: '2026-01-18', cliente: 'Consumidor Final', valor: 156.90, status: 'autorizada' },
  { id: '2', numero: '000122', serie: '1', data: '2026-01-18', cliente: 'Consumidor Final', valor: 89.50, status: 'autorizada' },
  { id: '3', numero: '000121', serie: '1', data: '2026-01-17', cliente: 'João Silva', valor: 245.00, status: 'autorizada' },
  { id: '4', numero: '000120', serie: '1', data: '2026-01-17', cliente: 'Consumidor Final', valor: 78.30, status: 'cancelada' },
];

export default function NFCe() {
  const [search, setSearch] = useState('');

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="NFC-e - Nota Fiscal do Consumidor"
          description="Emissão e gestão de Notas Fiscais do Consumidor Eletrônicas"
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hoje</p>
                  <p className="text-2xl font-bold">42</p>
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
                  <p className="text-sm text-muted-foreground">Este Mês</p>
                  <p className="text-2xl font-bold">1.245</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Canceladas</p>
                  <p className="text-2xl font-bold">8</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Receipt className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Faturamento</p>
                  <p className="text-2xl font-bold">R$ 89.5k</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar NFC-e..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-[#0085FF] hover:bg-[#0070DD]">
              <Plus className="h-4 w-4 mr-2" />
              Emitir NFC-e
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>NFC-e Emitidas</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockNFCe.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.numero}</TableCell>
                    <TableCell>{item.serie}</TableCell>
                    <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{item.cliente}</TableCell>
                    <TableCell className="text-right">
                      {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'autorizada' ? 'default' : 'destructive'}>
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
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
