import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, DollarSign, Calculator, Download } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  rascunho: 'bg-gray-100 text-gray-800',
  processando: 'bg-yellow-100 text-yellow-800',
  processada: 'bg-blue-100 text-blue-800',
  aprovada: 'bg-green-100 text-green-800',
  paga: 'bg-emerald-100 text-emerald-800',
  cancelada: 'bg-red-100 text-red-800',
};

const tipoLabels: Record<string, string> = {
  mensal: 'Mensal',
  decimo_terceiro: '13º Salário',
  ferias: 'Férias',
  rescisao: 'Rescisão',
  adiantamento: 'Adiantamento',
};

const meses = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function Folha() {
  const { folhas, folhasLoading, createFolha, funcionarios } = useRH();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    mes_referencia: new Date().getMonth() + 1,
    ano_referencia: new Date().getFullYear(),
    tipo: 'mensal' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFolha.mutateAsync(formData);
    setIsDialogOpen(false);
  };

  const totalAtivos = funcionarios.filter(f => f.status === 'ativo').length;
  const ultimaFolha = folhas[0];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Folha de Pagamento</h1>
            <p className="text-muted-foreground">Processamento e consulta de folhas</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Folha
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Folha</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Mês</Label>
                    <Select 
                      value={String(formData.mes_referencia)} 
                      onValueChange={v => setFormData(p => ({ ...p, mes_referencia: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {meses.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Ano</Label>
                    <Select 
                      value={String(formData.ano_referencia)} 
                      onValueChange={v => setFormData(p => ({ ...p, ano_referencia: parseInt(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026].map(y => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.tipo} 
                    onValueChange={v => setFormData(p => ({ ...p, tipo: v as any }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensal">Mensal</SelectItem>
                      <SelectItem value="decimo_terceiro">13º Salário</SelectItem>
                      <SelectItem value="adiantamento">Adiantamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-sm text-muted-foreground">
                  Serão processados <strong>{totalAtivos}</strong> funcionários ativos.
                </p>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createFolha.isPending}>
                    <Calculator className="h-4 w-4 mr-2" />
                    {createFolha.isPending ? 'Criando...' : 'Criar Folha'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Resumo última folha */}
        {ultimaFolha && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Proventos</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(ultimaFolha.total_proventos)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Descontos</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(ultimaFolha.total_descontos)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total Líquido</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(ultimaFolha.total_liquido)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">FGTS a Recolher</p>
                <p className="text-xl font-bold text-orange-600">{formatCurrency(ultimaFolha.total_fgts)}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Histórico de Folhas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Proventos</TableHead>
                  <TableHead className="text-right">Descontos</TableHead>
                  <TableHead className="text-right">Líquido</TableHead>
                  <TableHead className="text-center">Funcionários</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {folhasLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : folhas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma folha processada
                    </TableCell>
                  </TableRow>
                ) : (
                  folhas.map(folha => (
                    <TableRow key={folha.id}>
                      <TableCell className="font-medium">
                        {meses[folha.mes_referencia - 1]} / {folha.ano_referencia}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoLabels[folha.tipo]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-green-600">
                        {formatCurrency(folha.total_proventos)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600">
                        {formatCurrency(folha.total_descontos)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {formatCurrency(folha.total_liquido)}
                      </TableCell>
                      <TableCell className="text-center">
                        {folha.quantidade_funcionarios}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[folha.status]}>
                          {folha.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
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
