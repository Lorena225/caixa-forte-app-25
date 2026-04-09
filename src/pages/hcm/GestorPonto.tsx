import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  ChevronLeft, ChevronRight, FileSpreadsheet, FileText,
  Clock, Users, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown,
  Search, Eye
} from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeTracking } from '@/hooks/hcm/useTimeTracking';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { exportConsolidadoExcel, exportConsolidadoPDF } from '@/lib/exportPontoConsolidado';

function fmtH(h: number) {
  const s = h < 0 ? '-' : '';
  const a = Math.abs(h);
  return `${s}${Math.floor(a)}h${Math.round((a % 1) * 60).toString().padStart(2, '0')}`;
}

const monthNames = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function GestorPonto() {
  const { currentCompany } = useAuth();
  const { employees } = useEmployees();
  const { timeSummary, timeSummaryLoading } = useTimeTracking();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null);

  const monthLabel = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });

  const stepMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1);
    setMonth(d.getMonth() + 1);
    setYear(d.getFullYear());
    setSelectedEmpId(null);
  };

  // Colaboradores ativos filtrados
  const activeEmployees = useMemo(() =>
    employees.filter(e => e.status === 'ativo' || e.status === 'experiencia'),
    [employees]
  );

  const filtered = useMemo(() =>
    activeEmployees.filter(e => e.full_name.toLowerCase().includes(search.toLowerCase())),
    [activeEmployees, search]
  );

  // Registros do mês por colaborador
  const recordsByEmp = useMemo(() => {
    const map: Record<string, typeof timeSummary> = {};
    for (const emp of activeEmployees) {
      map[emp.id] = timeSummary.filter(t => {
        if (t.employee_id !== emp.id) return false;
        const d = new Date(t.work_date + 'T12:00:00');
        return d.getMonth() + 1 === month && d.getFullYear() === year;
      }).sort((a, b) => a.work_date.localeCompare(b.work_date));
    }
    return map;
  }, [timeSummary, activeEmployees, month, year]);

  // Dias úteis do mês
  const workdays = useMemo(() => {
    const days = getDaysInMonth(new Date(year, month - 1));
    let count = 0;
    for (let d = 1; d <= days; d++) {
      const dow = new Date(year, month - 1, d).getDay();
      if (dow !== 0 && dow !== 6) count++;
    }
    return count;
  }, [month, year]);

  // Stats por colaborador
  const empStats = useMemo(() => {
    return filtered.map(emp => {
      const recs = recordsByEmp[emp.id] || [];
      const diasTrab = recs.filter(r => r.worked_hours > 0).length;
      const totalH = recs.reduce((s, r) => s + r.worked_hours, 0);
      const banco = recs.reduce((s, r) => s + r.bank_hours, 0);
      const faltas = workdays - diasTrab;
      const pendentes = recs.filter(r => !r.approved_at && r.worked_hours > 0).length;
      return { emp, recs, diasTrab, totalH, banco, faltas, pendentes };
    });
  }, [filtered, recordsByEmp, workdays]);

  // KPIs gerais
  const totalColabs = activeEmployees.length;
  const semRegistroHoje = activeEmployees.filter(emp => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return !timeSummary.find(t => t.employee_id === emp.id && t.work_date === today && t.worked_hours > 0);
  }).length;
  const totalBanco = empStats.reduce((s, e) => s + e.banco, 0);
  const totalFaltas = empStats.reduce((s, e) => s + e.faltas, 0);

  // Detalhe do colaborador selecionado
  const selectedEmp = selectedEmpId ? employees.find(e => e.id === selectedEmpId) : null;
  const selectedRecs = selectedEmpId ? (recordsByEmp[selectedEmpId] || []) : [];

  const handleExportExcel = () => {
    exportConsolidadoExcel(
      empStats.map(({ emp, recs }) => ({ employee: emp, records: recs })),
      month, year, currentCompany?.name
    );
  };

  const handleExportPDF = () => {
    exportConsolidadoPDF(
      empStats.map(({ emp, recs }) => ({ employee: emp, records: recs })),
      month, year, currentCompany?.name
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Gestão de Ponto</h1>
            <p className="text-muted-foreground">Acompanhamento de frequência e horas da equipe</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => stepMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[130px] text-center capitalize">{monthLabel}</span>
            <Button variant="outline" size="icon" onClick={() => stepMonth(1)}
              disabled={month === now.getMonth() + 1 && year === now.getFullYear()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel Contador
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-1" /> PDF Contador
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Colaboradoras</p>
                <p className="text-2xl font-bold">{totalColabs}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sem ponto hoje</p>
                <p className="text-2xl font-bold">{semRegistroHoje}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalBanco >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totalBanco >= 0
                  ? <TrendingUp className="h-5 w-5 text-green-600" />
                  : <TrendingDown className="h-5 w-5 text-red-500" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Banco total</p>
                <p className={`text-2xl font-bold ${totalBanco >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {fmtH(totalBanco)}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faltas no mês</p>
                <p className="text-2xl font-bold text-red-500">{totalFaltas}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="equipe">
          <TabsList>
            <TabsTrigger value="equipe">Equipe</TabsTrigger>
            {selectedEmp && (
              <TabsTrigger value="detalhe">{selectedEmp.full_name.split(' ')[0]}</TabsTrigger>
            )}
          </TabsList>

          {/* Lista da equipe */}
          <TabsContent value="equipe">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar colaboradora..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Badge variant="outline">{filtered.length} colaboradora(s)</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {timeSummaryLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Carregando...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Colaboradora</TableHead>
                        <TableHead className="text-center">Dias trabalhados</TableHead>
                        <TableHead className="text-center">Horas totais</TableHead>
                        <TableHead className="text-center">Banco</TableHead>
                        <TableHead className="text-center">Faltas</TableHead>
                        <TableHead className="text-center">Status hoje</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {empStats.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma colaboradora encontrada
                          </TableCell>
                        </TableRow>
                      ) : empStats.map(({ emp, diasTrab, totalH, banco, faltas, pendentes }) => {
                        const today = format(new Date(), 'yyyy-MM-dd');
                        const pontoHoje = timeSummary.find(
                          t => t.employee_id === emp.id && t.work_date === today
                        );
                        return (
                          <TableRow key={emp.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium">{emp.full_name}</p>
                                <p className="text-xs text-muted-foreground">{(emp as any).cargo?.nome || emp.contract_type.toUpperCase()}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="font-medium">{diasTrab}</span>
                              <span className="text-xs text-muted-foreground">/{workdays}</span>
                            </TableCell>
                            <TableCell className="text-center font-medium">{fmtH(totalH)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`font-semibold ${banco >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {banco >= 0 ? '+' : ''}{fmtH(banco)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              {faltas > 0
                                ? <Badge variant="destructive">{faltas}</Badge>
                                : <Badge className="bg-green-100 text-green-700 border-green-200">0</Badge>
                              }
                            </TableCell>
                            <TableCell className="text-center">
                              {new Date().getDay() === 0 || new Date().getDay() === 6 ? (
                                <Badge variant="outline">Fim de semana</Badge>
                              ) : pontoHoje?.worked_hours > 0 ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> {pontoHoje.entry_1?.slice(0,5)}
                                </Badge>
                              ) : pontoHoje?.entry_1 ? (
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200 gap-1">
                                  <Clock className="h-3 w-3" /> Em curso
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-orange-600 border-orange-300">
                                  Sem registro
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSelectedEmpId(emp.id)}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detalhe individual */}
          {selectedEmp && (
            <TabsContent value="detalhe">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between">
                  <div>
                    <CardTitle>{selectedEmp.full_name}</CardTitle>
                    <CardDescription>
                      {(selectedEmp as any).cargo?.nome || '-'} · {selectedEmp.contract_type.toUpperCase()} · {monthLabel}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => exportConsolidadoExcel(
                      [{ employee: selectedEmp, records: selectedRecs }], month, year, currentCompany?.name
                    )}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportConsolidadoPDF(
                      [{ employee: selectedEmp, records: selectedRecs }], month, year, currentCompany?.name
                    )}>
                      <FileText className="h-4 w-4 mr-1" /> PDF
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Mini KPIs */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Dias trabalhados', value: selectedRecs.filter(r => r.worked_hours > 0).length, suffix: `/${workdays}` },
                      { label: 'Horas totais', value: fmtH(selectedRecs.reduce((s, r) => s + r.worked_hours, 0)) },
                      { label: 'Banco de horas', value: fmtH(selectedRecs.reduce((s, r) => s + r.bank_hours, 0)), color: selectedRecs.reduce((s, r) => s + r.bank_hours, 0) >= 0 ? 'text-green-600' : 'text-red-500' },
                      { label: 'Faltas', value: workdays - selectedRecs.filter(r => r.worked_hours > 0).length, color: (workdays - selectedRecs.filter(r => r.worked_hours > 0).length) > 0 ? 'text-red-500' : 'text-green-600' },
                    ].map((kpi, i) => (
                      <div key={i} className="bg-muted/40 rounded-lg p-3 text-center">
                        <p className="text-xs text-muted-foreground">{kpi.label}</p>
                        <p className={`text-lg font-bold ${kpi.color || ''}`}>
                          {kpi.value}{kpi.suffix || ''}
                        </p>
                      </div>
                    ))}
                  </div>

                  {selectedRecs.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Clock className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>Nenhum registro de ponto neste mês</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
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
                        {selectedRecs.map(r => (
                          <TableRow key={r.id} className={r.is_weekend || r.is_holiday ? 'opacity-50' : ''}>
                            <TableCell className="font-medium">
                              {format(parseISO(r.work_date + 'T12:00:00'), 'dd/MM/yyyy')}
                            </TableCell>
                            <TableCell className="capitalize text-xs text-muted-foreground">
                              {format(parseISO(r.work_date + 'T12:00:00'), 'EEE', { locale: ptBR })}
                            </TableCell>
                            <TableCell>{r.entry_1?.slice(0, 5) || '-'}</TableCell>
                            <TableCell>{r.exit_1?.slice(0, 5) || '-'}</TableCell>
                            <TableCell>{r.entry_2?.slice(0, 5) || '-'}</TableCell>
                            <TableCell>{r.exit_2?.slice(0, 5) || '-'}</TableCell>
                            <TableCell className="text-center font-medium">{fmtH(r.worked_hours)}</TableCell>
                            <TableCell className="text-center">
                              <span className={r.bank_hours >= 0 ? 'text-green-600' : 'text-red-500'}>
                                {r.bank_hours >= 0 ? '+' : ''}{fmtH(r.bank_hours)}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {r.is_weekend ? 'Fim semana' : r.is_holiday ? 'Feriado' : r.absence_type || ''}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
