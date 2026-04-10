import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  FileText, Download, Eye, EyeOff, Sparkles, CheckCircle2,
  Users, Lock, Unlock, ChevronDown, ChevronRight, Receipt
} from 'lucide-react';
import { usePayroll, usePayrollEntries } from '@/hooks/hcm/usePayroll';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/formatters';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { PayrollPeriod, PayrollEntry, Payslip } from '@/hooks/hcm/usePayroll';

const monthNames = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// ─── Holerite individual visualização ────────────────────────────────────────
function HoleriteModal({
  open,
  onClose,
  entry,
  period,
  employeeName,
}: {
  open: boolean;
  onClose: () => void;
  entry: PayrollEntry | null;
  period: PayrollPeriod | null;
  employeeName: string;
}) {
  if (!entry || !period) return null;
  const ref = `${monthNames[period.reference_month]}/${period.reference_year}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Holerite — {employeeName}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Header info */}
          <div className="flex justify-between items-start p-4 bg-muted/40 rounded-lg text-sm">
            <div>
              <p className="font-semibold">{employeeName}</p>
              <p className="text-muted-foreground">{entry.employee?.registration_number || 'N/A'}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Referência: {ref}</p>
              <p className="text-muted-foreground">{period.period_type === 'mensal' ? 'Folha Mensal' : period.period_type}</p>
            </div>
          </div>

          {/* Proventos */}
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground mb-2">Proventos</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>Salário Base</span>
                <span className="font-medium">{formatCurrency(entry.salary_amount)}</span>
              </div>
              {(entry.overtime_50_hours || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>H.E. 50% ({entry.overtime_50_hours?.toFixed(1)}h)</span>
                  <span className="font-medium">{formatCurrency(entry.overtime_50_amount)}</span>
                </div>
              )}
              {(entry.overtime_100_hours || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>H.E. 100% ({entry.overtime_100_hours?.toFixed(1)}h)</span>
                  <span className="font-medium">{formatCurrency(entry.overtime_100_amount)}</span>
                </div>
              )}
              {(entry.night_hours || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Adicional Noturno ({entry.night_hours?.toFixed(1)}h)</span>
                  <span className="font-medium">{formatCurrency(entry.night_amount)}</span>
                </div>
              )}
              {(entry.commission_amount || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Comissões</span>
                  <span className="font-medium">{formatCurrency(entry.commission_amount)}</span>
                </div>
              )}
              {(entry.bonus_amount || 0) > 0 && (
                <div className="flex justify-between py-1 border-b border-border/50">
                  <span>Bônus</span>
                  <span className="font-medium">{formatCurrency(entry.bonus_amount)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 font-semibold text-base">
                <span>Total de Proventos</span>
                <span className="text-foreground">{formatCurrency(entry.total_earnings)}</span>
              </div>
            </div>
          </div>

          {/* Descontos */}
          <div>
            <p className="text-sm font-semibold uppercase text-muted-foreground mb-2">Descontos</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>INSS</span>
                <span className="font-medium text-destructive">-{formatCurrency(entry.inss_amount)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-border/50">
                <span>IRRF</span>
                <span className="font-medium text-destructive">-{formatCurrency(entry.irrf_amount)}</span>
              </div>
              <div className="flex justify-between py-1 font-semibold text-base">
                <span>Total de Descontos</span>
                <span className="text-destructive">-{formatCurrency(entry.total_deductions)}</span>
              </div>
            </div>
          </div>

          {/* Líquido */}
          <div className="flex justify-between items-center p-4 bg-success/10 border border-success/20 rounded-lg">
            <span className="text-lg font-bold">Salário Líquido</span>
            <span className="text-2xl font-bold text-success">{formatCurrency(entry.net_salary)}</span>
          </div>

          {/* FGTS (info) */}
          <div className="p-3 bg-muted/40 rounded-lg text-sm text-muted-foreground flex justify-between">
            <span>FGTS (encargo empresa, 8%)</span>
            <span className="font-medium">{formatCurrency(entry.fgts_amount)}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Row expandida por período ────────────────────────────────────────────────
function PeriodRow({
  period,
  payslips,
  onGenerate,
  onToggleAvailability,
  onViewEntry,
}: {
  period: PayrollPeriod;
  payslips: Payslip[];
  onGenerate: (periodId: string) => void;
  onToggleAvailability: (payslipId: string, current: boolean) => void;
  onViewEntry: (entryId: string, periodId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: entries = [], isLoading } = usePayrollEntries(expanded ? period.id : null);

  const ref = `${monthNames[period.reference_month]}/${period.reference_year}`;
  const periodPayslips = payslips.filter(p => p.period_id === period.id);
  const generated = periodPayslips.length > 0;
  const availableCount = periodPayslips.filter(p => p.is_available).length;
  const isApproved = ['aprovado', 'pago'].includes(period.status);

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/30"
        onClick={() => setExpanded(v => !v)}
      >
        <TableCell>
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </TableCell>
        <TableCell className="font-medium">{ref}</TableCell>
        <TableCell>
          <Badge variant="outline">{period.period_type === 'mensal' ? 'Mensal' : period.period_type}</Badge>
        </TableCell>
        <TableCell>
          <Badge className={
            period.status === 'aprovado' ? 'bg-success/10 text-success' :
            period.status === 'pago' ? 'bg-primary/10 text-primary' :
            'bg-muted text-muted-foreground'
          }>
            {period.status}
          </Badge>
        </TableCell>
        <TableCell className="text-center">
          {generated ? (
            <span className="text-sm text-success font-medium">
              {availableCount}/{periodPayslips.length} disponíveis
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Não gerado</span>
          )}
        </TableCell>
        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
          {isApproved && !generated && (
            <Button
              size="sm"
              onClick={() => onGenerate(period.id)}
              className="gap-1"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Gerar Holerites
            </Button>
          )}
          {generated && (
            <span className="text-xs text-muted-foreground">
              {periodPayslips.length} gerados
            </span>
          )}
        </TableCell>
      </TableRow>

      {/* Linha expandida com funcionários */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <div className="bg-muted/20 border-t border-b border-border/50">
              {isLoading ? (
                <div className="p-4 space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : entries.length === 0 ? (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  Nenhum lançamento calculado para este período.
                  {isApproved ? '' : ' Calcule e aprove a folha primeiro.'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-8">Colaborador</TableHead>
                      <TableHead className="text-right">Bruto</TableHead>
                      <TableHead className="text-right">Descontos</TableHead>
                      <TableHead className="text-right">Líquido</TableHead>
                      <TableHead className="text-center">Disponível p/ Funcionário</TableHead>
                      <TableHead className="text-right">Ver</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map(entry => {
                      const slip = periodPayslips.find(p => p.employee_id === entry.employee_id);
                      return (
                        <TableRow key={entry.id}>
                          <TableCell className="pl-8 font-medium">
                            {entry.employee?.full_name || 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(entry.total_earnings)}</TableCell>
                          <TableCell className="text-right text-destructive">
                            -{formatCurrency(entry.total_deductions)}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-success">
                            {formatCurrency(entry.net_salary)}
                          </TableCell>
                          <TableCell className="text-center">
                            {slip ? (
                              <Button
                                size="sm"
                                variant={slip.is_available ? 'default' : 'outline'}
                                className="gap-1"
                                onClick={() => onToggleAvailability(slip.id, slip.is_available)}
                              >
                                {slip.is_available ? (
                                  <>
                                    <Unlock className="h-3.5 w-3.5" />
                                    Visível
                                  </>
                                ) : (
                                  <>
                                    <Lock className="h-3.5 w-3.5" />
                                    Oculto
                                  </>
                                )}
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onViewEntry(entry.id, period.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Page Principal ────────────────────────────────────────────────────────────
export default function HCMHolerites() {
  const { currentCompany } = useAuth();
  const companyId = currentCompany?.id;
  const queryClient = useQueryClient();

  const { payslips, payslipsLoading, payrollPeriods, payrollPeriodsLoading } = usePayroll();
  const { employees } = useEmployees();

  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [viewEntry, setViewEntry] = useState<{ entry: PayrollEntry | null; period: PayrollPeriod | null }>({
    entry: null,
    period: null,
  });

  const years = Array.from(
    new Set(payrollPeriods.map(p => p.reference_year))
  ).sort((a, b) => b - a);

  const filteredPeriods = payrollPeriods.filter(
    p => filterYear === 'all' || p.reference_year === parseInt(filterYear)
  );

  const totalPayslips = payslips.length;
  const availablePayslips = payslips.filter(p => p.is_available).length;
  const approvedPeriods = payrollPeriods.filter(p => ['aprovado', 'pago'].includes(p.status)).length;

  // Generate payslips from a payroll period's entries
  const handleGenerate = async (periodId: string) => {
    if (!companyId) return;
    try {
      const { data: entries, error: entriesErr } = await supabase
        .from('payroll_entries')
        .select('*, employee:employees_profiles(id, full_name)')
        .eq('period_id', periodId);
      if (entriesErr) throw entriesErr;
      if (!entries || entries.length === 0) {
        toast.error('Nenhum lançamento encontrado. Calcule a folha primeiro.');
        return;
      }

      const period = payrollPeriods.find(p => p.id === periodId);
      if (!period) return;

      const payslipInserts = entries.map(entry => ({
        company_id: companyId,
        employee_id: entry.employee_id,
        period_id: periodId,
        reference_month: period.reference_month,
        reference_year: period.reference_year,
        document_type: period.period_type === 'mensal' ? 'Folha Mensal' : period.period_type,
        is_available: false,
        pdf_url: null,
      }));

      const { error: insertErr } = await supabase
        .from('payslips')
        .insert(payslipInserts);
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast.success(`${payslipInserts.length} holerites gerados com sucesso!`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar holerites');
    }
  };

  const handleToggleAvailability = async (payslipId: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from('payslips')
        .update({ is_available: !current })
        .eq('id', payslipId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['payslips'] });
      toast.success(!current ? 'Holerite disponibilizado para o colaborador' : 'Holerite ocultado do colaborador');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro');
    }
  };

  const handleViewEntry = async (entryId: string, periodId: string) => {
    const { data, error } = await supabase
      .from('payroll_entries')
      .select('*, employee:employees_profiles(id, full_name, registration_number)')
      .eq('id', entryId)
      .single();
    if (error || !data) { toast.error('Erro ao carregar holerite'); return; }
    const period = payrollPeriods.find(p => p.id === periodId) || null;
    setViewEntry({ entry: data as PayrollEntry, period });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Holerites
            </h1>
            <p className="text-muted-foreground">Gerenciamento de contracheques por colaborador</p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterYear} onValueChange={setFilterYear}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os anos</SelectItem>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Gerados</p>
                <p className="text-2xl font-bold">{totalPayslips}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Unlock className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Disponíveis p/ Colaborador</p>
                <p className="text-2xl font-bold">{availablePayslips}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <CheckCircle2 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Períodos Aprovados</p>
                <p className="text-2xl font-bold">{approvedPeriods}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info card sobre privacidade */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Lock className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Controle de Visibilidade por Colaborador</p>
              <p className="text-muted-foreground mt-0.5">
                Cada holerite é visível apenas ao próprio colaborador no Portal do Colaborador.
                Use o botão <strong>Visível/Oculto</strong> para controlar quando o funcionário pode acessar o contracheque.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de períodos */}
        <Card>
          <CardHeader>
            <CardTitle>Períodos de Folha</CardTitle>
            <CardDescription>Clique em um período para ver os holerites individuais</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {payrollPeriodsLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
              </div>
            ) : filteredPeriods.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum período encontrado</p>
                <p className="text-sm mt-1">Crie e processe uma folha na tela de Folha Inteligente</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status Folha</TableHead>
                    <TableHead className="text-center">Holerites</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeriods.map(period => (
                    <PeriodRow
                      key={period.id}
                      period={period}
                      payslips={payslips}
                      onGenerate={handleGenerate}
                      onToggleAvailability={handleToggleAvailability}
                      onViewEntry={handleViewEntry}
                    />
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal visualização holerite */}
      <HoleriteModal
        open={!!viewEntry.entry}
        onClose={() => setViewEntry({ entry: null, period: null })}
        entry={viewEntry.entry}
        period={viewEntry.period}
        employeeName={viewEntry.entry?.employee?.full_name || ''}
      />
    </MainLayout>
  );
}
