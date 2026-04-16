import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  Clock, Users, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Search, Eye, Building2,
} from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeTracking } from '@/hooks/hcm/useTimeTracking';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { exportConsolidadoExcel, exportConsolidadoPDF } from '@/lib/exportPontoConsolidado';
import { cn } from '@/lib/utils';

function fmtH(h: number) {
  const s = h < 0 ? '-' : '';
  const a = Math.abs(h);
  return `${s}${Math.floor(a)}h${Math.round((a % 1) * 60).toString().padStart(2, '0')}`;
}

// KPI card consistente com altura mínima fixada
function KPIItem({
  icon: Icon,
  label,
  value,
  iconBg,
  iconColor,
  valueColor,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  iconBg: string;
  iconColor: string;
  valueColor?: string;
}) {
  return (
    <Card className="min-h-[96px]">
      <CardContent className="p-4 flex items-center gap-3 h-full">
        <div className={cn('p-2.5 rounded-xl shrink-0', iconBg)}>
          <Icon className={cn('h-5 w-5', iconColor)} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight truncate">{label}</p>
          <p className={cn('text-2xl font-bold leading-tight font-mono', valueColor)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// Badge de status do ponto
function PontoBadge({ pontoHoje, isWeekend }: { pontoHoje: any; isWeekend: boolean }) {
  if (isWeekend) return <Badge variant="outline" className="text-xs">Fim de semana</Badge>;
  if (pontoHoje?.worked_hours > 0)
    return (
      <Badge className="bg-success/10 text-success border-success/20 gap-1 text-xs">
        <CheckCircle2 className="h-3 w-3" />
        {pontoHoje.entry_1?.slice(0, 5)}
      </Badge>
    );
  if (pontoHoje?.entry_1)
    return (
      <Badge className="bg-info/10 text-info border-info/20 gap-1 text-xs">
        <Clock className="h-3 w-3" /> Em curso
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-warning border-warning/40 text-xs">
      Sem registro
    </Badge>
  );
}

export default function GestorPonto() {
  const { currentCompany } = useAuth();
  const { employees } = useEmployees();
  const { timeSummary, timeSummaryLoading } = useTimeTracking();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  // Logo da empresa
  const { data: branding } = useQuery({
    queryKey: ['company-branding', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return null;
      const { data } = await supabase
        .from('company_branding')
        .select('logo_url, logo_dark_url, primary_color')
        .eq('company_id', currentCompany.id)
        .maybeSingle();
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });

  const stepMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setSelectedEmpId(null);
  };

  const activeEmployees = useMemo(
    () => employees.filter(e => e.status === 'ativo' || e.status === 'experiencia'),
    [employees],
  );

  const filtered = useMemo(
    () => activeEmployees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase())),
    [activeEmployees, search],
  );

  const recordsByEmp = useMemo(() => {
    const map: Record<string, typeof timeSummary> = {};
    for (const emp of activeEmployees) {
      map[emp.id] = timeSummary
        .filter(t => {
          if (t.employee_id !== emp.id) return false;
          const d = new Date(t.work_date + 'T12:00:00');
          return d.getMonth() + 1 === month && d.getFullYear() === year;
        })
        .sort((a, b) => a.work_date.localeCompare(b.work_date));
    }
    return map;
  }, [timeSummary, activeEmployees, month, year]);

  const workdays = useMemo(() => {
    const days = getDaysInMonth(new Date(year, month - 1));
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  }, [month, year]);

  const empStats = useMemo(() =>
    filtered.map(emp => {
      const recs = recordsByEmp[emp.id] || [];
      const diasTrab = recs.filter(r => r.worked_hours > 0).length;
      const totalH = recs.reduce((s, r) => s + r.worked_hours, 0);
      const banco = recs.reduce((s, r) => s + r.bank_hours, 0);
      const faltas = workdays - diasTrab;
      return { emp, recs, diasTrab, totalH, banco, faltas };
    }),
    [filtered, recordsByEmp, workdays],
  );

  const totalColabs = activeEmployees.length;
  const today = format(new Date(), 'yyyy-MM-dd');
  const isWeekendToday = [0, 6].includes(new Date().getDay());
  const semRegistroHoje = isWeekendToday ? 0 : activeEmployees.filter(
    emp => !timeSummary.find(t => t.employee_id === emp.id && t.work_date === today && t.worked_hours > 0),
  ).length;
  const totalBanco = empStats.reduce((s, e) => s + e.banco, 0);
  const totalFaltas = empStats.reduce((s, e) => s + e.faltas, 0);

  const selectedEmp = selectedEmpId ? employees.find(e => e.id === selectedEmpId) : null;
  const selectedRecs = selectedEmpId ? (recordsByEmp[selectedEmpId] || []) : [];
  const selectedStats = selectedEmpId ? empStats.find(e => e.emp.id === selectedEmpId) : null;

  return (
    <MainLayout>
      <div className="space-y-5">

        {/* ── Header com logo da empresa ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* Logo + título */}
          <div className="flex items-center gap-4">
            {branding?.logo_url ? (
              <img
                src={branding.logo_url}
                alt={currentCompany?.name}
                className="h-10 w-auto max-w-[160px] object-contain rounded"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold leading-tight">Gestão de Ponto</h1>
              <p className="text-sm text-muted-foreground">{currentCompany?.name}</p>
            </div>
          </div>

          {/* Navegação de mês */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => stepMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[140px] text-center text-sm font-semibold capitalize">
              {monthLabel}
            </span>
            <Button
              variant="outline" size="icon"
              onClick={() => stepMonth(1)}
              disabled={month === now.getMonth() + 1 && year === now.getFullYear()}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Exportação */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm"
              onClick={() => exportConsolidadoExcel(
                empStats.map(({ emp, recs }) => ({ employee: emp, records: recs })),
                month, year, currentCompany?.name,
              )}>
              <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => exportConsolidadoPDF(
                empStats.map(({ emp, recs }) => ({ employee: emp, records: recs })),
                month, year, currentCompany?.name,
              )}>
              <FileText className="h-4 w-4 mr-1.5" /> PDF
            </Button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPIItem
            icon={Users}
            label="Colaboradores ativos"
            value={totalColabs}
            iconBg="bg-primary/10"
            iconColor="text-primary"
          />
          <KPIItem
            icon={AlertTriangle}
            label="Sem ponto hoje"
            value={isWeekendToday ? '—' : semRegistroHoje}
            iconBg="bg-warning/10"
            iconColor="text-warning"
            valueColor={!isWeekendToday && semRegistroHoje > 0 ? 'text-warning' : undefined}
          />
          <KPIItem
            icon={totalBanco >= 0 ? TrendingUp : TrendingDown}
            label="Banco total"
            value={fmtH(totalBanco)}
            iconBg={totalBanco >= 0 ? 'bg-success/10' : 'bg-destructive/10'}
            iconColor={totalBanco >= 0 ? 'text-success' : 'text-destructive'}
            valueColor={totalBanco >= 0 ? 'text-success' : 'text-destructive'}
          />
          <KPIItem
            icon={AlertTriangle}
            label="Faltas no mês"
            value={totalFaltas}
            iconBg={totalFaltas > 0 ? 'bg-destructive/10' : 'bg-success/10'}
            iconColor={totalFaltas > 0 ? 'text-destructive' : 'text-success'}
            valueColor={totalFaltas > 0 ? 'text-destructive' : undefined}
          />
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="equipe">
          <TabsList>
            <TabsTrigger value="equipe" className="gap-2">
              <Users className="h-4 w-4" /> Equipe
            </TabsTrigger>
            {selectedEmp && (
              <TabsTrigger value="detalhe" className="gap-2">
                <Eye className="h-4 w-4" />
                {selectedEmp.full_name.split(' ')[0]}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── Tab Equipe ── */}
          <TabsContent value="equipe">
            <Card>
              <CardHeader className="pb-3 border-b">
                {/* Cabeçalho da tabela com logo e empresa */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {branding?.logo_url && (
                      <img
                        src={branding.logo_url}
                        alt={currentCompany?.name}
                        className="h-7 w-auto max-w-[100px] object-contain opacity-70"
                      />
                    )}
                    <div>
                      <CardTitle className="text-base">
                        Frequência — <span className="capitalize text-muted-foreground font-medium">{monthLabel}</span>
                      </CardTitle>
                      <CardDescription>{workdays} dias úteis</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Buscar..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-8 h-8 w-48 text-sm"
                      />
                    </div>
                    <Badge variant="outline" className="text-xs">{filtered.length} colaborador(es)</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {timeSummaryLoading ? (
                  <div className="p-4 space-y-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableHead className="pl-4 w-[220px]">Colaborador</TableHead>
                          <TableHead className="text-center">Dias</TableHead>
                          <TableHead className="text-center">Horas</TableHead>
                          <TableHead className="text-center">Banco</TableHead>
                          <TableHead className="text-center">Faltas</TableHead>
                          <TableHead className="text-center">Hoje</TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {empStats.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                              <Clock className="h-8 w-8 mx-auto mb-2 opacity-30" />
                              Nenhum colaborador encontrado
                            </TableCell>
                          </TableRow>
                        ) : empStats.map(({ emp, diasTrab, totalH, banco, faltas }) => {
                          const pontoHoje = timeSummary.find(
                            t => t.employee_id === emp.id && t.work_date === today,
                          );
                          const isOverdue = faltas > 3;
                          return (
                            <TableRow
                              key={emp.id}
                              className={cn(
                                'hover:bg-muted/20 cursor-pointer',
                                isOverdue && 'bg-destructive/5',
                              )}
                              onClick={() => setSelectedEmpId(emp.id)}
                            >
                              <TableCell className="pl-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                    <span className="text-xs font-semibold text-primary">
                                      {emp.full_name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-medium text-sm truncate">{emp.full_name}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                      {(emp as any).cargo?.nome || emp.contract_type.toUpperCase()}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium text-sm">{diasTrab}</span>
                                <span className="text-xs text-muted-foreground">/{workdays}</span>
                              </TableCell>
                              <TableCell className="text-center font-mono text-sm">{fmtH(totalH)}</TableCell>
                              <TableCell className="text-center">
                                <span className={cn(
                                  'font-mono text-sm font-semibold',
                                  banco >= 0 ? 'text-success' : 'text-destructive',
                                )}>
                                  {banco >= 0 ? '+' : ''}{fmtH(banco)}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                {faltas > 0
                                  ? <Badge variant="destructive" className="text-xs">{faltas}</Badge>
                                  : <Badge className="bg-success/10 text-success border-success/20 text-xs">0</Badge>
                                }
                              </TableCell>
                              <TableCell className="text-center">
                                <PontoBadge pontoHoje={pontoHoje} isWeekend={isWeekendToday} />
                              </TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                  onClick={e => { e.stopPropagation(); setSelectedEmpId(emp.id); }}>
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab Detalhe Individual ── */}
          {selectedEmp && (
            <TabsContent value="detalhe">
              <Card>
                <CardHeader className="border-b">
                  {/* Cabeçalho com logo */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {branding?.logo_url && (
                        <img
                          src={branding.logo_url}
                          alt={currentCompany?.name}
                          className="h-8 w-auto max-w-[100px] object-contain opacity-70"
                        />
                      )}
                      <div>
                        <CardTitle className="text-base">{selectedEmp.full_name}</CardTitle>
                        <CardDescription>
                          {(selectedEmp as any).cargo?.nome || '—'} · {selectedEmp.contract_type.toUpperCase()} ·{' '}
                          <span className="capitalize">{monthLabel}</span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => exportConsolidadoExcel(
                          [{ employee: selectedEmp, records: selectedRecs }],
                          month, year, currentCompany?.name,
                        )}>
                        <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => exportConsolidadoPDF(
                          [{ employee: selectedEmp, records: selectedRecs }],
                          month, year, currentCompany?.name,
                        )}>
                        <FileText className="h-4 w-4 mr-1.5" /> PDF
                      </Button>
                    </div>
                  </div>

                  {/* Mini KPIs do colaborador */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                    {[
                      {
                        label: 'Dias trabalhados',
                        value: `${selectedStats?.diasTrab ?? 0}/${workdays}`,
                        color: undefined,
                      },
                      {
                        label: 'Horas totais',
                        value: fmtH(selectedRecs.reduce((s, r) => s + r.worked_hours, 0)),
                        color: undefined,
                      },
                      {
                        label: 'Banco de horas',
                        value: fmtH(selectedRecs.reduce((s, r) => s + r.bank_hours, 0)),
                        color: (selectedRecs.reduce((s, r) => s + r.bank_hours, 0)) >= 0 ? 'text-success' : 'text-destructive',
                      },
                      {
                        label: 'Faltas',
                        value: selectedStats?.faltas ?? 0,
                        color: (selectedStats?.faltas ?? 0) > 0 ? 'text-destructive' : 'text-success',
                      },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-muted/40 rounded-xl p-3 text-center border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                        <p className={cn('text-lg font-bold font-mono', kpi.color)}>{kpi.value}</p>
                      </div>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-0">
                  {selectedRecs.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Nenhum registro de ponto neste mês</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/30 hover:bg-muted/30">
                            <TableHead className="pl-4">Data</TableHead>
                            <TableHead>Dia</TableHead>
                            <TableHead>Entrada</TableHead>
                            <TableHead>Saída Almoço</TableHead>
                            <TableHead>Retorno</TableHead>
                            <TableHead>Saída</TableHead>
                            <TableHead className="text-center">Trabalhadas</TableHead>
                            <TableHead className="text-center">Banco</TableHead>
                            <TableHead>Obs</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedRecs.map(r => {
                            const isSpecial = r.is_weekend || r.is_holiday;
                            return (
                              <TableRow
                                key={r.id}
                                className={cn(
                                  'hover:bg-muted/20',
                                  isSpecial && 'opacity-50 bg-muted/20',
                                  r.absence_type && 'bg-destructive/5',
                                )}
                              >
                                <TableCell className="pl-4 font-medium text-sm">
                                  {format(parseISO(r.work_date + 'T12:00:00'), 'dd/MM/yyyy')}
                                </TableCell>
                                <TableCell className="capitalize text-xs text-muted-foreground">
                                  {format(parseISO(r.work_date + 'T12:00:00'), 'EEE', { locale: ptBR })}
                                </TableCell>
                                <TableCell className="font-mono text-sm">{r.entry_1?.slice(0, 5) || '—'}</TableCell>
                                <TableCell className="font-mono text-sm">{r.exit_1?.slice(0, 5) || '—'}</TableCell>
                                <TableCell className="font-mono text-sm">{r.entry_2?.slice(0, 5) || '—'}</TableCell>
                                <TableCell className="font-mono text-sm">{r.exit_2?.slice(0, 5) || '—'}</TableCell>
                                <TableCell className="text-center font-mono text-sm font-medium">
                                  {fmtH(r.worked_hours)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={cn(
                                    'font-mono text-sm font-semibold',
                                    r.bank_hours >= 0 ? 'text-success' : 'text-destructive',
                                  )}>
                                    {r.bank_hours >= 0 ? '+' : ''}{fmtH(r.bank_hours)}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {r.is_weekend ? 'Fim semana' : r.is_holiday ? 'Feriado' : r.absence_type || ''}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </MainLayout>
  );
}
