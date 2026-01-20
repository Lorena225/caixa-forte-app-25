import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { BackButton } from "@/components/common/BackButton";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, FileText, ArrowRight } from "lucide-react";
import { useQuotations } from "@/hooks/useQuotations";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  convertido: 'Convertido',
  expirado: 'Expirado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  rascunho: 'secondary',
  enviado: 'outline',
  aprovado: 'default',
  rejeitado: 'destructive',
  convertido: 'default',
  expirado: 'secondary',
};

export default function VendasCotacoes() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { quotations, isLoading, convertToPurchaseOrder } = useQuotations();

  const filteredQuotations = quotations?.filter(q => {
    if (statusFilter && q.status !== statusFilter) return false;
    if (search && !q.quote_number.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: quotations?.length || 0,
    abertas: quotations?.filter(q => ['rascunho', 'enviado'].includes(q.status)).length || 0,
    aprovadas: quotations?.filter(q => q.status === 'aprovado').length || 0,
    valorTotal: quotations?.reduce((sum, q) => sum + (q.valor_total || 0), 0) || 0,
  };

  const handleConvert = async (id: string) => {
    await convertToPurchaseOrder.mutateAsync(id);
  };

  const columns = [
    { 
      key: 'quote_number', 
      header: 'Número',
      render: (item: NonNullable<typeof quotations>[number]) => (
        <span className="font-mono text-sm">{item.quote_number}</span>
      )
    },
    { 
      key: 'counterparty', 
      header: 'Cliente',
      render: (item: NonNullable<typeof quotations>[number]) => (
        item.counterparty?.name || '-'
      )
    },
    { 
      key: 'data_emissao', 
      header: 'Emissão',
      render: (item: NonNullable<typeof quotations>[number]) => (
        format(new Date(item.data_emissao), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'data_validade', 
      header: 'Validade',
      render: (item: NonNullable<typeof quotations>[number]) => (
        item.data_validade ? format(new Date(item.data_validade), 'dd/MM/yyyy') : '-'
      )
    },
    { 
      key: 'valor_total', 
      header: 'Valor',
      render: (item: NonNullable<typeof quotations>[number]) => (
        (item.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: NonNullable<typeof quotations>[number]) => (
        <Badge variant={STATUS_VARIANTS[item.status] || 'secondary'}>
          {STATUS_LABELS[item.status] || item.status}
        </Badge>
      )
    },
    { 
      key: 'actions', 
      header: '',
      render: (item: NonNullable<typeof quotations>[number]) => (
        item.status === 'aprovado' && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleConvert(item.id)}
            disabled={convertToPurchaseOrder.isPending}
          >
            <ArrowRight className="h-4 w-4 mr-1" />
            Converter
          </Button>
        )
      )
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton to="/vendas" />
          <PageHeader title="Cotações" description="Propostas comerciais" />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
              <FileText className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.abertas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
              <FileText className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.aprovadas}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <FileText className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Cotação
          </Button>
        </div>

        <DataTable 
          data={filteredQuotations || []} 
          columns={columns} 
          loading={isLoading}
        />
      </div>
    </MainLayout>
  );
}
