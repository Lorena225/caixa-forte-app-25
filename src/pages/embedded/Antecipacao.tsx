import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/EmptyState";
import { useAnticipationOperations } from "@/hooks/useInnovationPlatform";
import { formatCurrency } from "@/lib/formatters";
import { format, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Banknote,
  Calculator,
  Clock,
  CheckCircle2,
  ArrowRight,
  Percent,
  Calendar,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  FileText,
  Sparkles,
} from "lucide-react";

// Mock receivables for anticipation
const MOCK_RECEIVABLES = [
  { id: "1", customer: "Cliente ABC", due_date: addDays(new Date(), 30), amount: 15000, status: "pending" },
  { id: "2", customer: "Empresa XYZ", due_date: addDays(new Date(), 45), amount: 28000, status: "pending" },
  { id: "3", customer: "Loja 123", due_date: addDays(new Date(), 60), amount: 12500, status: "pending" },
  { id: "4", customer: "Distribuidora", due_date: addDays(new Date(), 15), amount: 8000, status: "pending" },
  { id: "5", customer: "Atacado Plus", due_date: addDays(new Date(), 75), amount: 35000, status: "pending" },
];

const MOCK_OPERATIONS = [
  {
    id: "1",
    total_face_value: 45000,
    total_anticipation_value: 43200,
    discount_rate: 1.8,
    net_amount: 43200,
    status: "disbursed",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "2",
    total_face_value: 28000,
    total_anticipation_value: 27100,
    discount_rate: 2.1,
    net_amount: 27100,
    status: "completed",
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
];

const STATUS_CONFIG = {
  simulated: { label: "Simulado", color: "bg-muted text-muted-foreground" },
  requested: { label: "Solicitado", color: "bg-warning/10 text-warning" },
  approved: { label: "Aprovado", color: "bg-info/10 text-info" },
  disbursed: { label: "Liberado", color: "bg-success/10 text-success" },
  completed: { label: "Concluído", color: "bg-success/10 text-success" },
  cancelled: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

export default function Antecipacao() {
  const [selectedReceivables, setSelectedReceivables] = useState<string[]>([]);
  const [simulationDialogOpen, setSimulationDialogOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<{
    faceValue: number;
    netValue: number;
    discountRate: number;
    fee: number;
    iof: number;
  } | null>(null);

  const { data: operations = [], isLoading } = useAnticipationOperations();

  // Use mock data
  const displayOperations = MOCK_OPERATIONS;

  const selectedTotal = MOCK_RECEIVABLES
    .filter((r) => selectedReceivables.includes(r.id))
    .reduce((s, r) => s + r.amount, 0);

  const eligibleTotal = MOCK_RECEIVABLES.reduce((s, r) => s + r.amount, 0);

  const handleSelectReceivable = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedReceivables([...selectedReceivables, id]);
    } else {
      setSelectedReceivables(selectedReceivables.filter((r) => r !== id));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReceivables(MOCK_RECEIVABLES.map((r) => r.id));
    } else {
      setSelectedReceivables([]);
    }
  };

  const handleSimulate = async () => {
    setIsSimulating(true);
    // Calculate simulation based on selected receivables
    const selected = MOCK_RECEIVABLES.filter((r) => selectedReceivables.includes(r.id));
    const faceValue = selected.reduce((s, r) => s + r.amount, 0);
    
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 1500));

    // Calculate based on average days to due date
    const avgDays = selected.reduce((s, r) => s + differenceInDays(r.due_date, new Date()), 0) / selected.length;
    const discountRate = 1.5 + (avgDays / 100); // Dynamic rate based on term
    const fee = faceValue * 0.005; // 0.5% fee
    const iof = faceValue * 0.0038 * avgDays; // IOF calculation
    const totalDiscount = faceValue * (discountRate / 100) * (avgDays / 30) + fee + iof;
    const netValue = faceValue - totalDiscount;

    setSimulationResult({
      faceValue,
      netValue,
      discountRate,
      fee,
      iof,
    });
    setIsSimulating(false);
    setSimulationDialogOpen(true);
  };

  const handleConfirmAnticipation = () => {
    toast.success("Solicitação de antecipação enviada com sucesso!");
    setSimulationDialogOpen(false);
    setSelectedReceivables([]);
    setSimulationResult(null);
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Antecipação de Recebíveis"
          description="Antecipe seus recebíveis e melhore seu fluxo de caixa"
        >
          <Button
            onClick={handleSimulate}
            disabled={selectedReceivables.length === 0}
            className="gap-2"
          >
            <Calculator className="h-4 w-4" />
            Simular Antecipação
          </Button>
        </PageHeader>

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Elegíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(eligibleTotal)}</div>
              <p className="text-xs text-muted-foreground">{MOCK_RECEIVABLES.length} títulos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selecionados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(selectedTotal)}</div>
              <p className="text-xs text-muted-foreground">{selectedReceivables.length} títulos</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Já Antecipado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {formatCurrency(MOCK_OPERATIONS.reduce((s, o) => s + o.net_amount, 0))}
              </div>
              <p className="text-xs text-muted-foreground">este mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Taxa Média</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1.8% a.m.</div>
              <p className="text-xs text-muted-foreground">negociável</p>
            </CardContent>
          </Card>
        </div>

        {/* Receivables Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Títulos Elegíveis para Antecipação</CardTitle>
                <CardDescription>Selecione os títulos que deseja antecipar</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={selectedReceivables.length === MOCK_RECEIVABLES.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm">Selecionar todos</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_RECEIVABLES.map((receivable) => {
                  const daysToMaturity = differenceInDays(receivable.due_date, new Date());
                  return (
                    <TableRow key={receivable.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedReceivables.includes(receivable.id)}
                          onCheckedChange={(checked) => handleSelectReceivable(receivable.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{receivable.customer}</TableCell>
                      <TableCell>
                        {format(receivable.due_date, "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{daysToMaturity}d</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(receivable.amount)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Operation History */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Operações</CardTitle>
          </CardHeader>
          <CardContent>
            {displayOperations.length === 0 ? (
              <EmptyState
                icon={<Banknote className="h-8 w-8 text-muted-foreground" />}
                title="Nenhuma operação realizada"
                description="Suas operações de antecipação aparecerão aqui"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor Face</TableHead>
                    <TableHead>Valor Líquido</TableHead>
                    <TableHead>Taxa</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayOperations.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell>
                        {format(new Date(op.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{formatCurrency(op.total_face_value)}</TableCell>
                      <TableCell className="font-medium text-success">
                        {formatCurrency(op.net_amount)}
                      </TableCell>
                      <TableCell>{op.discount_rate.toFixed(2)}% a.m.</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[op.status as keyof typeof STATUS_CONFIG]?.color}>
                          {STATUS_CONFIG[op.status as keyof typeof STATUS_CONFIG]?.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Simulation Dialog */}
        <Dialog open={simulationDialogOpen} onOpenChange={setSimulationDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Simulação de Antecipação
              </DialogTitle>
              <DialogDescription>
                Confira as condições da operação
              </DialogDescription>
            </DialogHeader>

            {simulationResult && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor dos Títulos</span>
                    <span className="font-medium">{formatCurrency(simulationResult.faceValue)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Taxa ({simulationResult.discountRate.toFixed(2)}% a.m.)</span>
                    <span>- {formatCurrency(simulationResult.faceValue - simulationResult.netValue - simulationResult.fee - simulationResult.iof)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>Tarifa</span>
                    <span>- {formatCurrency(simulationResult.fee)}</span>
                  </div>
                  <div className="flex justify-between text-destructive">
                    <span>IOF</span>
                    <span>- {formatCurrency(simulationResult.iof)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between text-lg font-bold">
                    <span>Valor Líquido</span>
                    <span className="text-success">{formatCurrency(simulationResult.netValue)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm">Liberação em até 24h após aprovação</span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSimulationDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmAnticipation} className="gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Solicitar Antecipação
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
