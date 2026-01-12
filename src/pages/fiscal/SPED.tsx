import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { formatDate } from '@/lib/formatters';
import { useSpedJobs, useCreateSpedJob, SPED_TYPE_LABELS, SPED_STATUS_LABELS, SPED_TYPE_DESCRIPTIONS, type SpedType, type SpedStatus } from '@/hooks/useSpedJobs';
import { FileSpreadsheet, Plus, Play, Download, Send, CheckCircle, Clock, AlertCircle, Loader2, FileCheck, Database } from 'lucide-react';

const STATUS_ICONS: Record<SpedStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  processing: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
  completed: <FileCheck className="h-4 w-4 text-success" />,
  error: <AlertCircle className="h-4 w-4 text-destructive" />,
  transmitted: <CheckCircle className="h-4 w-4 text-success" />,
};

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export default function SpedPage() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [newJobDialogOpen, setNewJobDialogOpen] = useState(false);
  const [newJobType, setNewJobType] = useState<SpedType>('efd_icms_ipi');
  const [newJobMonth, setNewJobMonth] = useState<number | undefined>(undefined);

  const { data: jobs = [], isLoading } = useSpedJobs(selectedYear);
  const createJob = useCreateSpedJob();

  const handleCreateJob = () => {
    createJob.mutate({ sped_type: newJobType, reference_year: selectedYear, reference_month: newJobMonth }, { onSuccess: () => setNewJobDialogOpen(false) });
  };

  const spedTypes: SpedType[] = ['efd_icms_ipi', 'efd_contribuicoes', 'ecf', 'ecd'];
  const isMonthlyType = (type: SpedType) => type === 'efd_icms_ipi' || type === 'efd_contribuicoes';

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="SPED - Obrigações Acessórias" description="Geração e transmissão de arquivos SPED">
          <div className="flex items-center gap-2">
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[currentYear - 2, currentYear - 1, currentYear].map((y) => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Dialog open={newJobDialogOpen} onOpenChange={setNewJobDialogOpen}>
              <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nova Geração</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Gerar Arquivo SPED</DialogTitle>
                  <DialogDescription>Selecione o tipo e período</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Select value={newJobType} onValueChange={(v) => setNewJobType(v as SpedType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {spedTypes.map((type) => <SelectItem key={type} value={type}>{SPED_TYPE_LABELS[type]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {isMonthlyType(newJobType) && (
                    <Select value={newJobMonth?.toString() || ''} onValueChange={(v) => setNewJobMonth(Number(v))}>
                      <SelectTrigger><SelectValue placeholder="Mês" /></SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => <SelectItem key={i} value={(i + 1).toString()}>{m}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setNewJobDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreateJob} disabled={createJob.isPending || (isMonthlyType(newJobType) && !newJobMonth)} className="gap-2">
                    {createJob.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    <Play className="h-4 w-4" />Iniciar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </PageHeader>

        <div className="grid gap-4 md:grid-cols-4">
          {spedTypes.map((type) => {
            const typeJobs = jobs.filter((j) => j.sped_type === type);
            const completedCount = typeJobs.filter((j) => j.status === 'completed' || j.status === 'transmitted').length;
            const totalExpected = isMonthlyType(type) ? 12 : 1;
            return (
              <Card key={type}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{SPED_TYPE_LABELS[type]}</CardTitle>
                  <CardDescription className="text-xs">{SPED_TYPE_DESCRIPTIONS[type]}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-medium">{completedCount}/{totalExpected}</span>
                  </div>
                  <Progress value={(completedCount / totalExpected) * 100} className="h-2" />
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <TableSkeleton columns={6} rows={5} /> : jobs.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Nenhuma geração para {selectedYear}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job) => (
                    <TableRow key={job.id}>
                      <TableCell><Badge variant="outline">{SPED_TYPE_LABELS[job.sped_type as SpedType]}</Badge></TableCell>
                      <TableCell>{job.reference_month ? `${MONTHS[job.reference_month - 1]}/${job.reference_year}` : job.reference_year}</TableCell>
                      <TableCell><div className="flex items-center gap-2">{STATUS_ICONS[job.status as SpedStatus]}<Badge variant={job.status === 'completed' || job.status === 'transmitted' ? 'default' : 'secondary'}>{SPED_STATUS_LABELS[job.status as SpedStatus]}</Badge></div></TableCell>
                      <TableCell>{job.record_count?.toLocaleString('pt-BR') || '-'}</TableCell>
                      <TableCell>{formatDate(job.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {job.status === 'completed' && <><Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button><Button variant="ghost" size="icon"><Send className="h-4 w-4" /></Button></>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
