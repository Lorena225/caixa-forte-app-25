import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, DollarSign, Calculator, FileText, CheckCircle2, 
  Clock, TrendingUp, Users, AlertTriangle, Download,
  Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';
import { usePayroll } from '@/hooks/hcm/usePayroll';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { useTimeTracking } from '@/hooks/hcm/useTimeTracking';
import type { PayrollPeriod } from '@/hooks/hcm/usePayroll';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

// ─── Tabela INSS 2024 (progressiva) ───────────────────────────────────────────
function calcularINSS(salarioBruto: number): number {
  const faixas = [
    { limite: 1412.00, aliquota: 0.075 },
    { limite: 2666.68, aliquota: 0.09 },
    { limite: 4000.03, aliquota: 0.12 },
    { limite: 7786.02, aliquota: 0.14 },
  ];
  let inss = 0;
  let base = salarioBruto;
  let prev = 0;
  for (const faixa of faixas) {
    if (base <= 0) break;
    const porcao = Math.min(base, faixa.limite - prev);
    inss += porcao * faixa.aliquota;
    base -= porcao;
    prev = faixa.limite;
  }
  return Math.min(inss, 908.86);
}

// ─── Tabela IRRF 2024 ──────────────────────────────────────────────────────────
function calcularIRRF(baseCalculo: number): number {
  if (baseCalculo <= 2824.00) return 0;
  if (baseCalculo <= 3751.05) return baseCalculo * 0.075 - 211.80;
  if (baseCalculo <= 4664.68) return baseCalculo * 0.15 - 492.45;
  if (baseCalculo <= 7786.02) return baseCalculo * 0.225 - 839.17;
  return baseCalculo * 0.275 - 1228.47;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  rascunho: { label: 'Rascunho', color: 'bg-muted text-muted-foreground', icon: <FileText className="h-3 w-3" /> },
  calculando: { label: 'Calculando', color: 'bg-info/10 text-info', icon: <RefreshCw className="h-3 w-3 animate-spin" /> },
  preview: { label: 'Preview', color: 'bg-warning/10 text-warning', icon: <AlertTriangle className="h-3 w-3" /> },
  aprovado: { label: 'Aprovado', color: 'bg-success/10 text-success', icon: <CheckCircle2 className="h-3 w-3" /> },
  pago: { label: 'Pago', color: 'bg-primary/10 text-primary', icon: <DollarSign className="h-3 w-3" /> },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive', icon: null },
};

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FolhaInteligente() {
  const { payrollPeriods, payrollPeriodsLoading, createPayrollPeriod, commissions } = usePayroll();
  const { employees } = useEmployees();
  const { timeSummary } = useTimeTracking();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [calculating, setCalculating] = useState(false);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [formData, setFormData] = useState({
    reference_month: currentMonth,
    reference_year: currentYear,
    period_type: 'mensal',
    start_date: '',
    end_date: '',
    payment_date: '',
  });

  // Horas extras do mês atual (de time_daily_summary)
  const currentMonthSummary = timeSummary.filter(s => {
    const d = new Date(s.work_date);
    return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
  });
  const totalOvertime50h = currentMonthSummary.reduce((s, r) => s + (r.overtime_50 || 0), 0);
  const totalOvertime100h = currentMonthSummary.reduce((s, r) => s + (r.overtime_100 || 0), 0);
  const totalOvertimeHours = totalOvertime50h + totalOvertime100h;

  // Comissões pendentes do mês
  const pendingCommissions = commissions.filter(
    c => c.status === 'pending' && 
    c.reference_month === currentMonth && 
    c.reference_year === currentYear
  );
  const totalPendingCommissions = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0);

  const handleCreatePeriod = async () => {
    const startDate = new Date(formData.reference_year, formData.reference_month - 1, 1);
    const endDate = new Date(formData.reference_year, formData.reference_month, 0);
    
    await createPayrollPeriod.mutateAsync({
      reference_month: formData.reference_month,
      reference_year: formData.reference_year,
      period_type: formData.period_type,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      payment_date: formData.payment_date || null,
    });
    setDialogOpen(false);
  };

  const handleApprove = async (periodId: string) => {
    try {
      const { error } = await supabase
        .from('payroll_periods')
        .update({ status: 'aprovado' as const, approved_at: new Date().toISOString() })
        .eq('id', periodId);
      if (error) throw error;
      await supabase.from('payroll_entries').update({ status: 'aprovado' as const }).eq('period_id', periodId);
      toast.success('Folha aprovada com sucesso!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aprovar folha');
    }
  };

  const handleDownload = (period: PayrollPeriod) => {
    toast.info('Gerando holerites em PDF... Em breve disponível para download.');
  };

  const handleCalculate = async (periodId: string) => {
    setCalculating(true);
    try {
      // Update period status to 'calculando'
      const { error: updateErr } = await supabase
        .from('payroll_periods')
        .update({ status: 'calculando' as const })
        .eq('id', periodId);
      if (updateErr) throw updateErr;

      // Buscar resumo de ponto do período
      const period = payrollPeriods.find(p => p.id === periodId);
      const periodStart = period?.start_date;
      const periodEnd = period?.end_date;
      const periodSummary = timeSummary.filter(s =>
        periodStart && periodEnd &&
        s.work_date >= periodStart && s.work_date <= periodEnd
      );

      // Generate payroll entries for each active employee
      const activeEmployees = employees.filter(e => e.status === 'ativo');
      const entries = activeEmployees.map(emp => {
        const empPonto = periodSummary.filter(s => s.employee_id === emp.id);
        const workedDays = empPonto.filter(s => !s.absence_type && (s.worked_hours || 0) > 0).length || 22;
        const hourlyRate = (emp.base_salary || 0) / 220;

        const ot50h = empPonto.reduce((s, r) => s + (r.overtime_50 || 0), 0);
        const ot100h = empPonto.reduce((s, r) => s + (r.overtime_100 || 0), 0);
        const nightH = empPonto.reduce((s, r) => s + (r.night_hours || 0), 0);

        const ot50Amt = ot50h * hourlyRate * 1.5;
        const ot100Amt = ot100h * hourlyRate * 2;
        const nightAmt = nightH * hourlyRate * 0.2;

        const commissionAmt = commissions
          .filter(c => c.employee_id === emp.id && c.status === 'pending')
          .reduce((sum, c) => sum + c.commission_amount, 0);

        const totalEarnings = (emp.base_salary || 0) + ot50Amt + ot100Amt + nightAmt + commissionAmt;
        const inss = calcularINSS(totalEarnings);
        const irrf = calcularIRRF(totalEarnings - inss);
        const fgts = totalEarnings * 0.08;
        const totalDeductions = inss + irrf;
        const netSalary = totalEarnings - totalDeductions;

        return {
          company_id: emp.company_id,
          period_id: periodId,
          employee_id: emp.id,
          base_salary: emp.base_salary,
          worked_days: workedDays,
          salary_amount: emp.base_salary,
          overtime_50_hours: ot50h,
          overtime_50_amount: ot50Amt,
          overtime_100_hours: ot100h,
          overtime_100_amount: ot100Amt,
          night_hours: nightH,
          night_amount: nightAmt,
          commission_amount: commissionAmt,
          bonus_amount: 0,
          total_earnings: totalEarnings,
          inss_amount: inss,
          irrf_amount: irrf,
          fgts_amount: fgts,
          total_deductions: totalDeductions,
          net_salary: netSalary,
          status: 'preview' as const,
        };
      });

      if (entries.length > 0) {
        const { error: insertErr } = await supabase
          .from('payroll_entries')
          .insert(entries);
        if (insertErr) throw insertErr;
      }

      // Update period totals
      const totalGross = entries.reduce((s, e) => s + e.total_earnings, 0);
      const totalDeductions = entries.reduce((s, e) => s + e.total_deductions, 0);
      const totalNet = entries.reduce((s, e) => s + e.net_salary, 0);

      await supabase
        .from('payroll_periods')
        .update({
          status: 'preview' as const,
          total_employees: entries.length,
          total_gross: totalGross,
          total_deductions: totalDeductions,
          total_net: totalNet,
          total_employer_cost: totalGross + entries.reduce((s, e) => s + e.fgts_amount, 0),
          calculated_at: new Date().toISOString(),
        })
        .eq('id', periodId);

      toast.success('Folha calculada com sucesso! Verifique o preview.');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao calcular folha');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Folha Inteligente
              <Badge variant="outline" className="ml-2">
                <Sparkles className="h-3 w-3 mr-1" />
                AI-Powered
              </Badge>
            </h1>
            <p className="text-muted-foreground">
              Cálculo automático com variáveis do CRM, Ponto e Projetos
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Folha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Período de Folha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês</Label>
                    <Select
                      value={String(formData.reference_month)}
                      onValueChange={v => setFormData({...formData, reference_month: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {months.map((month, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{month}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano</Label>
                    <Select
                      value={String(formData.reference_year)}
                      onValueChange={v => setFormData({...formData, reference_year: parseInt(v)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={formData.period_type}
                    onValueChange={v => setFormData({...formData, period_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="adiantamento">Adiantamento</SelectItem>
                      <SelectItem value="13o_1">13º 1ª Parcela</SelectItem>
                      <SelectItem value="13o_2">13º 2ª Parcela</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Data de Pagamento</Label>
                  <Input
                    type="date"
                    value={formData.payment_date}
                    onChange={e => setFormData({...formData, payment_date: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreatePeriod} disabled={createPayrollPeriod.isPending}>
                    Criar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Smart Cards */}
        <div className="grid md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Colaboradores</p>
                  <p className="text-2xl font-bold">{employees.filter(e => e.status === 'ativo').length}</p>
                </div>
                <Users className="h-8 w-8 text-primary/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comissões Pendentes</p>
                  <p className="text-2xl font-bold text-success">{formatCurrency(totalPendingCommissions)}</p>
                  <p className="text-xs text-muted-foreground">{pendingCommissions.length} vendas</p>
                </div>
                <TrendingUp className="h-8 w-8 text-success/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/10 to-warning/5 border-warning/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Horas Extras</p>
                  <p className="text-2xl font-bold text-warning">
                    {totalOvertimeHours > 0 ? `${totalOvertimeHours.toFixed(1)}h` : '0h'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {totalOvertime50h.toFixed(1)}h 50% · {totalOvertime100h.toFixed(1)}h 100%
                  </p>
                </div>
                <Clock className="h-8 w-8 text-warning/50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/10 to-info/5 border-info/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comissões do Mês</p>
                  <p className="text-2xl font-bold text-info">
                    {formatCurrency(totalPendingCommissions)}
                  </p>
                  <p className="text-xs text-muted-foreground">{pendingCommissions.length} vendas</p>
                </div>
                <Sparkles className="h-8 w-8 text-info/50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Payroll Info */}
        <Card className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border-purple-500/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Sparkles className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Remuneração Variável Inteligente</h3>
                <p className="text-muted-foreground mt-1">
                  O sistema calcula automaticamente a remuneração variável integrando:
                </p>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="p-3 bg-background rounded-lg border">
                    <TrendingUp className="h-5 w-5 text-success mb-2" />
                    <p className="font-medium">Comissões do CRM</p>
                    <p className="text-sm text-muted-foreground">
                      Oportunidades "Ganhas" × Taxa do vendedor
                    </p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <Clock className="h-5 w-5 text-warning mb-2" />
                    <p className="font-medium">Horas do Ponto</p>
                    <p className="text-sm text-muted-foreground">
                      Extras 50%, 100%, Noturnas, Banco
                    </p>
                  </div>
                  <div className="p-3 bg-background rounded-lg border">
                    <CheckCircle2 className="h-5 w-5 text-info mb-2" />
                    <p className="font-medium">Bônus de Projetos</p>
                    <p className="text-sm text-muted-foreground">
                      Entrega no prazo = Bônus automático
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payroll Periods */}
        <Card>
          <CardHeader>
            <CardTitle>Períodos de Folha</CardTitle>
            <CardDescription>Histórico de folhas processadas</CardDescription>
          </CardHeader>
          <CardContent>
            {payrollPeriodsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : payrollPeriods.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Referência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Funcionários</TableHead>
                    <TableHead className="text-right">Bruto</TableHead>
                    <TableHead className="text-right">Descontos</TableHead>
                    <TableHead className="text-right">Líquido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollPeriods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">
                        {months[period.reference_month - 1]} {period.reference_year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {period.period_type === 'mensal' && 'Mensal'}
                          {period.period_type === 'adiantamento' && 'Adiantamento'}
                          {period.period_type === '13o_1' && '13º 1ª'}
                          {period.period_type === '13o_2' && '13º 2ª'}
                        </Badge>
                      </TableCell>
                      <TableCell>{period.total_employees}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(period.total_gross)}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        -{formatCurrency(period.total_deductions)}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(period.total_net)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[period.status]?.color}>
                          {statusConfig[period.status]?.icon}
                          <span className="ml-1">{statusConfig[period.status]?.label}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {period.status === 'rascunho' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCalculate(period.id)}
                              disabled={calculating}
                            >
                              {calculating ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : (
                                <Calculator className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                          {period.status === 'preview' && (
                            <Button size="sm" variant="outline" onClick={() => handleApprove(period.id)}>
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          {['aprovado', 'pago'].includes(period.status) && (
                            <Button size="sm" variant="ghost" onClick={() => handleDownload(period)}>
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold">Nenhuma Folha Criada</h3>
                <p className="text-muted-foreground mt-1">
                  Crie um período para começar a processar a folha de pagamento.
                </p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeira Folha
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Commissions */}
        {pendingCommissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Comissões Pendentes de Aprovação
              </CardTitle>
              <CardDescription>
                Vendas do CRM aguardando lançamento na folha
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Data Venda</TableHead>
                    <TableHead className="text-right">Valor Venda</TableHead>
                    <TableHead className="text-right">Taxa</TableHead>
                    <TableHead className="text-right">Comissão</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCommissions.slice(0, 5).map((comm) => (
                    <TableRow key={comm.id}>
                      <TableCell className="font-medium">
                        {comm.employee?.full_name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {new Date(comm.sale_date).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(comm.sale_value)}
                      </TableCell>
                      <TableCell className="text-right">
                        {comm.commission_rate}%
                      </TableCell>
                      <TableCell className="text-right font-semibold text-success">
                        {formatCurrency(comm.commission_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-warning/10 text-warning">
                          Pendente
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
