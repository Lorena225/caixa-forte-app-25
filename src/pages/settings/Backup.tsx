import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';
import { 
  useBackupJobs, 
  useBackupStats, 
  useBackupPolicySettings,
  useBackupExecutions,
  useTriggerBackup,
  useUpsertBackupPolicy,
  useCreateBackupJob,
  useRecoveryLogs,
  useInitiateRestore,
} from '@/hooks/useBackupManagement';
import { backupNow, deleteBackup } from '@/services/backupService';
import { BACKUP_TYPES, BACKUP_FREQUENCIES } from '@/types/backup';
import { 
  Database, Download, Clock, CheckCircle, XCircle, 
  AlertTriangle, RefreshCw, Trash2, Calendar,
  HardDrive, Settings, Play, RotateCcw,
  Lock, History, FileWarning
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export default function BackupPage() {
  const { currentCompany, user } = useAuth();
  const companyId = currentCompany?.id;
  
  const { data: stats, refetch: refetchStats } = useBackupStats();
  const { data: policy } = useBackupPolicySettings();
  const { data: jobs } = useBackupJobs();
  const { data: executions, refetch: refetchExecutions } = useBackupExecutions();
  const triggerBackup = useTriggerBackup();
  const updatePolicy = useUpsertBackupPolicy();
  const createJob = useCreateBackupJob();
  
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    type: 'completo' as const,
    frequencia: 'diario' as const,
    hora: '02',
    retencao: 30,
  });

  const handleBackupNow = async (type: 'completo' | 'incremental' | 'configuracoes') => {
    if (!companyId) return;
    
    setIsBackingUp(true);
    setBackupProgress(10);
    
    try {
      setBackupProgress(30);
      const result = await backupNow(companyId, type, { userId: user?.id });
      setBackupProgress(80);
      
      if (result.success && result.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = `backup_${type}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setBackupProgress(100);
        toast.success(`Backup ${type} concluído! Download iniciado.`);
        refetchStats();
        refetchExecutions();
      } else {
        throw new Error(result.error || 'Backup failed');
      }
    } catch (error) {
      toast.error('Erro ao realizar backup: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsBackingUp(false);
      setBackupProgress(0);
    }
  };

  const handleCreateSchedule = async () => {
    try {
      await createJob.mutateAsync({
        nome_job: `Backup ${newSchedule.type} - ${newSchedule.frequencia}`,
        tipo: newSchedule.type,
        frequencia: newSchedule.frequencia,
        descricao: `Agendamento automático às ${newSchedule.hora}:00`,
      });
      
      setScheduleDialogOpen(false);
      toast.success('Agendamento criado com sucesso!');
    } catch (error) {
      toast.error('Erro ao criar agendamento');
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este backup?')) return;
    
    const success = await deleteBackup(id);
    if (success) {
      toast.success('Backup excluído');
      refetchExecutions();
      refetchStats();
    } else {
      toast.error('Erro ao excluir backup');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <MainLayout>
      <PageHeader
        title="Backup e Recuperação"
        description="Gerencie backups automáticos e manuais dos dados da empresa"
        action={{
          label: "Atualizar",
          onClick: () => { refetchStats(); refetchExecutions(); },
          icon: <RefreshCw className="h-4 w-4" />
        }}
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Último Backup</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {stats?.ultimoBackup 
                ? format(new Date(stats.ultimoBackup), 'dd/MM HH:mm', { locale: ptBR })
                : 'Nenhum'}
            </div>
            {stats?.ultimoBackup && (
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(stats.ultimoBackup), { addSuffix: true, locale: ptBR })}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{stats?.taxaSucesso ?? 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.sucesso ?? 0} de {stats?.total ?? 0} (30 dias)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RPO / RTO</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">
              {policy?.rpo_minutos ?? 60}min / {policy?.rto_minutos ?? 240}min
            </div>
            <p className="text-xs text-muted-foreground">
              Objetivo de recuperação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retenção</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{policy?.retencao_dias ?? 30} dias</div>
            <p className="text-xs text-muted-foreground">
              Período de retenção
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Manual Backup */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Backup Manual
            </CardTitle>
            <CardDescription>
              Execute um backup imediato e faça download
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isBackingUp && (
              <div className="space-y-2">
                <Progress value={backupProgress} />
                <p className="text-sm text-muted-foreground text-center">
                  Processando backup... {backupProgress}%
                </p>
              </div>
            )}
            
            <div className="grid gap-3">
              <Button 
                className="w-full justify-start" 
                onClick={() => handleBackupNow('completo')}
                disabled={isBackingUp}
              >
                <Database className="h-4 w-4 mr-2" />
                Backup Completo
                <Badge variant="secondary" className="ml-auto">Todas as tabelas</Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleBackupNow('incremental')}
                disabled={isBackingUp}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Backup Incremental
                <Badge variant="outline" className="ml-auto">Tabelas críticas</Badge>
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => handleBackupNow('configuracoes')}
                disabled={isBackingUp}
              >
                <Settings className="h-4 w-4 mr-2" />
                Backup de Configurações
                <Badge variant="outline" className="ml-auto">Usuários, permissões</Badge>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Agendamento Automático
                </CardTitle>
                <CardDescription>
                  Configure backups automáticos
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setScheduleDialogOpen(true)}>
                Novo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {jobs && jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{job.nome_job}</p>
                      <p className="text-xs text-muted-foreground">
                        {job.frequencia} • {job.tipo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={job.ativo ? 'default' : 'secondary'}>
                        {job.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => triggerBackup.mutate(job.id)}
                        disabled={triggerBackup.isPending}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum agendamento configurado</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => setScheduleDialogOpen(true)}
                >
                  Criar agendamento
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backup History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
          <CardDescription>
            Últimas execuções de backup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Tamanho</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {executions && executions.length > 0 ? (
                executions.slice(0, 10).map((exec) => (
                  <TableRow key={exec.id}>
                    <TableCell>
                      {format(new Date(exec.iniciado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {(exec.detalhes as Record<string, unknown>)?.type as string || exec.backup_jobs?.tipo || 'completo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {exec.tamanho_bytes ? formatBytes(exec.tamanho_bytes) : '-'}
                    </TableCell>
                    <TableCell>
                      {exec.status === 'sucesso' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Sucesso
                        </Badge>
                      )}
                      {exec.status === 'falha' && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Falha
                        </Badge>
                      )}
                      {(exec.status === 'pendente' || exec.status === 'em_andamento') && (
                        <Badge variant="secondary">
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          {exec.status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="capitalize">
                      {exec.trigger_type || 'manual'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBackup(exec.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum backup encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Restore Section */}
      <RestoreSection executions={executions || []} />

      {/* Recovery History */}
      <RecoveryHistorySection />

      {/* Policy Alert */}
      {(!policy?.backup_db_enabled) && (
        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Backup automático desativado</AlertTitle>
          <AlertDescription>
            Configure uma política de backup para proteger seus dados automaticamente.
            <Button variant="link" className="p-0 h-auto ml-2" onClick={() => window.location.href = '/admin/backup/politica'}>
              Configurar política →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Agendamento de Backup</DialogTitle>
            <DialogDescription>
              Configure um backup automático recorrente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Tipo de Backup</Label>
              <Select 
                value={newSchedule.type} 
                onValueChange={(v) => setNewSchedule({ ...newSchedule, type: v as typeof newSchedule.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BACKUP_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Frequência</Label>
              <Select 
                value={newSchedule.frequencia} 
                onValueChange={(v) => setNewSchedule({ ...newSchedule, frequencia: v as typeof newSchedule.frequencia })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BACKUP_FREQUENCIES).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Horário de Execução</Label>
              <Select 
                value={newSchedule.hora} 
                onValueChange={(v) => setNewSchedule({ ...newSchedule, hora: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['00', '01', '02', '03', '04', '05', '06'].map(h => (
                    <SelectItem key={h} value={h}>{h}:00</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Retenção (dias)</Label>
              <Select 
                value={newSchedule.retencao.toString()} 
                onValueChange={(v) => setNewSchedule({ ...newSchedule, retencao: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="14">14 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateSchedule} disabled={createJob.isPending}>
              {createJob.isPending ? 'Criando...' : 'Criar Agendamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// ==================== RESTORE SECTION ====================
interface RestoreSectionProps {
  executions: Array<{
    id: string;
    status: string;
    iniciado_em: string;
    detalhes: unknown;
    backup_jobs?: { nome_job: string | null; tipo: string | null } | null;
  }>;
}

function RestoreSection({ executions }: RestoreSectionProps) {
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dryRun, setDryRun] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  
  const initiateRestore = useInitiateRestore();
  
  const successfulBackups = executions.filter(e => e.status === 'sucesso');
  
  const handleRestore = async () => {
    if (!selectedBackup || !confirmed) {
      toast.error('Selecione um backup e confirme a restauração');
      return;
    }
    
    if (confirmPassword.length < 6) {
      toast.error('Digite sua senha para confirmar');
      return;
    }
    
    try {
      await initiateRestore.mutateAsync({
        backupExecutionId: selectedBackup,
        dryRun,
      });
      setRestoreDialogOpen(false);
      setSelectedBackup('');
      setConfirmPassword('');
      setConfirmed(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  return (
    <>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Restauração de Dados
          </CardTitle>
          <CardDescription>
            Restaure dados de um backup anterior
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive" className="mb-4">
            <FileWarning className="h-4 w-4" />
            <AlertTitle>Atenção</AlertTitle>
            <AlertDescription>
              A restauração irá sobrescrever os dados atuais. Esta ação não pode ser desfeita.
              Recomendamos fazer um backup antes de restaurar.
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                {successfulBackups.length} backup(s) disponíveis para restauração
              </p>
            </div>
            <Button 
              variant="outline"
              onClick={() => setRestoreDialogOpen(true)}
              disabled={successfulBackups.length === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Iniciar Restauração
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-destructive" />
              Restauração de Backup
            </DialogTitle>
            <DialogDescription>
              Esta operação irá sobrescrever dados existentes. Proceda com cautela.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                TODOS os dados atuais serão substituídos pelos dados do backup selecionado.
                Esta ação é irreversível!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Label>Selecione o Backup</Label>
              <Select value={selectedBackup} onValueChange={setSelectedBackup}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um backup..." />
                </SelectTrigger>
                <SelectContent>
                  {successfulBackups.map((backup) => (
                    <SelectItem key={backup.id} value={backup.id}>
                      {format(new Date(backup.iniciado_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      {' - '}
                      {(backup.detalhes as Record<string, unknown>)?.type as string || backup.backup_jobs?.tipo || 'Completo'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirme sua Senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Digite sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="dry-run"
                checked={dryRun}
                onCheckedChange={(checked) => setDryRun(checked as boolean)}
              />
              <Label htmlFor="dry-run" className="text-sm">
                Modo de teste (dry run) - Simular sem alterar dados
              </Label>
            </div>
            
            <Separator />
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="confirm-restore"
                checked={confirmed}
                onCheckedChange={(checked) => setConfirmed(checked as boolean)}
              />
              <Label htmlFor="confirm-restore" className="text-sm font-medium text-destructive">
                Confirmo que desejo restaurar os dados e entendo que esta ação é irreversível
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRestoreDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleRestore}
              disabled={!selectedBackup || !confirmed || confirmPassword.length < 6 || initiateRestore.isPending}
            >
              {initiateRestore.isPending ? 'Iniciando...' : dryRun ? 'Simular Restauração' : 'Restaurar Dados'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ==================== RECOVERY HISTORY SECTION ====================
function RecoveryHistorySection() {
  const { data: recoveryLogs } = useRecoveryLogs();
  
  if (!recoveryLogs || recoveryLogs.length === 0) {
    return null;
  }
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Sucesso</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falha</Badge>;
      case 'in_progress':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Em andamento</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'cancelled':
        return <Badge variant="outline">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Restaurações
        </CardTitle>
        <CardDescription>
          Últimas operações de restauração realizadas
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registros</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Modo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recoveryLogs.slice(0, 10).map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  {format(new Date(log.started_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </TableCell>
                <TableCell>{getStatusBadge(log.status)}</TableCell>
                <TableCell>{log.recovered_records || 0}</TableCell>
                <TableCell>
                  {log.recovery_duration_seconds 
                    ? `${log.recovery_duration_seconds}s` 
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={log.dry_run ? 'outline' : 'secondary'}>
                    {log.dry_run ? 'Simulação' : 'Real'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
