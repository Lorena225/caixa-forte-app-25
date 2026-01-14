import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Filter, User } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors: Record<string, string> = {
  ativo: 'bg-green-100 text-green-800',
  ferias: 'bg-blue-100 text-blue-800',
  afastado: 'bg-orange-100 text-orange-800',
  demitido: 'bg-red-100 text-red-800',
  suspenso: 'bg-gray-100 text-gray-800',
};

const tipoContratoLabels: Record<string, string> = {
  clt: 'CLT',
  pj: 'PJ',
  estagiario: 'Estagiário',
  temporario: 'Temporário',
  autonomo: 'Autônomo',
};

export default function Funcionarios() {
  const { funcionarios, funcionariosLoading, departamentos, cargos, createFuncionario } = useRH();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    cpf: '',
    email: '',
    celular: '',
    data_admissao: new Date().toISOString().split('T')[0],
    cargo_id: '',
    departamento_id: '',
    tipo_contrato: 'clt' as const,
    salario_base: '',
  });

  const filtered = funcionarios.filter(f => {
    const matchSearch = f.nome_completo.toLowerCase().includes(search.toLowerCase()) ||
                       f.matricula.toLowerCase().includes(search.toLowerCase()) ||
                       f.cpf?.includes(search);
    const matchStatus = statusFilter === 'all' || f.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createFuncionario.mutateAsync({
      ...formData,
      salario_base: parseFloat(formData.salario_base) || 0,
      cargo_id: formData.cargo_id || null,
      departamento_id: formData.departamento_id || null,
    });
    setIsDialogOpen(false);
    setFormData({
      nome_completo: '',
      cpf: '',
      email: '',
      celular: '',
      data_admissao: new Date().toISOString().split('T')[0],
      cargo_id: '',
      departamento_id: '',
      tipo_contrato: 'clt',
      salario_base: '',
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Funcionários</h1>
            <p className="text-muted-foreground">Cadastro e gestão de colaboradores</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Funcionário</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input
                      value={formData.nome_completo}
                      onChange={e => setFormData(p => ({ ...p, nome_completo: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input
                      value={formData.cpf}
                      onChange={e => setFormData(p => ({ ...p, cpf: e.target.value }))}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div>
                    <Label>Celular</Label>
                    <Input
                      value={formData.celular}
                      onChange={e => setFormData(p => ({ ...p, celular: e.target.value }))}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>Data de Admissão *</Label>
                    <Input
                      type="date"
                      value={formData.data_admissao}
                      onChange={e => setFormData(p => ({ ...p, data_admissao: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Select value={formData.cargo_id} onValueChange={v => setFormData(p => ({ ...p, cargo_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargos.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Departamento</Label>
                    <Select value={formData.departamento_id} onValueChange={v => setFormData(p => ({ ...p, departamento_id: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {departamentos.map(d => (
                          <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tipo de Contrato</Label>
                    <Select value={formData.tipo_contrato} onValueChange={v => setFormData(p => ({ ...p, tipo_contrato: v as any }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="clt">CLT</SelectItem>
                        <SelectItem value="pj">PJ</SelectItem>
                        <SelectItem value="estagiario">Estagiário</SelectItem>
                        <SelectItem value="temporario">Temporário</SelectItem>
                        <SelectItem value="autonomo">Autônomo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Salário Base *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.salario_base}
                      onChange={e => setFormData(p => ({ ...p, salario_base: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createFuncionario.isPending}>
                    {createFuncionario.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, matrícula ou CPF..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="ferias">Em Férias</SelectItem>
                  <SelectItem value="afastado">Afastados</SelectItem>
                  <SelectItem value="demitido">Demitidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead className="text-right">Salário</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {funcionariosLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum funcionário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map(func => (
                    <TableRow key={func.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono">{func.matricula}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{func.nome_completo}</p>
                            <p className="text-xs text-muted-foreground">{func.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{func.cargo?.nome || '-'}</TableCell>
                      <TableCell>{func.departamento?.nome || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{tipoContratoLabels[func.tipo_contrato]}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(func.salario_base)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[func.status]}>
                          {func.status}
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
