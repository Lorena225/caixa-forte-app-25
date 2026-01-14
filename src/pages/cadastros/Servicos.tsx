import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useProdutos, Produto, useDeleteProduto } from '@/hooks/useProdutos';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Trash2, Search, Wrench, Star } from 'lucide-react';
import { ServicoFormDialog } from '@/components/erp/ServicoFormDialog';
import { formatCurrency } from '@/lib/formatters';

export default function Servicos() {
  const { currentCompany } = useAuth();
  const { data: servicos = [], isLoading } = useProdutos(currentCompany?.id, 'S');
  const deleteProduto = useDeleteProduto();
  const queryClient = useQueryClient();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Produto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSituacao, setFilterSituacao] = useState<'all' | 'A' | 'I'>('all');

  // Filtragem
  const filteredData = servicos.filter((item) => {
    if (filterSituacao !== 'all' && item.situacao !== filterSituacao) return false;

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        item.descricao.toLowerCase().includes(search) ||
        item.codigo.toLowerCase().includes(search) ||
        (item.codigo_servico && item.codigo_servico.includes(search))
      );
    }

    return true;
  });

  const handleEdit = (item: Produto) => {
    setEditingItem(item);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Deseja realmente excluir este serviço?')) {
      deleteProduto.mutate(id);
    }
  };

  const columns = [
    {
      key: 'codigo',
      header: 'Código',
      render: (item: Produto) => (
        <span className="font-mono text-sm">{item.codigo}</span>
      ),
      className: 'w-24',
    },
    {
      key: 'descricao',
      header: 'Descrição',
      render: (item: Produto) => (
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-muted-foreground" />
          <span>{item.descricao}</span>
          {item.destaque && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
        </div>
      ),
    },
    {
      key: 'unidade',
      header: 'UN',
      render: (item: Produto) => (
        <Badge variant="outline">{item.unidade}</Badge>
      ),
      className: 'w-16',
    },
    {
      key: 'codigo_servico',
      header: 'Cód. Serviço',
      render: (item: Produto) => item.codigo_servico || '-',
      className: 'w-28',
    },
    {
      key: 'aliquota_iss',
      header: 'ISS %',
      render: (item: Produto) => (
        <span className="text-muted-foreground">
          {item.aliquota_iss ? `${item.aliquota_iss}%` : '-'}
        </span>
      ),
      className: 'w-20',
    },
    {
      key: 'preco_venda',
      header: 'Preço',
      render: (item: Produto) => (
        <span className="font-medium">
          {item.preco_venda ? formatCurrency(item.preco_venda) : '-'}
        </span>
      ),
      className: 'w-28',
    },
    {
      key: 'situacao',
      header: 'Status',
      render: (item: Produto) => (
        <Badge variant={item.situacao === 'A' ? 'default' : 'secondary'}>
          {item.situacao === 'A' ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      className: 'w-20',
    },
    {
      key: 'actions',
      header: '',
      render: (item: Produto) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(item);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete(item.id);
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ),
      className: 'w-24',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Serviços"
          description="Cadastro de serviços com informações fiscais (ISS)"
          action={{ label: 'Novo Serviço', onClick: handleNew }}
        />

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por código, descrição ou código de serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={filterSituacao}
            onValueChange={(value: 'all' | 'A' | 'I') => setFilterSituacao(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Situação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="A">Ativos</SelectItem>
              <SelectItem value="I">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <DataTable
          columns={columns}
          data={filteredData}
          loading={isLoading}
          emptyMessage="Nenhum serviço cadastrado"
          pageSize={20}
        />

        {/* Dialog de formulário */}
        {currentCompany && (
          <ServicoFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            servico={editingItem}
            empresaId={currentCompany.id}
          />
        )}
      </div>
    </MainLayout>
  );
}
