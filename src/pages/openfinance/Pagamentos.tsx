import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/common/EmptyState";
import { usePaymentInstructions } from "@/hooks/useInnovationPlatform";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Send,
  Plus,
  QrCode,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Landmark,
  Copy,
  ArrowUpRight,
  Filter,
  FileText,
} from "lucide-react";

const STATUS_CONFIG = {
  draft: { label: "Rascunho", color: "bg-muted text-muted-foreground" },
  pending: { label: "Pendente", color: "bg-warning/10 text-warning" },
  processing: { label: "Processando", color: "bg-info/10 text-info" },
  completed: { label: "Concluído", color: "bg-success/10 text-success" },
  failed: { label: "Falhou", color: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

// Mock payment instructions
const MOCK_PAYMENTS = [
  {
    id: "1",
    payment_type: "pix",
    amount: 15000,
    beneficiary_name: "Fornecedor ABC Ltda",
    pix_key: "12.345.678/0001-99",
    pix_key_type: "cnpj",
    status: "completed",
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "2",
    payment_type: "pix",
    amount: 8500,
    beneficiary_name: "João Silva",
    pix_key: "joao@email.com",
    pix_key_type: "email",
    status: "processing",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "3",
    payment_type: "pix",
    amount: 25000,
    beneficiary_name: "Distribuidora XYZ",
    pix_key: "+55 11 98765-4321",
    pix_key_type: "phone",
    status: "pending",
    scheduled_date: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
  },
];

export default function OpenFinancePagamentos() {
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pixKeyType, setPixKeyType] = useState("cpf");
  const [formData, setFormData] = useState({
    beneficiary_name: "",
    pix_key: "",
    amount: "",
    description: "",
  });

  const { data: dbPayments = [], isLoading } = usePaymentInstructions();

  // Use mock data for demo
  const payments = MOCK_PAYMENTS.filter((p) => statusFilter === "all" || p.status === statusFilter);

  const totals = {
    completed: MOCK_PAYMENTS.filter((p) => p.status === "completed").reduce((s, p) => s + p.amount, 0),
    pending: MOCK_PAYMENTS.filter((p) => p.status === "pending" || p.status === "processing").reduce((s, p) => s + p.amount, 0),
  };

  const handleSubmitPayment = async () => {
    toast.info("Iniciando pagamento via Open Finance...");
    await new Promise((r) => setTimeout(r, 1500));
    toast.success("Pagamento enviado para autorização no banco!");
    setNewPaymentOpen(false);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Pagamentos via Pix / Open Finance"
          description="Inicie pagamentos diretamente do ERP usando Open Finance"
        >
          <Button onClick={() => setNewPaymentOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Pagamento Pix
          </Button>
        </PageHeader>

        {/* Summary */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{MOCK_PAYMENTS.length}</div>
              <p className="text-xs text-muted-foreground">este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(totals.completed)}</div>
              <p className="text-xs text-muted-foreground">pagos com sucesso</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pendentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{formatCurrency(totals.pending)}</div>
              <p className="text-xs text-muted-foreground">aguardando processamento</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Economia de Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">85%</div>
              <p className="text-xs text-muted-foreground">vs. processo manual</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Status:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="processing">Processando</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="failed">Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Payments Table */}
        {payments.length === 0 ? (
          <EmptyState
            icon={<Send className="h-8 w-8 text-muted-foreground" />}
            title="Nenhum pagamento encontrado"
            description="Inicie pagamentos via Pix diretamente do ERP usando Open Finance"
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beneficiário</TableHead>
                    <TableHead>Chave Pix</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.beneficiary_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{payment.pix_key}</span>
                          <Badge variant="outline" className="text-xs">{payment.pix_key_type}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG]?.color}>
                          {STATUS_CONFIG[payment.status as keyof typeof STATUS_CONFIG]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payment.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* New Payment Dialog */}
        <Dialog open={newPaymentOpen} onOpenChange={setNewPaymentOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Novo Pagamento Pix
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Beneficiário</Label>
                <Input
                  placeholder="Nome completo ou razão social"
                  value={formData.beneficiary_name}
                  onChange={(e) => setFormData({ ...formData, beneficiary_name: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Chave</Label>
                  <Select value={pixKeyType} onValueChange={setPixKeyType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cpf">CPF</SelectItem>
                      <SelectItem value="cnpj">CNPJ</SelectItem>
                      <SelectItem value="email">E-mail</SelectItem>
                      <SelectItem value="phone">Telefone</SelectItem>
                      <SelectItem value="evp">Chave Aleatória</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Chave Pix</Label>
                  <Input
                    placeholder="Digite a chave Pix"
                    value={formData.pix_key}
                    onChange={(e) => setFormData({ ...formData, pix_key: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  placeholder="Motivo do pagamento"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setNewPaymentOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmitPayment} className="gap-2">
                <ArrowUpRight className="h-4 w-4" />
                Enviar para Autorização
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
