import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFiscalPeriods, useCreateFiscalPeriod, useCloseFiscalPeriod, usePeriodLocks, useTogglePeriodLock } from "@/hooks/useFiscalPeriods";
import { Plus, Lock, Unlock, Calendar, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MODULES = ["GL", "AP", "AR", "TREASURY", "FISCAL"];

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function FiscalPeriodsPage() {
  const { data: periods, isLoading } = useFiscalPeriods();
  const createPeriod = useCreateFiscalPeriod();
  const closePeriod = useCloseFiscalPeriod();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1);

  const { data: locks } = usePeriodLocks(selectedPeriod);
  const toggleLock = useTogglePeriodLock();

  const handleCreate = () => {
    createPeriod.mutate({ year: newYear, month: newMonth }, {
      onSuccess: () => setShowCreateDialog(false)
    });
  };

  const isLocked = (module: string) => {
    const lock = locks?.find(l => l.module === module);
    return lock?.locked_at != null && lock?.unlocked_at == null;
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Períodos Fiscais"
          description="Gerenciar períodos contábeis e travas por módulo"
        >
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Período
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Período Fiscal</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Ano</Label>
                    <Input
                      type="number"
                      value={newYear}
                      onChange={(e) => setNewYear(parseInt(e.target.value))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Mês</Label>
                    <Select value={newMonth.toString()} onValueChange={(v) => setNewMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {monthNames.map((name, idx) => (
                          <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={handleCreate} disabled={createPeriod.isPending}>
                  Criar Período
                </Button>
              </DialogContent>
            </Dialog>
          </PageHeader>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Períodos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : periods?.length === 0 ? (
                <p className="text-muted-foreground">Nenhum período cadastrado</p>
              ) : (
                <div className="space-y-2">
                  {periods?.map((period) => (
                    <div
                      key={period.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPeriod === period.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                      }`}
                      onClick={() => setSelectedPeriod(period.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-medium">
                          {monthNames[period.period_month - 1]} {period.period_year}
                        </div>
                        <Badge variant={period.status === 'open' ? 'default' : 'secondary'}>
                          {period.status === 'open' ? 'Aberto' : 'Fechado'}
                        </Badge>
                      </div>
                      {period.status === 'open' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            closePeriod.mutate(period.id);
                          }}
                        >
                          Fechar Período
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Travas por Módulo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedPeriod ? (
                <p className="text-muted-foreground">Selecione um período para gerenciar travas</p>
              ) : (
                <div className="space-y-4">
                  {MODULES.map((module) => {
                    const locked = isLocked(module);
                    return (
                      <div key={module} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {locked ? (
                            <Lock className="h-4 w-4 text-destructive" />
                          ) : (
                            <Unlock className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="font-medium">{module}</span>
                        </div>
                        <Switch
                          checked={locked}
                          onCheckedChange={(checked) => {
                            toggleLock.mutate({
                              periodId: selectedPeriod,
                              module,
                              lock: checked
                            });
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
