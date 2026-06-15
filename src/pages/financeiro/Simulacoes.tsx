import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/common/EmptyState";
import { formatCurrency } from "@/lib/formatters";
import { useFinancialScenarios, useCreateScenario } from "@/hooks/useInnovationPlatform";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Brain,
  Plus,
  Play,
  TrendingUp,
  TrendingDown,
  Calculator,
  AlertTriangle,
  Sparkles,
  RefreshCw,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Calendar,
  Percent,
} from "lucide-react";

// Mock projection data for demonstration
const generateProjectionData = (baseBalance: number, costReduction: number, priceIncrease: number) => {
  const data = [];
  let balance = baseBalance;
  for (let i = 0; i <= 90; i += 7) {
    const weeklyInflow = 50000 * (1 + priceIncrease / 100) * (1 + Math.random() * 0.1);
    const weeklyOutflow = 40000 * (1 - costReduction / 100) * (1 + Math.random() * 0.1);
    balance += weeklyInflow - weeklyOutflow;
    data.push({
      day: i,
      label: `Dia ${i}`,
      saldo: Math.round(balance),
      entradas: Math.round(weeklyInflow),
      saidas: Math.round(weeklyOutflow),
    });
  }
  return data;
};

export default function Simulacoes() {
  const [activeTab, setActiveTab] = useState("forecast");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // Simulation parameters
  const [costReduction, setCostReduction] = useState(0);
  const [priceIncrease, setPriceIncrease] = useState(0);
  const [collectionDays, setCollectionDays] = useState(30);
  const [paymentDays, setPaymentDays] = useState(45);
  const [horizonDays, setHorizonDays] = useState(90);

  const { data: scenarios = [], isLoading } = useFinancialScenarios();
  const createScenario = useCreateScenario();

  const projectionData = generateProjectionData(100000, costReduction, priceIncrease);

  const handleRunSimulation = async () => {
    setIsSimulating(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 2000));
    setIsSimulating(false);
    toast.success("Simulação concluída! Análise gerada pela IA.");
  };

  const handleCreateScenario = async () => {
    try {
      await createScenario.mutateAsync({
        name: `Cenário ${format(new Date(), "dd/MM HH:mm")}`,
        scenario_type: "what_if",
        horizon_days: horizonDays,
        parameters_json: { costReduction, priceIncrease, collectionDays, paymentDays },
      });
      setCreateDialogOpen(false);
      toast.success("Cenário salvo com sucesso!");
    } catch {
      toast.error("Erro ao salvar cenário");
    }
  };

  const finalBalance = projectionData[projectionData.length - 1]?.saldo || 0;
  const initialBalance = projectionData[0]?.saldo || 0;
  const balanceChange = finalBalance - initialBalance;
  const balanceChangePercent = initialBalance > 0 ? ((balanceChange / initialBalance) * 100).toFixed(1) : 0;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in form-surface">
        <PageHeader
          title="Simulações & Cenários"
          description="Previsão de fluxo de caixa e simulações 'E Se' com IA"
        >
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Cenário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Cenário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Horizonte de Previsão</Label>
                  <Select value={String(horizonDays)} onValueChange={(v) => setHorizonDays(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                      <SelectItem value="180">180 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreateScenario} className="w-full" disabled={createScenario.isPending}>
                  {createScenario.isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar Cenário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="forecast" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              Previsão 30/60/90
            </TabsTrigger>
            <TabsTrigger value="whatif" className="gap-1.5">
              <Calculator className="h-4 w-4" />
              Simulação "E Se"
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Cenários Salvos
            </TabsTrigger>
          </TabsList>

          {/* FORECAST TAB */}
          <TabsContent value="forecast" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(initialBalance)}</div>
                  <p className="text-xs text-muted-foreground">Posição inicial</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Projetado (90d)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(finalBalance)}</div>
                  <div className="flex items-center gap-1 text-xs">
                    {balanceChange >= 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-success" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-destructive" />
                    )}
                    <span className={balanceChange >= 0 ? "text-success" : "text-destructive"}>
                      {balanceChangePercent}%
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Entradas Previstas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">
                    {formatCurrency(projectionData.reduce((s, d) => s + d.entradas, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">Próximos 90 dias</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Saídas Previstas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">
                    {formatCurrency(projectionData.reduce((s, d) => s + d.saidas, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground">Próximos 90 dias</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Projeção de Fluxo de Caixa
                </CardTitle>
                <CardDescription>Previsão baseada em dados históricos e sazonalidade</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={projectionData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" className="text-xs" />
                      <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={(label) => label}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                      <Area
                        type="monotone"
                        dataKey="saldo"
                        name="Saldo Projetado"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary) / 0.2)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium mb-1 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Análise da IA
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Com base nos dados históricos e vencimentos programados, o fluxo de caixa tende a se manter positivo 
                      nos próximos 90 dias. Há concentração de pagamentos na segunda quinzena de cada mês. 
                      Recomenda-se negociar prazos maiores com os 3 principais fornecedores para suavizar o fluxo.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WHAT-IF TAB */}
          <TabsContent value="whatif" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Parâmetros
                  </CardTitle>
                  <CardDescription>Ajuste os cenários para simular</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-success" />
                        Redução de Custos
                      </Label>
                      <Badge variant="outline">{costReduction}%</Badge>
                    </div>
                    <Slider
                      value={[costReduction]}
                      onValueChange={([v]) => setCostReduction(v)}
                      max={30}
                      step={1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        Aumento de Preços
                      </Label>
                      <Badge variant="outline">{priceIncrease}%</Badge>
                    </div>
                    <Slider
                      value={[priceIncrease]}
                      onValueChange={([v]) => setPriceIncrease(v)}
                      max={20}
                      step={1}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Prazo Médio Recebimento
                      </Label>
                      <Badge variant="outline">{collectionDays} dias</Badge>
                    </div>
                    <Slider
                      value={[collectionDays]}
                      onValueChange={([v]) => setCollectionDays(v)}
                      min={15}
                      max={90}
                      step={5}
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Prazo Médio Pagamento
                      </Label>
                      <Badge variant="outline">{paymentDays} dias</Badge>
                    </div>
                    <Slider
                      value={[paymentDays]}
                      onValueChange={([v]) => setPaymentDays(v)}
                      min={15}
                      max={90}
                      step={5}
                    />
                  </div>

                  <Button onClick={handleRunSimulation} className="w-full gap-2" disabled={isSimulating}>
                    {isSimulating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Executar Simulação
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Resultado da Simulação</CardTitle>
                  <CardDescription>
                    Impacto no fluxo de caixa com os parâmetros ajustados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="label" className="text-xs" />
                        <YAxis tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} className="text-xs" />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend />
                        <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                        <Area
                          type="monotone"
                          dataKey="saldo"
                          name="Saldo Simulado"
                          stroke="hsl(var(--success))"
                          fill="hsl(var(--success) / 0.2)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 mt-6">
                    <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                      <div className="flex items-center gap-2 text-success mb-1">
                        <ArrowUpRight className="h-4 w-4" />
                        <span className="text-sm font-medium">Economia Projetada</span>
                      </div>
                      <div className="text-xl font-bold">
                        {formatCurrency((costReduction / 100) * 360000)}
                      </div>
                      <p className="text-xs text-muted-foreground">em 90 dias</p>
                    </div>
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <div className="flex items-center gap-2 text-primary mb-1">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm font-medium">Receita Adicional</span>
                      </div>
                      <div className="text-xl font-bold">
                        {formatCurrency((priceIncrease / 100) * 450000)}
                      </div>
                      <p className="text-xs text-muted-foreground">em 90 dias</p>
                    </div>
                    <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
                      <div className="flex items-center gap-2 text-warning mb-1">
                        <Target className="h-4 w-4" />
                        <span className="text-sm font-medium">Impacto NCG</span>
                      </div>
                      <div className="text-xl font-bold">
                        {paymentDays - collectionDays > 0 ? "+" : ""}{paymentDays - collectionDays} dias
                      </div>
                      <p className="text-xs text-muted-foreground">ciclo financeiro</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* HISTORY TAB */}
          <TabsContent value="history">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : scenarios.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-8 w-8 text-muted-foreground" />}
                title="Nenhum cenário salvo"
                description="Crie simulações e salve cenários para análise posterior"
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {scenarios.map((scenario) => (
                  <Card key={scenario.id} className="card-hover">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{scenario.name}</CardTitle>
                        <Badge variant={scenario.status === "completed" ? "default" : "secondary"}>
                          {scenario.status}
                        </Badge>
                      </div>
                      <CardDescription>
                        {format(new Date(scenario.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>Tipo: {scenario.scenario_type}</p>
                        <p>Horizonte: {scenario.horizon_days} dias</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
