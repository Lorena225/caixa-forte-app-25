import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, TrendingUp, Award, Users } from "lucide-react";
import { useSalesGoals, useSellers } from "@/hooks/useCRM";

export default function Metas() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState<number | undefined>(currentMonth);
  
  const { data: goals = [], createGoal, updateGoal } = useSalesGoals({ 
    year, 
    month 
  });
  const { data: sellers = [] } = useSellers();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    seller_id: "",
    goal_type: "revenue",
    period_type: "monthly",
    target_amount: "",
    period_year: currentYear,
    period_month: currentMonth,
  });

  const handleCreate = () => {
    if (!formData.seller_id || !formData.target_amount) return;
    createGoal.mutate({
      seller_id: formData.seller_id,
      goal_type: formData.goal_type,
      period_type: formData.period_type,
      target_amount: parseFloat(formData.target_amount),
      period_year: formData.period_year,
      period_month: formData.period_month,
    });
    setIsOpen(false);
    setFormData({
      seller_id: "",
      goal_type: "revenue",
      period_type: "monthly",
      target_amount: "",
      period_year: currentYear,
      period_month: currentMonth,
    });
  };

  const totalTarget = goals.reduce((sum, g) => sum + (g.target_amount || 0), 0);
  const totalAchieved = goals.reduce((sum, g) => sum + (g.achieved_amount || 0), 0);
  const overallProgress = totalTarget > 0 ? (totalAchieved / totalTarget) * 100 : 0;

  const goalsAchieved = goals.filter(g => g.achievement_percent >= 100).length;

  const months = [
    { value: 1, label: "Janeiro" },
    { value: 2, label: "Fevereiro" },
    { value: 3, label: "Março" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Maio" },
    { value: 6, label: "Junho" },
    { value: 7, label: "Julho" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Setembro" },
    { value: 10, label: "Outubro" },
    { value: 11, label: "Novembro" },
    { value: 12, label: "Dezembro" },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader title="Metas de Vendas" description="Acompanhamento de metas da equipe comercial">
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Nova Meta</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova Meta</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Vendedor *</Label>
                  <Select value={formData.seller_id} onValueChange={v => setFormData({...formData, seller_id: v})}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {sellers.filter(s => s.is_active).map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>Ano</Label>
                    <Select 
                      value={formData.period_year.toString()} 
                      onValueChange={v => setFormData({...formData, period_year: parseInt(v)})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                          <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Mês</Label>
                    <Select 
                      value={formData.period_month.toString()} 
                      onValueChange={v => setFormData({...formData, period_month: parseInt(v)})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {months.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Meta (R$) *</Label>
                  <Input 
                    type="number"
                    value={formData.target_amount}
                    onChange={e => setFormData({...formData, target_amount: e.target.value})}
                  />
                </div>
                <Button onClick={handleCreate} disabled={!formData.seller_id || !formData.target_amount}>
                  Criar Meta
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        {/* Filters */}
        <Card>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-4">
              <Select value={year.toString()} onValueChange={v => setYear(parseInt(v))}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[currentYear - 1, currentYear, currentYear + 1].map(y => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={month?.toString() || ""} onValueChange={v => setMonth(v ? parseInt(v) : undefined)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os meses</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" /> Meta Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totalTarget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Realizado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {totalAchieved.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Award className="h-4 w-4" /> Progresso Geral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overallProgress.toFixed(1)}%</div>
              <Progress value={Math.min(overallProgress, 100)} className="mt-2" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" /> Metas Atingidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goalsAchieved}/{goals.length}</div>
              <p className="text-xs text-muted-foreground">vendedores no target</p>
            </CardContent>
          </Card>
        </div>

        {/* Goals Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">Nenhuma meta definida para o período</p>
                <Button variant="outline" onClick={() => setIsOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Criar Meta
                </Button>
              </CardContent>
            </Card>
          ) : (
            goals.map(goal => {
              const progress = goal.achievement_percent || 0;
              const isAchieved = progress >= 100;
              return (
                <Card key={goal.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{goal.seller?.name || "Geral"}</CardTitle>
                      {isAchieved && (
                        <Badge className="bg-emerald-500">
                          <Award className="mr-1 h-3 w-3" /> Atingida
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {months.find(m => m.value === goal.period_month)?.label || ""} {goal.period_year}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Meta</span>
                      <span className="font-medium">
                        {goal.target_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Realizado</span>
                      <span className={`font-medium ${isAchieved ? 'text-emerald-600' : ''}`}>
                        {goal.achieved_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                    <Progress value={Math.min(progress, 100)} className="h-2" />
                    <div className="text-center text-lg font-bold">
                      {progress.toFixed(1)}%
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
