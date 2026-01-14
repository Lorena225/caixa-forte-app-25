import { useState } from 'react';
import { CalendarCheck, Plus, Send, AlertTriangle, CheckCircle, Clock, FileText, RefreshCw } from 'lucide-react';
import { format, addDays, isBefore, isAfter, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PageHeader } from '@/components/common/PageHeader';
import { KPICard } from '@/components/dashboard/KPICard';
import { useTaxObligations, usePendingObligations, useOverdueObligations, useCreateTaxObligation, useTransmitObligation, OBLIGATION_TYPES } from '@/hooks/useTaxObligations';
import { cn } from '@/lib/utils';

export default function ObrigacoesAcessorias() {
  const currentYear = new Date().getFullYear();
  
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedStatus, setSelectedStatus] = useState('__all__');
  const [selectedType, setSelectedType] = useState('__all__');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [formData, setFormData] = useState({
    obligation_type: '',
    reference_year: currentYear,
    reference_month: new Date().getMonth() + 1,
  });
  
  const { data: obligations = [], isLoading } = useTaxObligations({
    year: selectedYear,
    status: selectedStatus,
    type: selectedType,
  });
  const { data: pending = [] } = usePendingObligations();
  const { data: overdue = [] } = useOverdueObligations();
  const createMutation = useCreateTaxObligation();
  const transmitMutation = useTransmitObligation();
  
  const handleCreate = () => {
    if (!formData.obligation_type || !dueDate) return;
    
    createMutation.mutate({
      ...formData,
      due_date: format(dueDate, 'yyyy-MM-dd'),
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setFormData({
          obligation_type: '',
          reference_year: currentYear,
          reference_month: new Date().getMonth() + 1,
        });
        setDueDate(undefined);
      },
    });
  };
  
  const handleTransmit = (id: string) => {
    transmitMutation.mutate(id);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aceita':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Aceita</Badge>;
      case 'transmitida':
        return <Badge variant="default"><Send className="h-3 w-3 mr-1" />Transmitida</Badge>;
      case 'gerada':
        return <Badge variant="secondary"><FileText className="h-3 w-3 mr-1" />Gerada</Badge>;
      case 'em_elaboracao':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Em Elaboração</Badge>;
      case 'rejeitada':
        return <Badge variant="destructive">Rejeitada</Badge>;
      case 'retificada':
        return <Badge variant="secondary">Retificada</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };
  
  const getDueDateBadge = (dateStr: string, status: string) => {
    if (['aceita', 'transmitida'].includes(status)) return null;
    
    const dueDate = new Date(dateStr);
    const today = new Date();
    const sevenDaysFromNow = addDays(today, 7);
    
    if (isBefore(dueDate, today)) {
      return <Badge variant="destructive">Atrasada</Badge>;
    } else if (isBefore(dueDate, sevenDaysFromNow)) {
      return <Badge className="bg-yellow-500">Próxima</Badge>;
    }
    return null;
  };

  // Calendar data for visualization
  const calendarObligations = obligations.filter(o => {
    const date = new Date(o.due_date);
    const start = startOfMonth(new Date(selectedYear, new Date().getMonth(), 1));
    const end = endOfMonth(addDays(start, 60));
    return isAfter(date, start) && isBefore(date, end);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Obrigações Acessórias"
        description="Calendário fiscal e transmissão de obrigações"
      />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Pendentes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{pending.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Atrasadas</CardTitle></CardHeader>
          <CardContent><p className={`text-2xl font-bold ${overdue.length > 0 ? 'text-destructive' : ''}`}>{overdue.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Transmitidas (Mês)</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{obligations.filter(o => o.status === 'transmitida' || o.status === 'aceita').length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total do Ano</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{obligations.length}</p></CardContent>
        </Card>
      </div>

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                {overdue.length} obrigação(ões) em atraso!
              </p>
              <p className="text-sm text-muted-foreground">
                {overdue.map(o => o.obligation_name).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Obligation type cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {OBLIGATION_TYPES.slice(0, 4).map((type) => {
          const typeObligations = obligations.filter(o => o.obligation_type === type.code);
          const pendingCount = typeObligations.filter(o => !['aceita', 'transmitida'].includes(o.status)).length;
          
          return (
            <Card key={type.code}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{type.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total:</span>
                    <span>{typeObligations.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pendentes:</span>
                    <span className={pendingCount > 0 ? 'text-yellow-600' : ''}>{pendingCount}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento:</span>
                    <span>Dia {type.dayDue || '-'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and actions */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-2">
          <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
            <SelectTrigger className="w-[100px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[currentYear - 1, currentYear, currentYear + 1].map(year => (
                <SelectItem key={year} value={String(year)}>{year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_elaboracao">Em Elaboração</SelectItem>
              <SelectItem value="gerada">Gerada</SelectItem>
              <SelectItem value="transmitida">Transmitida</SelectItem>
              <SelectItem value="aceita">Aceita</SelectItem>
              <SelectItem value="rejeitada">Rejeitada</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos os tipos</SelectItem>
              {OBLIGATION_TYPES.map(type => (
                <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Obrigação
        </Button>
      </div>

      {/* Obligations table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5" />
            Obrigações Fiscais
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : obligations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma obrigação encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obrigação</TableHead>
                  <TableHead>Referência</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Transmissão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {obligations.map((obl) => (
                  <TableRow key={obl.id}>
                    <TableCell className="font-medium">{obl.obligation_name}</TableCell>
                    <TableCell>
                      {obl.reference_month 
                        ? `${String(obl.reference_month).padStart(2, '0')}/${obl.reference_year}`
                        : obl.reference_year}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {format(new Date(obl.due_date), 'dd/MM/yyyy', { locale: ptBR })}
                        {getDueDateBadge(obl.due_date, obl.status)}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(obl.status)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {obl.protocol_number || '-'}
                    </TableCell>
                    <TableCell>
                      {obl.transmission_date 
                        ? format(new Date(obl.transmission_date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {['pendente', 'em_elaboracao', 'gerada'].includes(obl.status) && (
                        <Button
                          size="sm"
                          onClick={() => handleTransmit(obl.id)}
                          disabled={transmitMutation.isPending}
                        >
                          {transmitMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Transmitir
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

      {/* Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Obrigação Acessória</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo de Obrigação</Label>
              <Select 
                value={formData.obligation_type} 
                onValueChange={(v) => setFormData({ ...formData, obligation_type: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {OBLIGATION_TYPES.map(type => (
                    <SelectItem key={type.code} value={type.code}>{type.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mês Referência</Label>
                <Select 
                  value={String(formData.reference_month)} 
                  onValueChange={(v) => setFormData({ ...formData, reference_month: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {format(new Date(2024, i, 1), 'MMMM', { locale: ptBR })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ano Referência</Label>
                <Select 
                  value={String(formData.reference_year)} 
                  onValueChange={(v) => setFormData({ ...formData, reference_year: Number(v) })}
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
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarCheck className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleCreate} 
              disabled={!formData.obligation_type || !dueDate || createMutation.isPending}
            >
              Criar Obrigação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
