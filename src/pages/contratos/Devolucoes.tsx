import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { BackButton } from "@/components/common/BackButton";
import { DataTable } from "@/components/common/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, RotateCcw, Clock, CheckCircle } from "lucide-react";
import { useReturns, useCreateReturn, useUpdateReturn, useReturnsStats } from "@/hooks/useReturns";
import { useClients, useSuppliers } from "@/hooks/useCounterpartiesFiltered";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  aberto: 'Aberto',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  rejeitado: 'Rejeitado',
  concluido: 'Concluído',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  aberto: 'outline',
  em_analise: 'secondary',
  aprovado: 'default',
  rejeitado: 'destructive',
  concluido: 'default',
};

export default function Devolucoes() {
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo: 'produto' as 'produto' | 'fiscal',
    origem: 'venda' as 'venda' | 'compra',
    counterparty_id: null as string | null,
    motivo: '',
    observacoes: '',
    valor_total: null as number | null,
  });

  const { data: returns, isLoading } = useReturns({ 
    tipo: tipoFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: stats } = useReturnsStats();
  const { data: clients } = useClients();
  const { data: suppliers } = useSuppliers();
  const createReturn = useCreateReturn();
  const updateReturn = useUpdateReturn();

  const counterparties = formData.origem === 'venda' ? clients : suppliers;

  const handleNew = () => {
    setFormData({
      tipo: 'produto',
      origem: 'venda',
      counterparty_id: null,
      motivo: '',
      observacoes: '',
      valor_total: null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    await createReturn.mutateAsync({
      ...formData,
      documento_origem_id: null,
      data_solicitacao: format(new Date(), 'yyyy-MM-dd'),
      data_conclusao: null,
      status: 'aberto',
      dados_json: {},
    });
    setDialogOpen(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await updateReturn.mutateAsync({ 
      id, 
      status: status as 'aberto' | 'em_analise' | 'aprovado' | 'rejeitado' | 'concluido',
      data_conclusao: status === 'concluido' ? format(new Date(), 'yyyy-MM-dd') : null,
    });
  };

  const columns = [
    { 
      key: 'return_number', 
      header: 'Número',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        <span className="font-mono text-sm">{item.return_number}</span>
      )
    },
    { 
      key: 'tipo', 
      header: 'Tipo',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        <Badge variant="outline">
          {item.tipo === 'produto' ? 'Produto' : 'Fiscal'}
        </Badge>
      )
    },
    { 
      key: 'origem', 
      header: 'Origem',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        item.origem === 'venda' ? 'Venda' : 'Compra'
      )
    },
    { 
      key: 'counterparty', 
      header: 'Cliente/Fornecedor',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        item.counterparty?.name || '-'
      )
    },
    { 
      key: 'data_solicitacao', 
      header: 'Data',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        format(new Date(item.data_solicitacao), 'dd/MM/yyyy')
      )
    },
    { 
      key: 'motivo', 
      header: 'Motivo',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        <span className="line-clamp-1">{item.motivo}</span>
      )
    },
    { 
      key: 'status', 
      header: 'Status',
      render: (item: typeof returns extends (infer T)[] ? T : never) => (
        <Select value={item.status} onValueChange={(v) => handleStatusChange(item.id, v)}>
          <SelectTrigger className="w-[130px]">
            <Badge variant={STATUS_VARIANTS[item.status]}>{STATUS_LABELS[item.status]}</Badge>
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <BackButton to="/contratos" />
          <PageHeader title="Devoluções" description="Devoluções de produtos e fiscais" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Abertas</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.abertas || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Análise</CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.emAnalise || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(stats?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos</SelectItem>
              <SelectItem value="produto">Produto</SelectItem>
              <SelectItem value="fiscal">Fiscal</SelectItem>
            </SelectContent>
          </Select>
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
          <Button onClick={handleNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Devolução
          </Button>
        </div>

        <DataTable 
          data={returns || []} 
          columns={columns} 
          loading={isLoading}
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Devolução</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, tipo: v as 'produto' | 'fiscal' }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="produto">Produto</SelectItem>
                      <SelectItem value="fiscal">Fiscal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Origem</Label>
                  <Select 
                    value={formData.origem} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, origem: v as 'venda' | 'compra', counterparty_id: null }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="compra">Compra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{formData.origem === 'venda' ? 'Cliente' : 'Fornecedor'}</Label>
                <Select 
                  value={formData.counterparty_id || ''} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, counterparty_id: v || null }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {counterparties?.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motivo</Label>
                <Textarea 
                  value={formData.motivo} 
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))} 
                  placeholder="Descreva o motivo da devolução..."
                />
              </div>
              <div className="space-y-2">
                <Label>Valor Total (opcional)</Label>
                <Input 
                  type="number" 
                  value={formData.valor_total || ''} 
                  onChange={(e) => setFormData(prev => ({ ...prev, valor_total: parseFloat(e.target.value) || null }))} 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={createReturn.isPending || !formData.motivo}>
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
