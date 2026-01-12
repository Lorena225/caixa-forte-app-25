import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Lock, Unlock, CheckCircle, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useFiscalPeriods } from '@/hooks/useFiscalPeriods';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function Fechamento() {
  const { currentCompany } = useAuth();
  const { periods, locks, isLoading, closePeriod, reopenPeriod } = useFiscalPeriods(currentCompany?.id);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [action, setAction] = useState<'close' | 'reopen'>('close');

  const handleAction = async () => {
    if (!selectedPeriod) return;

    try {
      if (action === 'close') {
        await closePeriod.mutateAsync(selectedPeriod.id);
        toast.success('Período fechado com sucesso');
      } else {
        await reopenPeriod.mutateAsync(selectedPeriod.id);
        toast.success('Período reaberto com sucesso');
      }
      setDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { class: string; icon: React.ReactNode; label: string }> = {
      open: { class: 'bg-success/10 text-success', icon: <Unlock className="h-3 w-3" />, label: 'Aberto' },
      closing: { class: 'bg-warning/10 text-warning', icon: <Clock className="h-3 w-3" />, label: 'Em Fechamento' },
      closed: { class: 'bg-destructive/10 text-destructive', icon: <Lock className="h-3 w-3" />, label: 'Fechado' },
    };
    const c = config[status] || config.open;
    return (
      <Badge className={`${c.class} flex items-center gap-1`}>
        {c.icon}
        {c.label}
      </Badge>
    );
  };

  // Calculate progress from checklist
  const getChecklistProgress = (periodId: string) => {
    // This would come from closing_checklists table
    // For now, returning mock data
    return { completed: 5, total: 8, percentage: 62.5 };
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fechamento de Período"
          description="Fechar e travar períodos contábeis para proteção dos dados"
        />

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Unlock className="h-4 w-4 text-success" />
                Períodos Abertos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {periods?.filter(p => p.status === 'open').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Em Fechamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {periods?.filter(p => p.status === 'closing').length || 0}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Lock className="h-4 w-4 text-destructive" />
                Períodos Fechados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {periods?.filter(p => p.status === 'closed').length || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Períodos Fiscais</CardTitle>
            <CardDescription>Gerencie o fechamento dos períodos contábeis</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : periods && periods.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Checklist</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => {
                    const progress = getChecklistProgress(period.id);
                    return (
                      <TableRow key={period.id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>{format(new Date(period.start_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{format(new Date(period.end_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{getStatusBadge(period.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={progress.percentage} className="w-20 h-2" />
                            <span className="text-xs text-muted-foreground">
                              {progress.completed}/{progress.total}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {period.status === 'open' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedPeriod(period);
                                setAction('close');
                                setDialogOpen(true);
                              }}
                            >
                              <Lock className="mr-1 h-3 w-3" />
                              Fechar
                            </Button>
                          ) : period.status === 'closed' ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPeriod(period);
                                setAction('reopen');
                                setDialogOpen(true);
                              }}
                            >
                              <Unlock className="mr-1 h-3 w-3" />
                              Reabrir
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">Em processamento...</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum período fiscal configurado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Module Locks */}
        <Card>
          <CardHeader>
            <CardTitle>Travas por Módulo</CardTitle>
            <CardDescription>Status de travamento por área do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {locks && locks.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {locks.map((lock: any) => (
                  <Card key={lock.id} className={lock.is_locked ? 'border-destructive/50' : 'border-success/50'}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {lock.is_locked ? (
                            <Lock className="h-4 w-4 text-destructive" />
                          ) : (
                            <Unlock className="h-4 w-4 text-success" />
                          )}
                          <span className="font-medium capitalize">{lock.module_name}</span>
                        </div>
                        <Badge variant={lock.is_locked ? 'destructive' : 'outline'}>
                          {lock.is_locked ? 'Travado' : 'Livre'}
                        </Badge>
                      </div>
                      {lock.locked_until && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Até: {format(new Date(lock.locked_until), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma trava de módulo configurada
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {action === 'close' ? 'Fechar Período' : 'Reabrir Período'}
              </DialogTitle>
              <DialogDescription>
                {action === 'close' 
                  ? 'Esta ação irá travar todos os lançamentos do período. Novos lançamentos não poderão ser feitos neste período após o fechamento.'
                  : 'Reabrir o período permitirá novos lançamentos. Esta ação deve ser usada com cautela e requer justificativa.'}
              </DialogDescription>
            </DialogHeader>
            {selectedPeriod && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium">{selectedPeriod.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(selectedPeriod.start_date), 'dd/MM/yyyy')} a {format(new Date(selectedPeriod.end_date), 'dd/MM/yyyy')}
                </p>
              </div>
            )}
            {action === 'close' && (
              <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <p className="text-sm">
                  Certifique-se de que todos os itens do checklist de fechamento foram completados antes de prosseguir.
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant={action === 'close' ? 'destructive' : 'default'}
                onClick={handleAction}
              >
                {action === 'close' ? 'Confirmar Fechamento' : 'Confirmar Reabertura'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
