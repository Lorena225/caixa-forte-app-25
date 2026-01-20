import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { BackButton } from '@/components/common/BackButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  useOrganizationalUnits,
  Department
} from '@/hooks/useOperacional';
import { Pencil, Trash2, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Departamentos() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrgUnit, setFilterOrgUnit] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Department | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    organizational_unit_id: '' as string | null,
    is_active: true,
  });

  const { data: departments = [], isLoading } = useDepartments({ is_active: showInactive ? undefined : true });
  const { data: orgUnits = [] } = useOrganizationalUnits({ is_active: true });
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  // Filter departments
  const filteredData = useMemo(() => {
    let result = departments;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(d => 
        d.name.toLowerCase().includes(term) || 
        d.code?.toLowerCase().includes(term)
      );
    }
    
    if (filterOrgUnit) {
      result = result.filter(d => d.organizational_unit_id === filterOrgUnit);
    }
    
    return result;
  }, [departments, searchTerm, filterOrgUnit]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      organizational_unit_id: null,
      is_active: true,
    });
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: Department) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      organizational_unit_id: item.organizational_unit_id,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({ title: 'Erro', description: 'Nome é obrigatório', variant: 'destructive' });
      return;
    }

    const payload = {
      ...formData,
      organizational_unit_id: formData.organizational_unit_id || null,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, ...payload }, {
        onSuccess: () => setDialogOpen(false),
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => setDialogOpen(false),
      });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este departamento?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader
              title="Seções e Departamentos"
              description="Cadastre e gerencie os departamentos da empresa"
              action={{ label: 'Novo Departamento', onClick: handleNew }}
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterOrgUnit || '__all__'} onValueChange={(v) => setFilterOrgUnit(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Unidade Organizacional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas Unidades</SelectItem>
                  {orgUnits.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Switch checked={showInactive} onCheckedChange={setShowInactive} id="show-inactive" />
                <Label htmlFor="show-inactive">Exibir inativos</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Unidade Organizacional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum departamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((dept) => (
                  <TableRow key={dept.id} className={cn(!dept.is_active && 'opacity-50')}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{dept.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono">{dept.code || '-'}</TableCell>
                    <TableCell>{dept.organizational_unit?.name || '-'}</TableCell>
                    <TableCell>
                      <StatusBadge status={dept.is_active ? 'ativo' : 'inativo'} />
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(dept)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(dept.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Excluir</TooltipContent>
                          </Tooltip>
                        </div>
                      </TooltipProvider>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome do departamento"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">Código</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Código interno"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="org_unit">Unidade Organizacional</Label>
              <Select 
                value={formData.organizational_unit_id || '__none__'} 
                onValueChange={(v) => setFormData({ ...formData, organizational_unit_id: v === '__none__' ? null : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {orgUnits.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
              {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
