import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Briefcase, Building2 } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { formatCurrency } from '@/lib/formatters';
import { Skeleton } from '@/components/ui/skeleton';

export default function Cargos() {
  const { cargos, cargosLoading, departamentos, departamentosLoading, createCargo, createDepartamento } = useRH();
  const [activeTab, setActiveTab] = useState('cargos');
  const [isCargoDialogOpen, setIsCargoDialogOpen] = useState(false);
  const [isDeptoDialogOpen, setIsDeptoDialogOpen] = useState(false);
  
  const [cargoForm, setCargoForm] = useState({
    nome: '',
    descricao: '',
    nivel: '1',
    salario_minimo: '',
    salario_maximo: '',
    cbo: '',
  });

  const [deptoForm, setDeptoForm] = useState({
    nome: '',
    descricao: '',
  });

  const handleCargoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCargo.mutateAsync({
      nome: cargoForm.nome,
      descricao: cargoForm.descricao || null,
      nivel: parseInt(cargoForm.nivel),
      salario_minimo: cargoForm.salario_minimo ? parseFloat(cargoForm.salario_minimo) : null,
      salario_maximo: cargoForm.salario_maximo ? parseFloat(cargoForm.salario_maximo) : null,
      cbo: cargoForm.cbo || null,
    });
    setIsCargoDialogOpen(false);
    setCargoForm({ nome: '', descricao: '', nivel: '1', salario_minimo: '', salario_maximo: '', cbo: '' });
  };

  const handleDeptoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDepartamento.mutateAsync({
      nome: deptoForm.nome,
      descricao: deptoForm.descricao || null,
    });
    setIsDeptoDialogOpen(false);
    setDeptoForm({ nome: '', descricao: '' });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Cargos e Departamentos</h1>
          <p className="text-muted-foreground">Estrutura organizacional da empresa</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="cargos" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Cargos
            </TabsTrigger>
            <TabsTrigger value="departamentos" className="gap-2">
              <Building2 className="h-4 w-4" />
              Departamentos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cargos" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cargos</CardTitle>
                <Dialog open={isCargoDialogOpen} onOpenChange={setIsCargoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Cargo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Cargo</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCargoSubmit} className="space-y-4">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={cargoForm.nome}
                          onChange={e => setCargoForm(p => ({ ...p, nome: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={cargoForm.descricao}
                          onChange={e => setCargoForm(p => ({ ...p, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <Label>Nível</Label>
                          <Input
                            type="number"
                            min="1"
                            value={cargoForm.nivel}
                            onChange={e => setCargoForm(p => ({ ...p, nivel: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Salário Mínimo</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={cargoForm.salario_minimo}
                            onChange={e => setCargoForm(p => ({ ...p, salario_minimo: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label>Salário Máximo</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={cargoForm.salario_maximo}
                            onChange={e => setCargoForm(p => ({ ...p, salario_maximo: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>CBO</Label>
                        <Input
                          value={cargoForm.cbo}
                          onChange={e => setCargoForm(p => ({ ...p, cbo: e.target.value }))}
                          placeholder="000000"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCargoDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createCargo.isPending}>
                          {createCargo.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-center">Nível</TableHead>
                      <TableHead className="text-right">Faixa Salarial</TableHead>
                      <TableHead>CBO</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cargosLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : cargos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Nenhum cargo cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      cargos.map(cargo => (
                        <TableRow key={cargo.id}>
                          <TableCell className="font-medium">{cargo.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{cargo.descricao || '-'}</TableCell>
                          <TableCell className="text-center">{cargo.nivel}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {cargo.salario_minimo || cargo.salario_maximo ? (
                              <>
                                {cargo.salario_minimo ? formatCurrency(cargo.salario_minimo) : '-'} ~ {cargo.salario_maximo ? formatCurrency(cargo.salario_maximo) : '-'}
                              </>
                            ) : '-'}
                          </TableCell>
                          <TableCell className="font-mono">{cargo.cbo || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={cargo.ativo ? 'default' : 'secondary'}>
                              {cargo.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departamentos" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Departamentos</CardTitle>
                <Dialog open={isDeptoDialogOpen} onOpenChange={setIsDeptoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Novo Departamento
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Novo Departamento</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleDeptoSubmit} className="space-y-4">
                      <div>
                        <Label>Nome *</Label>
                        <Input
                          value={deptoForm.nome}
                          onChange={e => setDeptoForm(p => ({ ...p, nome: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label>Descrição</Label>
                        <Textarea
                          value={deptoForm.descricao}
                          onChange={e => setDeptoForm(p => ({ ...p, descricao: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDeptoDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" disabled={createDepartamento.isPending}>
                          {createDepartamento.isPending ? 'Salvando...' : 'Salvar'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departamentosLoading ? (
                      Array.from({ length: 3 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell colSpan={3}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                      ))
                    ) : departamentos.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                          Nenhum departamento cadastrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      departamentos.map(depto => (
                        <TableRow key={depto.id}>
                          <TableCell className="font-medium">{depto.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{depto.descricao || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={depto.ativo ? 'default' : 'secondary'}>
                              {depto.ativo ? 'Ativo' : 'Inativo'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
