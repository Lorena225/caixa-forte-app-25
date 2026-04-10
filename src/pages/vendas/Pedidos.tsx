import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/common/DataTable";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, Plus, MoreHorizontal, Eye, FileEdit, X, Receipt, 
  ShoppingCart, DollarSign, Clock, CheckCircle, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendas, useVendasStats, SITUACAO_VENDA_LABELS, TIPO_VENDA_LABELS, useFaturarVenda } from "@/hooks/useVendas";
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { showDevelopmentToast } from '@/utils/devFeedback';
import { PedidoFormModal } from "@/components/vendas/PedidoFormModal";
import { NFeEmissaoModal } from "@/components/fiscal/NFeEmissaoModal";

const SITUACAO_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  A: "secondary", // Aberto/Rascunho
  P: "outline",   // Pendente
  F: "default",   // Faturado
  E: "default",   // Entregue
  C: "destructive", // Cancelado
};

export default function Pedidos() {
  const navigate = useNavigate();
  const hoje = new Date();

  // Modals
  const [showPedidoModal, setShowPedidoModal] = useState(false);
  const [showNFeModal, setShowNFeModal] = useState(false);
  const [selectedVendaId, setSelectedVendaId] = useState<string | undefined>();

  // Filtros
  const [search, setSearch] = useState("");
  const [situacao, setSituacao] = useState<string>("all");
  const [tipo, setTipo] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));

  // Data
  const { data: vendas = [], isLoading } = useVendas({
    tipo: tipo !== 'all' ? tipo : undefined,
    situacao: situacao !== 'all' ? situacao : undefined,
    dateFrom,
    dateTo,
    search: search || undefined,
  });

  const { data: statsHoje } = useVendasStats({
    from: format(startOfDay(hoje), 'yyyy-MM-dd'),
    to: format(endOfDay(hoje), 'yyyy-MM-dd'),
  });

  const { data: statsMes } = useVendasStats({
    from: format(startOfMonth(hoje), 'yyyy-MM-dd'),
    to: format(endOfMonth(hoje), 'yyyy-MM-dd'),
  });

  const faturarVenda = useFaturarVenda();

  // Handlers
  const handleFaturar = async (vendaId: string) => {
    try {
      await faturarVenda.mutateAsync(vendaId);
    } catch {
      // Toast já tratado no hook
    }
  };

  const handleCancelar = (vendaId: string) => {
    showDevelopmentToast('Cancelamento de pedido');
  };

  const handleVisualizar = (vendaId: string) => {
    showDevelopmentToast('Visualização de pedido');
  };

  const handleEditar = (vendaId: string) => {
    showDevelopmentToast('Edição de pedido');
  };

  const handleEmitirNFe = (vendaId: string) => {
    setSelectedVendaId(vendaId);
    setShowNFeModal(true);
  };

  // Colunas da tabela
  const columns = [
    {
      key: "numero",
      header: "Número",
      cell: (row: Record<string, unknown>) => (
        <div>
          <span className="font-mono font-medium">{row.numero as string}</span>
          <span className="text-muted-foreground text-xs ml-1">/{row.serie as string}</span>
        </div>
      ),
    },
    {
      key: "data_venda",
      header: "Data",
      cell: (row: Record<string, unknown>) => (
        <span className="text-sm">
          {format(new Date(row.data_venda as string), 'dd/MM/yyyy', { locale: ptBR })}
        </span>
      ),
    },
    {
      key: "tipo",
      header: "Tipo",
      cell: (row: Record<string, unknown>) => (
        <Badge variant="outline">
          {TIPO_VENDA_LABELS[row.tipo as string] || row.tipo as string}
        </Badge>
      ),
    },
    {
      key: "cliente_nome",
      header: "Cliente",
      cell: (row: Record<string, unknown>) => (
        <div className="max-w-[200px] truncate">
          {row.cliente_nome as string || '-'}
        </div>
      ),
    },
    {
      key: "valor_total",
      header: "Valor Total",
      cell: (row: Record<string, unknown>) => (
        <span className="font-semibold">
          {Number(row.valor_total || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </span>
      ),
    },
    {
      key: "situacao",
      header: "Situação",
      cell: (row: Record<string, unknown>) => (
        <Badge variant={SITUACAO_BADGE_VARIANT[row.situacao as string] || "secondary"}>
          {SITUACAO_VENDA_LABELS[row.situacao as string] || row.situacao as string}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row: Record<string, unknown>) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleVisualizar(row.id as string)}>
              <Eye className="mr-2 h-4 w-4" /> Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleEditar(row.id as string)}
              disabled={(row.situacao as string) === 'F' || (row.situacao as string) === 'C'}
            >
              <FileEdit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleFaturar(row.id as string)}
              disabled={(row.situacao as string) === 'F' || (row.situacao as string) === 'C'}
            >
              <Receipt className="mr-2 h-4 w-4" /> Faturar
            </DropdownMenuItem>
            {(row.situacao as string) === 'F' && (
              <DropdownMenuItem onClick={() => handleEmitirNFe(row.id as string)}>
                <FileText className="mr-2 h-4 w-4" /> Emitir NF-e
              </DropdownMenuItem>
            )}
            <DropdownMenuItem 
              onClick={() => handleCancelar(row.id as string)}
              className="text-destructive"
              disabled={(row.situacao as string) === 'C'}
            >
              <X className="mr-2 h-4 w-4" /> Cancelar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader 
          title="Pedidos de Venda" 
          description="Gerencie seus pedidos e vendas"
        >
          <Button onClick={() => setShowPedidoModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Pedido
          </Button>
        </PageHeader>

        {/* Modals */}
        <PedidoFormModal 
          open={showPedidoModal} 
          onOpenChange={setShowPedidoModal}
          tipo="P"
        />
        <NFeEmissaoModal
          open={showNFeModal}
          onOpenChange={setShowNFeModal}
          vendaId={selectedVendaId}
        />

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Hoje</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsHoje?.totalVendas || 0}</div>
              <p className="text-xs text-muted-foreground">
                {(statsHoje?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statsMes?.totalVendas || 0}</div>
              <p className="text-xs text-muted-foreground">
                {(statsMes?.valorTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {vendas.filter(v => v.situacao === 'P' || v.situacao === 'A').length}
              </div>
              <p className="text-xs text-muted-foreground">aguardando faturamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(statsMes?.ticketMedio || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">valor médio por venda</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por número ou cliente..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="V">Venda</SelectItem>
                  <SelectItem value="O">Orçamento</SelectItem>
                  <SelectItem value="P">Pedido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="A">Aberto</SelectItem>
                  <SelectItem value="P">Pendente</SelectItem>
                  <SelectItem value="F">Faturado</SelectItem>
                  <SelectItem value="E">Entregue</SelectItem>
                  <SelectItem value="C">Cancelado</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabela */}
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={vendas}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
