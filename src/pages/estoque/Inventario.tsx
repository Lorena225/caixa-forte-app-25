import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Plus, Search, ClipboardCheck, AlertTriangle, CheckCircle, Clock, Play } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pendente: { label: 'Pendente', color: 'bg-gray-100 text-gray-800', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: Play },
  concluido: { label: 'Concluído', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  divergente: { label: 'Divergências', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
};

// Mock data
const mockInventarios = [
  { 
    id: '1', 
    codigo: 'INV-2026-001', 
    descricao: 'Inventário Geral - Janeiro/2026',
    data_inicio: '2026-01-10',
    data_fim: null,
    status: 'em_andamento',
    total_itens: 248,
    itens_contados: 156,
    divergencias: 5,
    responsavel: 'João Silva'
  },
  { 
    id: '2', 
    codigo: 'INV-2025-012', 
    descricao: 'Inventário Mensal - Dezembro/2025',
    data_inicio: '2025-12-15',
    data_fim: '2025-12-18',
    status: 'concluido',
    total_itens: 245,
    itens_contados: 245,
    divergencias: 8,
    responsavel: 'Maria Santos'
  },
  { 
    id: '3', 
    codigo: 'INV-2025-011', 
    descricao: 'Inventário Parcial - Eletrônicos',
    data_inicio: '2025-11-20',
    data_fim: '2025-11-22',
    status: 'divergente',
    total_itens: 50,
    itens_contados: 50,
    divergencias: 12,
    responsavel: 'Carlos Oliveira'
  },
];

export default function Inventario() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [inventarios] = useState(mockInventarios);

  const filteredInventarios = inventarios.filter(inv => {
    const matchesSearch = inv.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      cell: (row: any) => <div className="font-medium font-mono">{row.codigo}</div>,
    },
    {
      key: 'descricao',
      header: 'Descrição',
      cell: (row: any) => row.descricao,
    },
    {
      key: 'data',
      header: 'Período',
      cell: (row: any) => (
        <div className="text-sm">
          <div>{format(new Date(row.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}</div>
          {row.data_fim && (
            <div className="text-muted-foreground">
              até {format(new Date(row.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'progresso',
      header: 'Progresso',
      cell: (row: any) => {
        const percentual = Math.round((row.itens_contados / row.total_itens) * 100);
        return (
          <div className="w-32 space-y-1">
            <div className="flex justify-between text-xs">
              <span>{row.itens_contados}/{row.total_itens}</span>
              <span>{percentual}%</span>
            </div>
            <Progress value={percentual} className="h-2" />
          </div>
        );
      },
    },
    {
      key: 'divergencias',
      header: 'Divergências',
      cell: (row: any) => (
        <span className={row.divergencias > 0 ? 'text-red-600 font-medium' : 'text-green-600'}>
          {row.divergencias}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (row: any) => {
        const status = statusConfig[row.status];
        const Icon = status.icon;
        return (
          <Badge className={status.color}>
            <Icon className="h-3 w-3 mr-1" />
            {status.label}
          </Badge>
        );
      },
    },
    {
      key: 'responsavel',
      header: 'Responsável',
      cell: (row: any) => row.responsavel,
    },
    {
      key: 'actions',
      header: 'Ações',
      cell: (row: any) => (
        <div className="flex gap-1">
          {row.status === 'em_andamento' && (
            <Button variant="outline" size="sm">
              Continuar
            </Button>
          )}
          {row.status === 'divergente' && (
            <Button variant="outline" size="sm">
              Resolver
            </Button>
          )}
          <Button variant="ghost" size="sm">
            Ver Detalhes
          </Button>
        </div>
      ),
    },
  ];

  // KPIs
  const emAndamento = inventarios.filter(i => i.status === 'em_andamento').length;
  const comDivergencias = inventarios.filter(i => i.status === 'divergente').length;
  const concluidos = inventarios.filter(i => i.status === 'concluido').length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Inventário"
          description="Contagens físicas e ajustes de estoque"
        />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Play className="h-4 w-4" />
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{emAndamento}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Com Divergências
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{comDivergencias}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Concluídos (Mês)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{concluidos}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4" />
                Acuracidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">96.5%</div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_andamento">Em Andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="divergente">Com Divergências</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Novo Inventário
          </Button>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredInventarios}
          loading={false}
        />
      </div>
    </MainLayout>
  );
}
