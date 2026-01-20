import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, FileDown, FileText, Printer, Eye, Download } from 'lucide-react';
import { useState } from 'react';

const mockDANFE = [
  { id: '1', chaveAcesso: '35260112345678000195550010001234561234567890', numero: '123456', data: '2026-01-18', destinatario: 'Empresa ABC Ltda', valor: 15890.00 },
  { id: '2', chaveAcesso: '35260112345678000195550010001234571234567891', numero: '123457', data: '2026-01-17', destinatario: 'Comércio XYZ', valor: 8750.50 },
  { id: '3', chaveAcesso: '35260112345678000195550010001234581234567892', numero: '123458', data: '2026-01-16', destinatario: 'Indústria 123', valor: 45200.00 },
];

export default function DANFE() {
  const [search, setSearch] = useState('');

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="DANFE - Documento Auxiliar"
          description="Visualização e impressão de DANFEs em PDF"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">DANFEs Gerados</p>
                  <p className="text-2xl font-bold">1.458</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Printer className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Impressos Hoje</p>
                  <p className="text-2xl font-bold">23</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Download className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Downloads</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por chave de acesso ou número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <FileDown className="h-4 w-4 mr-2" />
            Exportar Lista
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>DANFEs Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número NF-e</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Destinatário</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mockDANFE.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono">{item.numero}</TableCell>
                    <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>{item.destinatario}</TableCell>
                    <TableCell className="text-right">
                      {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button variant="ghost" size="icon" title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Imprimir">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
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
