import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Search, ArrowUpCircle, ArrowDownCircle, ArrowRightLeft, Settings2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const tipoMovimentacao: Record<string, { label: string; icon: any; color: string }> = {
  entrada: { label: 'Entrada', icon: ArrowUpCircle, color: 'bg-green-100 text-green-800' },
  saida: { label: 'Saída', icon: ArrowDownCircle, color: 'bg-red-100 text-red-800' },
  transferencia: { label: 'Transferência', icon: ArrowRightLeft, color: 'bg-blue-100 text-blue-800' },
  ajuste: { label: 'Ajuste', icon: Settings2, color: 'bg-yellow-100 text-yellow-800' },
};

// Mock data
const mockMovimentacoes = [
  { id: '1', data: '2026-01-14T10:30:00', tipo: 'entrada', produto: 'Notebook Dell Inspiron', quantidade: 10, custo_unitario: 3500, documento: 'NF-e 1234', usuario: 'João Silva' },
  { id: '2', data: '2026-01-14T09:15:00', tipo: 'saida', produto: 'Mouse Logitech MX', quantidade: 5, custo_unitario: 350, documento: 'Venda 5678', usuario: 'Maria Santos' },
  { id: '3', data: '2026-01-13T16:45:00', tipo: 'transferencia', produto: 'Teclado Mecânico', quantidade: 20, custo_unitario: 250, documento: 'TR-001', usuario: 'Carlos Oliveira' },
  { id: '4', data: '2026-01-13T14:00:00', tipo: 'ajuste', produto: 'Cabo HDMI 2m', quantidade: -3, custo_unitario: 45, documento: 'INV-2026-01', usuario: 'Ana Costa' },
];

export default function Movimentacoes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [movimentacoes] = useState(mockMovimentacoes);

  const filteredMovimentacoes = movimentacoes.filter(mov => {
    const matchesSearch = mov.produto.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mov.documento?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === 'all' || mov.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  const columns = [
    {
      key: 'data',
      header: 'Data/Hora',
      cell: (row: any) => format(new Date(row.data), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    },
    {
      key: 'tipo',
      header: 'Tipo',
      cell: (row: any) => {
        const tipo = tipoMovimentacao[row.tipo];
        const Icon = tipo.icon;
        return (
          <Badge className={tipo.color}>
            <Icon className="h-3 w-3 mr-1" />
            {tipo.label}
          </Badge>
        );
      },
    },
    {
      key: 'produto',
      header: 'Produto',
      cell: (row: any) => <div className="font-medium">{row.produto}</div>,
    },
    {
      key: 'quantidade',
      header: 'Quantidade',
      cell: (row: any) => (
        <span className={row.quantidade > 0 ? 'text-green-600' : 'text-red-600'}>
          {row.quantidade > 0 ? '+' : ''}{row.quantidade}
        </span>
      ),
    },
    {
      key: 'custo_unitario',
      header: 'Custo Unit.',
      cell: (row: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.custo_unitario),
    },
    {
      key: 'documento',
      header: 'Documento',
      cell: (row: any) => row.documento || '-',
    },
    {
      key: 'usuario',
      header: 'Usuário',
      cell: (row: any) => row.usuario,
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Movimentações de Estoque"
          description="Histórico de entradas, saídas, transferências e ajustes"
        />

        {/* Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Entradas (Hoje)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+45</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Saídas (Hoje)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">-32</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Transferências</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">8</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ajustes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">3</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto ou documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="entrada">Entrada</SelectItem>
              <SelectItem value="saida">Saída</SelectItem>
              <SelectItem value="transferencia">Transferência</SelectItem>
              <SelectItem value="ajuste">Ajuste</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Movimentação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Movimentação</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Tipo de Movimentação</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="saida">Saída</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
                      <SelectItem value="ajuste">Ajuste</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Produto</Label>
                  <Input placeholder="Buscar produto..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantidade</Label>
                    <Input type="number" placeholder="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>Custo Unitário</Label>
                    <Input type="number" placeholder="0,00" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Documento de Referência</Label>
                  <Input placeholder="NF-e, Venda, etc." />
                </div>
                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea placeholder="Observações adicionais..." />
                </div>
                <Button className="w-full" onClick={() => setDialogOpen(false)}>
                  Registrar Movimentação
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredMovimentacoes}
          loading={false}
        />
      </div>
    </MainLayout>
  );
}
