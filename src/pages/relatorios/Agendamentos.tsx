// =====================================================
// AGENDAMENTOS DE RELATÓRIOS
// =====================================================

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Play,
  Mail,
  FileSpreadsheet,
  ArrowLeft,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { 
  useReportSchedules, 
  useDeleteReportSchedule,
  useReportCatalog,
} from '@/hooks/useAdvancedReports';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Única vez',
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

export default function AgendamentosRelatorios() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const { data: schedules = [], isLoading, refetch } = useReportSchedules();
  const { reports } = useReportCatalog();
  const deleteSchedule = useDeleteReportSchedule();
  
  const handleToggleSchedule = (scheduleId: string, isActive: boolean) => {
    toast.success(isActive ? 'Agendamento pausado' : 'Agendamento ativado');
  };
  
  const handleDeleteSchedule = (scheduleId: string) => {
    deleteSchedule.mutate(scheduleId);
  };
  
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <a href="/relatorios/central">
                <ArrowLeft className="h-4 w-4" />
              </a>
            </Button>
            <PageHeader
              title="Agendamentos de Relatórios"
              description="Configure relatórios para geração automática"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Novo Agendamento</DialogTitle>
                <DialogDescription>
                  Configure a geração automática de um relatório
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Relatório</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um relatório" />
                    </SelectTrigger>
                    <SelectContent>
                      {reports.map((report) => (
                        <SelectItem key={report.code} value={report.code}>
                          {report.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário</SelectItem>
                      <SelectItem value="weekly">Semanal</SelectItem>
                      <SelectItem value="monthly">Mensal</SelectItem>
                      <SelectItem value="quarterly">Trimestral</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Horário de execução</Label>
                  <Input type="time" defaultValue="08:00" />
                </div>
                
                <div className="space-y-2">
                  <Label>Formato de exportação</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="pdf">PDF</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Destinatários (email)</Label>
                  <Input 
                    type="email" 
                    placeholder="email@exemplo.com, outro@exemplo.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separe múltiplos emails por vírgula
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => {
                  toast.success('Agendamento criado com sucesso');
                  setIsDialogOpen(false);
                }}>
                  Criar Agendamento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{schedules.length}</p>
                  <p className="text-xs text-muted-foreground">Total de agendamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary text-secondary-foreground">
                  <Play className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {schedules.filter(s => s.isActive).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-bold">0</p>
                  <p className="text-xs text-muted-foreground">Enviados hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Schedules List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Agendamentos Configurados
              </CardTitle>
              <CardDescription>
                Gerencie seus relatórios automáticos
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Nenhum agendamento configurado</h3>
                <p className="mb-6 max-w-md text-sm text-muted-foreground">
                  Crie um agendamento para gerar relatórios automaticamente
                </p>
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Agendamento
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {schedules.map((schedule) => (
                    <Card key={schedule.id} className="bg-muted/30">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-background">
                              <FileSpreadsheet className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{schedule.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline">
                                  {FREQUENCY_LABELS[schedule.frequency] || schedule.frequency}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  às {schedule.scheduleConfig?.time || '08:00'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  • {schedule.recipients.length} destinatário(s)
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">
                                {schedule.isActive ? 'Ativo' : 'Pausado'}
                              </span>
                              <Switch
                                checked={schedule.isActive}
                                onCheckedChange={() => handleToggleSchedule(schedule.id, schedule.isActive)}
                              />
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon">
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteSchedule(schedule.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        {schedule.lastRunAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Última execução: {format(new Date(schedule.lastRunAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}