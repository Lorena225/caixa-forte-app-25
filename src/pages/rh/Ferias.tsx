import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calendar, Sun, Check, X, Clock } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  programada: 'bg-gray-100 text-gray-800',
  solicitada: 'bg-yellow-100 text-yellow-800',
  aprovada: 'bg-green-100 text-green-800',
  rejeitada: 'bg-red-100 text-red-800',
  em_gozo: 'bg-blue-100 text-blue-800',
  concluida: 'bg-emerald-100 text-emerald-800',
  cancelada: 'bg-red-100 text-red-800',
};

const statusLabels: Record<string, string> = {
  programada: 'Programada',
  solicitada: 'Solicitada',
  aprovada: 'Aprovada',
  rejeitada: 'Rejeitada',
  em_gozo: 'Em Gozo',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

export default function Ferias() {
  const { ferias, feriasLoading, funcionarios, createFerias } = useRH();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    funcionario_id: '',
    data_inicio: '',
    dias: '30',
    abono_pecuniario: false,
  });

  const funcionariosAtivos = funcionarios.filter(f => f.status === 'ativo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dataInicio = new Date(formData.data_inicio);
    const dias = parseInt(formData.dias);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + dias - 1);

    await createFerias.mutateAsync({
      funcionario_id: formData.funcionario_id,
      data_inicio: formData.data_inicio,
      data_fim: dataFim.toISOString().split('T')[0],
      dias,
      tipo: 'integral',
      abono_pecuniario: formData.abono_pecuniario,
      dias_abono: formData.abono_pecuniario ? 10 : 0,
      status: 'programada',
    });
    setIsDialogOpen(false);
    setFormData({ funcionario_id: '', data_inicio: '', dias: '30', abono_pecuniario: false });
  };

  // Agrupar por status
  const emGozo = ferias.filter(f => f.status === 'em_gozo');
  const aprovadas = ferias.filter(f => f.status === 'aprovada');
  const pendentes = ferias.filter(f => ['programada', 'solicitada'].includes(f.status));

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Controle de Férias</h1>
            <p className="text-muted-foreground">Programação e acompanhamento</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Programar Férias
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Programar Férias</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Funcionário *</Label>
                  <Select 
                    value={formData.funcionario_id} 
                    onValueChange={v => setFormData(p => ({ ...p, funcionario_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o funcionário" />
                    </SelectTrigger>
                    <SelectContent>
                      {funcionariosAtivos.map(f => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.nome_completo} ({f.matricula})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data Início *</Label>
                    <Input
                      type="date"
                      value={formData.data_inicio}
                      onChange={e => setFormData(p => ({ ...p, data_inicio: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Dias</Label>
                    <Select 
                      value={formData.dias} 
                      onValueChange={v => setFormData(p => ({ ...p, dias: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10 dias</SelectItem>
                        <SelectItem value="15">15 dias</SelectItem>
                        <SelectItem value="20">20 dias</SelectItem>
                        <SelectItem value="30">30 dias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="abono"
                    checked={formData.abono_pecuniario}
                    onChange={e => setFormData(p => ({ ...p, abono_pecuniario: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="abono">Vender 10 dias (Abono Pecuniário)</Label>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createFerias.isPending}>
                    {createFerias.isPending ? 'Salvando...' : 'Programar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Cards resumo */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Sun className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{emGozo.length}</p>
                  <p className="text-sm text-muted-foreground">Em Gozo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Check className="h-8 w-8 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{aprovadas.length}</p>
                  <p className="text-sm text-muted-foreground">Aprovadas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">{pendentes.length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Todas as Férias
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead>Abono</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feriasLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : ferias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma férias cadastrada
                    </TableCell>
                  </TableRow>
                ) : (
                  ferias.map(f => (
                    <TableRow key={f.id}>
                      <TableCell>
                        <p className="font-medium">{f.funcionario?.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{f.funcionario?.matricula}</p>
                      </TableCell>
                      <TableCell>
                        {new Date(f.data_inicio).toLocaleDateString('pt-BR')} - {new Date(f.data_fim).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center font-mono">{f.dias}</TableCell>
                      <TableCell>
                        {f.abono_pecuniario ? (
                          <Badge variant="outline" className="bg-green-50">
                            {f.dias_abono} dias
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(f.valor_total)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[f.status]}>
                          {statusLabels[f.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
