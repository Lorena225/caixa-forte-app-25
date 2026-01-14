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
import { Search, Plus, MoreHorizontal, Eye, FileEdit, ArrowRight, Trash2, FileText, Clock, CheckCircle } from "lucide-react";
import { useVendas, SITUACAO_VENDA_LABELS } from "@/hooks/useVendas";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { PedidoFormModal } from "@/components/vendas/PedidoFormModal";

const SITUACAO_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  A: "secondary",   // Aberto
  P: "outline",     // Pendente/Aprovado
  F: "default",     // Convertido
  C: "destructive", // Reprovado/Cancelado
};

export default function Orcamentos() {
  const hoje = new Date();
  const [showModal, setShowModal] = useState(false);

  // Filtros
  const [search, setSearch] = useState("");
  const [situacao, setSituacao] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState(format(startOfMonth(hoje), 'yyyy-MM-dd'));
  const [dateTo, setDateTo] = useState(format(endOfMonth(hoje), 'yyyy-MM-dd'));

  // Data - apenas orçamentos (tipo = 'O')
  const { data: orcamentos = [], isLoading } = useVendas({
    tipo: 'O',
    situacao: situacao !== 'all' ? situacao : undefined,
    dateFrom,
    dateTo,
    search: search || undefined,
  });

  // Stats
  const totalOrcamentos = orcamentos.length;
  const abertos = orcamentos.filter(o => o.situacao === 'A').length;
  const aprovados = orcamentos.filter(o => o.situacao === 'P').length;
  const valorTotal = orcamentos.reduce((sum, o) => sum + Number(o.valor_total || 0), 0);

  // Handlers
  const handleConverterVenda = (orcamentoId: string) => {
    toast.info("Conversão para venda em desenvolvimento");
  };

  // Colunas da tabela
  const columns = [
    {
      key: "numero",
      header: "Número",
      cell: (row: Record<string, unknown>) => (
        <span className="font-mono font-medium">{row.numero as string}</span>
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
      key: "data_validade",
      header: "Validade",
      cell: (row: Record<string, unknown>) => {
        if (!row.data_validade) return <span className="text-muted-foreground">-</span>;
        const validade = new Date(row.data_validade as string);
        const vencido = validade < hoje;
        return (
          <span className={vencido ? "text-destructive" : ""}>
            {format(validade, 'dd/MM/yyyy', { locale: ptBR })}
          </span>
        );
      },
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
            <DropdownMenuItem onClick={() => toast.info("Visualização em desenvolvimento")}>
              <Eye className="mr-2 h-4 w-4" /> Visualizar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toast.info("Edição em desenvolvimento")}>
              <FileEdit className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleConverterVenda(row.id as string)}>
              <ArrowRight className="mr-2 h-4 w-4" /> Converter em Venda
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
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
          title="Orçamentos" 
          description="Propostas comerciais e cotações"
        >
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Novo Orçamento
          </Button>
        </PageHeader>

        <PedidoFormModal open={showModal} onOpenChange={setShowModal} tipo="O" />

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Orçamentos</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrcamentos}</div>
              <p className="text-xs text-muted-foreground">no período selecionado</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Em Aberto</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{abertos}</div>
              <p className="text-xs text-muted-foreground">aguardando aprovação</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aprovados</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{aprovados}</div>
              <p className="text-xs text-muted-foreground">prontos para converter</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
              <p className="text-xs text-muted-foreground">soma dos orçamentos</p>
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
              <Select value={situacao} onValueChange={setSituacao}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Situação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="A">Aberto</SelectItem>
                  <SelectItem value="P">Aprovado</SelectItem>
                  <SelectItem value="F">Convertido</SelectItem>
                  <SelectItem value="C">Reprovado</SelectItem>
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
              data={orcamentos}
              loading={isLoading}
            />
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
