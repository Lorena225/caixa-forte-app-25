import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  User, FileText, Gift, Clock, Calendar, Plus, Download,
  Smartphone, Heart, Bus, UtensilsCrossed, Shield, CheckCircle2,
  ClipboardCheck, ChevronLeft, ChevronRight, FileSpreadsheet, FileText as FilePDF
} from 'lucide-react';
import { exportPontoExcel, exportPontoPDF } from '@/lib/exportPonto';
import { ptBR } from 'date-fns/locale';
import { usePayroll } from '@/hooks/hcm/usePayroll';
import { useBenefitsAndRequests } from '@/hooks/hcm/useBenefitsAndRequests';
import { useTimeTracking } from '@/hooks/hcm/useTimeTracking';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/formatters';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const benefitTypeIcons: Record<string, typeof Gift> = {
  vt: Bus, vr: UtensilsCrossed, va: UtensilsCrossed,
  saude: Heart, odonto: Shield, seguro_vida: Shield,
};

const benefitTypeLabels: Record<string, string> = {
  vt: 'Vale Transporte', vr: 'Vale Refeição', va: 'Vale Alimentação',
  saude: 'Plano de Saúde', odonto: 'Plano Odontológico', seguro_vida: 'Seguro de Vida',
};

const monthNames = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const requestTypeLabels: Record<string, string> = {
  ferias: 'Férias', reembolso: 'Reembolso', ajuste_ponto: 'Ajuste de Ponto',
  documento: 'Documento', abono: 'Abono', licenca: 'Licença',
};

const statusLabels: Record<string, string> = {
  pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado', cancelado: 'Cancelado',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-warning/10 text-warning border-warning/20',
  aprovado: 'bg-success/10 text-success border-success/20',
  rejeitado: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelado: 'bg-muted text-muted-foreground',
};

export default function PortalColaborador() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { employees } = useEmployees();
  const { payslips, payslipsLoading } = usePayroll();
  const { employeeBenefits, employeeBenefitsLoading, requests, requestsLoading } = useBenefitsAndRequests();
  const { hourBank, timeSummary, saveTimeSummary } = useTimeTracking();

  // Perfil do colaborador logado — declarado antes de ser usado
  const myProfile = employees.find(e => e.user_id === userId);
  const myId = myProfile?.id;

  // Estados de ponto
  const today = format(new Date(), 'yyyy-MM-dd');
  const [pontoDate, setPontoDate] = useState(today);
  const [pontoForm, setPontoForm] = useState({ entry_1: '', exit_1: '', entry_2: '', exit_2: '' });

  const pontoHoje = timeSummary.find(t => t.work_date === pontoDate && t.employee_id === myId);

  // Sincroniza form ao trocar de dia ou quando o banco retorna dados
  const pontoHojeKey = `${pontoDate}|${pontoHoje?.entry_1 ?? ''}|${pontoHoje?.exit_2 ?? ''}`;
  useMemo(() => {
    setPontoForm({
      entry_1: pontoHoje?.entry_1?.slice(0, 5) || '',
      exit_1: pontoHoje?.exit_1?.slice(0, 5) || '',
      entry_2: pontoHoje?.entry_2?.slice(0, 5) || '',
      exit_2: pontoHoje?.exit_2?.slice(0, 5) || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pontoHojeKey]);

  const handleDateStep = (delta: number) => {
    const d = new Date(pontoDate + 'T12:00:00');
    d.setDate(d.getDate() + delta);
    setPontoDate(format(d, 'yyyy-MM-dd'));
  };

  const handleSavePonto = () => {
    if (!myId) return;
    saveTimeSummary.mutate({
      employee_id: myId,
      work_date: pontoDate,
      entry_1: pontoForm.entry_1 || null,
      exit_1: pontoForm.exit_1 || null,
      entry_2: pontoForm.entry_2 || null,
      exit_2: pontoForm.exit_2 || null,
    });
  };

  // Estados de exportação
  const [exportMonth, setExportMonth] = useState(new Date().getMonth() + 1);
  const [exportYear, setExportYear] = useState(new Date().getFullYear());
  const monthLabel = format(new Date(exportYear, exportMonth - 1, 1), 'MMMM yyyy', { locale: ptBR });

  const monthlyRecords = useMemo(() => {
    if (!myId) return [];
    return timeSummary.filter(t => {
      if (t.employee_id !== myId) return false;
      const d = new Date(t.work_date + 'T12:00:00');
      return d.getMonth() + 1 === exportMonth && d.getFullYear() === exportYear;
    });
  }, [timeSummary, myId, exportMonth, exportYear]);

  const handleExportExcel = () => {
    exportPontoExcel({
      employeeName: myProfile?.full_name || 'Colaborador',
      companyName: 'Empresa',
      month: exportMonth,
      year: exportYear,
      records: monthlyRecords,
    });
  };

  const handleExportPDF = () => {
    exportPontoPDF({
      employeeName: myProfile?.full_name || 'Colaborador',
      companyName: 'Empresa',
      month: exportMonth,
      year: exportYear,
      records: monthlyRecords,
    });
  };

  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    request_type: 'ferias' as string,
    title: '',
    description: '',
  });

  // Filter data for current employee
  const myPayslips = payslips.filter(p => p.employee_id === myId);
  const myBenefits = employeeBenefits.filter(b => b.employee_id === myId);
  const myRequests = requests.filter(r => r.employee_id === myId);
  const myHourBank = hourBank.filter(h => h.employee_id === myId);
  const currentBalance = myHourBank.length > 0 ? myHourBank[0]?.balance_after || 0 : 0;

  const handleSubmitRequest = async () => {
    if (!myId || !requestForm.title) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    try {
      const { error } = await supabase
        .from('employee_requests')
        .insert({
          company_id: myProfile?.company_id!,
          employee_id: myId,
          request_type: requestForm.request_type as 'ferias' | 'reembolso' | 'ajuste_ponto' | 'documento' | 'abono' | 'licenca',
          title: requestForm.title,
          description: requestForm.description || null,
        });
      if (error) throw error;
      toast.success('Solicitação enviada com sucesso!');
      setNewRequestOpen(false);
      setRequestForm({ request_type: 'ferias', title: '', description: '' });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erro ao enviar solicitação');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Portal do Colaborador</h1>
              <p className="text-muted-foreground">
                {myProfile ? `Olá, ${myProfile.full_name.split(' ')[0]}!` : 'Bem-vindo ao seu portal'}
              </p>
            </div>
          </div>
          {myProfile && (
            <Badge variant="outline" className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {myProfile.status === 'ativo' ? 'Ativo' : myProfile.status}
            </Badge>
          )}
        </div>

        {/* Quick Stats */}
        {myProfile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Holerites</p>
                    <p className="text-xl font-bold">{myPayslips.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/10">
                    <Gift className="h-4 w-4 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Benefícios</p>
                    <p className="text-xl font-bold">{myBenefits.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/10">
                    <Clock className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Banco de Horas</p>
                    <p className="text-xl font-bold">{currentBalance.toFixed(1)}h</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <Calendar className="h-4 w-4 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Solicitações</p>
                    <p className="text-xl font-bold">{myRequests.filter(r => r.status === 'pendente').length}</p>
                    <p className="text-xs text-muted-foreground">pendentes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!myProfile && (
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-6 text-center">
              <User className="h-12 w-12 mx-auto text-warning mb-3" />
              <h3 className="font-semibold text-lg">Perfil não vinculado</h3>
              <p className="text-muted-foreground mt-1">
                Seu usuário ainda não está vinculado a um cadastro de colaborador.
                Entre em contato com o RH para vincular seu acesso.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs defaultValue="ponto">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="ponto">Ponto</TabsTrigger>
            <TabsTrigger value="holerites">Holerites</TabsTrigger>
            <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
            <TabsTrigger value="solicitacoes">Solicitações</TabsTrigger>
            <TabsTrigger value="dados">Meus Dados</TabsTrigger>
          </TabsList>

          {/* Ponto Tab */}
          <TabsContent value="ponto">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                    Registro de Ponto
                  </CardTitle>
                  <CardDescription>Preencha seus horários de entrada e saída</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Seletor de data */}
                  <div className="flex items-center justify-between gap-4 bg-muted/40 rounded-lg p-3">
                    <Button variant="ghost" size="icon" onClick={() => handleDateStep(-1)}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="text-center">
                      <p className="font-semibold text-base">
                        {format(new Date(pontoDate + 'T12:00:00'), 'EEEE', { locale: undefined })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(pontoDate + 'T12:00:00'), 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDateStep(1)}
                      disabled={pontoDate >= today}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {!myProfile ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ClipboardCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p>Vincule seu perfil ao RH para registrar ponto</p>
                    </div>
                  ) : (
                    <>
                      {/* Manhã */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Manhã</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Entrada</Label>
                            <Input
                              type="time"
                              value={pontoForm.entry_1}
                              onChange={e => setPontoForm(f => ({ ...f, entry_1: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Saída (almoço)</Label>
                            <Input
                              type="time"
                              value={pontoForm.exit_1}
                              onChange={e => setPontoForm(f => ({ ...f, exit_1: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Tarde */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Tarde</p>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label>Retorno almoço</Label>
                            <Input
                              type="time"
                              value={pontoForm.entry_2}
                              onChange={e => setPontoForm(f => ({ ...f, entry_2: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label>Saída</Label>
                            <Input
                              type="time"
                              value={pontoForm.exit_2}
                              onChange={e => setPontoForm(f => ({ ...f, exit_2: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resumo calculado */}
                      {pontoHoje && (
                        <div className="grid grid-cols-3 gap-3">
                          <div className="bg-success/10 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground">Trabalhadas</p>
                            <p className="text-lg font-bold text-success">
                              {pontoHoje.worked_hours.toFixed(1)}h
                            </p>
                          </div>
                          <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground">Intervalo</p>
                            <p className="text-lg font-bold">
                              {pontoHoje.break_hours.toFixed(1)}h
                            </p>
                          </div>
                          <div className={`rounded-lg p-3 text-center ${pontoHoje.bank_hours >= 0 ? 'bg-primary/10' : 'bg-destructive/10'}`}>
                            <p className="text-xs text-muted-foreground">Banco de Horas</p>
                            <p className={`text-lg font-bold ${pontoHoje.bank_hours >= 0 ? 'text-primary' : 'text-destructive'}`}>
                              {pontoHoje.bank_hours >= 0 ? '+' : ''}{pontoHoje.bank_hours.toFixed(1)}h
                            </p>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={handleSavePonto}
                        disabled={saveTimeSummary.isPending || (!pontoForm.entry_1 && !pontoForm.exit_1 && !pontoForm.entry_2 && !pontoForm.exit_2)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        {saveTimeSummary.isPending ? 'Salvando...' : pontoHoje ? 'Atualizar Ponto' : 'Registrar Ponto'}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Exportação mensal */}
              {myProfile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-primary" />
                      Exportar Relatório Mensal
                    </CardTitle>
                    <CardDescription>Baixe o espelho de ponto em Excel ou PDF</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => {
                          const d = new Date(exportYear, exportMonth - 2, 1);
                          setExportMonth(d.getMonth() + 1);
                          setExportYear(d.getFullYear());
                        }}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm font-medium min-w-[120px] text-center capitalize">{monthLabel}</span>
                        <Button variant="outline" size="icon" onClick={() => {
                          const d = new Date(exportYear, exportMonth, 1);
                          setExportMonth(d.getMonth() + 1);
                          setExportYear(d.getFullYear());
                        }} disabled={exportMonth === new Date().getMonth() + 1 && exportYear === new Date().getFullYear()}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                      <span className="text-sm text-muted-foreground">{monthlyRecords.length} registros</span>
                      <div className="flex gap-2 ml-auto">
                        <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={monthlyRecords.length === 0}>
                          <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={monthlyRecords.length === 0}>
                          <FilePDF className="h-4 w-4 mr-1" /> PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Histórico recente */}
              {myId && timeSummary.filter(t => t.employee_id === myId).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Histórico Recente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Entrada</TableHead>
                          <TableHead>Saída</TableHead>
                          <TableHead>Trabalhadas</TableHead>
                          <TableHead>Banco</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {timeSummary
                          .filter(t => t.employee_id === myId)
                          .slice(0, 10)
                          .map(t => (
                            <TableRow key={t.id}>
                              <TableCell className="font-medium">
                                {format(new Date(t.work_date + 'T12:00:00'), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell>{t.entry_1?.slice(0, 5) || '-'}</TableCell>
                              <TableCell>{t.exit_2?.slice(0, 5) || '-'}</TableCell>
                              <TableCell>{t.worked_hours.toFixed(1)}h</TableCell>
                              <TableCell>
                                <span className={t.bank_hours >= 0 ? 'text-success' : 'text-destructive'}>
                                  {t.bank_hours >= 0 ? '+' : ''}{t.bank_hours.toFixed(1)}h
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Holerites Tab */}
          <TabsContent value="holerites">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meus Holerites</CardTitle>
                <CardDescription>Contracheques disponíveis para download</CardDescription>
              </CardHeader>
              <CardContent>
                {payslipsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : myPayslips.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum holerite disponível</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referência</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Disponível</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myPayslips.map((payslip) => (
                        <TableRow key={payslip.id}>
                          <TableCell className="font-medium">
                            {monthNames[payslip.reference_month]}/{payslip.reference_year}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{payslip.document_type}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={payslip.is_available ? 'default' : 'secondary'}>
                              {payslip.is_available ? 'Sim' : 'Não'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {payslip.pdf_url && (
                              <Button size="sm" variant="ghost" asChild>
                                <a href={payslip.pdf_url} target="_blank" rel="noopener noreferrer">
                                  <Download className="h-4 w-4 mr-1" /> PDF
                                </a>
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefícios Tab */}
          <TabsContent value="beneficios">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meus Benefícios</CardTitle>
                <CardDescription>Benefícios ativos vinculados ao seu cadastro</CardDescription>
              </CardHeader>
              <CardContent>
                {employeeBenefitsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : myBenefits.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Gift className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum benefício ativo</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {myBenefits.map((benefit) => {
                      const Icon = benefitTypeIcons[benefit.benefit_type] || Gift;
                      return (
                        <div key={benefit.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">
                                {benefitTypeLabels[benefit.benefit_type] || benefit.benefit_type}
                              </p>
                              {benefit.benefit_name && (
                                <p className="text-sm text-muted-foreground">{benefit.benefit_name}</p>
                              )}
                              {benefit.provider && (
                                <p className="text-xs text-muted-foreground">{benefit.provider}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-success">
                              {formatCurrency(benefit.company_value)}
                            </p>
                            {benefit.employee_discount > 0 && (
                              <p className="text-xs text-destructive">
                                Desconto: {formatCurrency(benefit.employee_discount)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Solicitações Tab */}
          <TabsContent value="solicitacoes">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Minhas Solicitações</CardTitle>
                  <CardDescription>Acompanhe suas solicitações ao RH</CardDescription>
                </div>
                <Dialog open={newRequestOpen} onOpenChange={setNewRequestOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" disabled={!myProfile}>
                      <Plus className="h-4 w-4 mr-1" /> Nova Solicitação
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova Solicitação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-2">
                      <div>
                        <Label>Tipo</Label>
                        <Select
                          value={requestForm.request_type}
                          onValueChange={v => setRequestForm({ ...requestForm, request_type: v })}
                        >
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(requestTypeLabels).map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Título *</Label>
                        <Input
                          value={requestForm.title}
                          onChange={e => setRequestForm({ ...requestForm, title: e.target.value })}
                          placeholder="Ex: Solicitar férias em Janeiro"
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={requestForm.description}
                          onChange={e => setRequestForm({ ...requestForm, description: e.target.value })}
                          placeholder="Detalhes da solicitação..."
                          rows={3}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setNewRequestOpen(false)}>Cancelar</Button>
                      <Button onClick={handleSubmitRequest} disabled={!requestForm.title}>Enviar</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : myRequests.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma solicitação enviada</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {myRequests.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell>{requestTypeLabels[req.request_type] || req.request_type}</TableCell>
                          <TableCell className="font-medium">{req.title}</TableCell>
                          <TableCell>{format(new Date(req.submitted_at), 'dd/MM/yyyy')}</TableCell>
                          <TableCell>
                            <Badge className={statusColors[req.status]}>
                              {statusLabels[req.status]}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Meus Dados Tab */}
          <TabsContent value="dados">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Meus Dados</CardTitle>
                <CardDescription>Informações do seu cadastro</CardDescription>
              </CardHeader>
              <CardContent>
                {myProfile ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Dados Pessoais
                      </h3>
                      <div className="space-y-3">
                        <InfoRow label="Nome" value={myProfile.full_name} />
                        <InfoRow label="CPF" value={myProfile.cpf || 'Não informado'} />
                        <InfoRow label="Email Corporativo" value={myProfile.corporate_email || '-'} />
                        <InfoRow label="Telefone" value={myProfile.phone || '-'} />
                        <InfoRow label="Data de Nascimento" value={myProfile.birth_date ? format(new Date(myProfile.birth_date), 'dd/MM/yyyy') : '-'} />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                        Dados Contratuais
                      </h3>
                      <div className="space-y-3">
                        <InfoRow label="Cargo" value={myProfile.cargo?.nome || '-'} />
                        <InfoRow label="Departamento" value={myProfile.departamento?.nome || '-'} />
                        <InfoRow label="Tipo de Contrato" value={myProfile.contract_type.toUpperCase()} />
                        <InfoRow label="Data de Admissão" value={format(new Date(myProfile.hire_date), 'dd/MM/yyyy')} />
                        <InfoRow label="Jornada" value={myProfile.journey_type} />
                        <InfoRow label="Salário Base" value={formatCurrency(myProfile.base_salary)} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Perfil não encontrado</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
