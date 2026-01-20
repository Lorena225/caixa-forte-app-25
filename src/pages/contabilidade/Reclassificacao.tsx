import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Plus, Search, FileDown } from 'lucide-react';
import { useState } from 'react';

const mockReclassificacoes = [
  { id: '1', data: '2026-01-15', contaOrigem: '1.1.01.001', contaDestino: '1.1.02.001', valor: 15000, motivo: 'Correção de classificação', status: 'aprovado' },
  { id: '2', data: '2026-01-14', contaOrigem: '3.1.01.002', contaDestino: '3.1.02.001', valor: 8500, motivo: 'Reclassificação de despesa', status: 'pendente' },
  { id: '3', data: '2026-01-12', contaOrigem: '4.1.01.001', contaDestino: '4.1.02.001', valor: 25000, motivo: 'Ajuste contábil', status: 'aprovado' },
];

export default function Reclassificacao() {
  const [search, setSearch] = useState('');

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Reclassificação Contábil"
          description="Gerencie reclassificações entre contas contábeis"
        />

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar reclassificações..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <FileDown className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button className="bg-[#0085FF] hover:bg-[#0070DD]">
              <Plus className="h-4 w-4 mr-2" />
              Nova Reclassificação
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Reclassificações Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Conta Origem</TableHead>
                  <TableHead>Conta Destino</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockReclassificacoes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell className="font-mono text-sm">{item.contaOrigem}</TableCell>
                    <TableCell className="font-mono text-sm">{item.contaDestino}</TableCell>
                    <TableCell className="text-right">
                      {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell>{item.motivo}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === 'aprovado' ? 'default' : 'secondary'}>
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
