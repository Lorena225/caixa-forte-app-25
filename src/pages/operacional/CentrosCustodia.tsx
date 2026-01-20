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
import { useCostCenterList, useCreateCostCenter, useUpdateCostCenter, useDeleteCostCenter, CostCenter } from '@/hooks/useCostCenterHierarchy';
import { useOrganizationalUnits } from '@/hooks/useOperacional';
import { Pencil, Trash2, FolderTree } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CentrosCustodia() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOrgUnit, setFilterOrgUnit] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCenter | null>(null);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    level: 1,
    parent_id: '' as string | null,
    organizational_unit_id: '' as string | null,
    is_active: true,
  });

  const { data: costCenters = [], isLoading } = useCostCenterList();
  const { data: orgUnits = [] } = useOrganizationalUnits({ is_active: true });
  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();
  const deleteMutation = useDeleteCostCenter();

  // Filter cost centers
  const filteredData = useMemo(() => {
    let result = costCenters;
    
    if (!showInactive) {
      result = result.filter(cc => cc.is_active);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(cc => 
        cc.name.toLowerCase().includes(term) || 
        cc.code.toLowerCase().includes(term)
      );
    }
    
    if (filterOrgUnit) {
      result = result.filter(cc => (cc as any).organizational_unit_id === filterOrgUnit);
    }
    
    return result;
  }, [costCenters, showInactive, searchTerm, filterOrgUnit]);

  const resetForm = () => {
    setFormData({
      code: '',
      name: '',
      level: 1,
      parent_id: null,
      organizational_unit_id: null,
      is_active: true,
    });
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: CostCenter) => {
    setEditingItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      level: item.level,
      parent_id: item.parent_id,
      organizational_unit_id: (item as any).organizational_unit_id || null,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ title: 'Erro', description: 'Código e nome são obrigatórios', variant: 'destructive' });
      return;
    }

    const payload = {
      ...formData,
      parent_id: formData.parent_id || null,
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
    if (confirm('Tem certeza que deseja excluir este centro de custo?')) {
      deleteMutation.mutate(id);
    }
  };

  // Get org unit name
  const getOrgUnitName = (id: string | null): string => {
    if (!id) return '-';
    const unit = orgUnits.find(u => u.id === id);
    return unit?.name || '-';
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader
              title="Centros de Custódia"
              description="Gerencie os centros de custo e suas vinculações"
              action={{ label: 'Novo Centro de Custo', onClick: handleNew }}
            />
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Buscar por código ou nome..."
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
                <TableHead>Código</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Nível</TableHead>
                <TableHead>Unidade Organizacional</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum centro de custo encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((cc) => (
                  <TableRow key={cc.id} className={cn(!cc.is_active && 'opacity-50')}>
                    <TableCell className="font-mono">{cc.code}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FolderTree className="h-4 w-4 text-muted-foreground" />
                        {cc.name}
                      </div>
                    </TableCell>
                    <TableCell>Nível {cc.level}</TableCell>
                    <TableCell>{getOrgUnitName((cc as any).organizational_unit_id)}</TableCell>
                    <TableCell>
                      <StatusBadge status={cc.is_active ? 'ativo' : 'inativo'} />
                    </TableCell>
                    <TableCell>
                      <TooltipProvider>
                        <div className="flex gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(cc)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(cc.id)}>
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
            <DialogTitle>{editingItem ? 'Editar Centro de Custo' : 'Novo Centro de Custódia'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: 001.001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="level">Nível</Label>
                <Select value={formData.level.toString()} onValueChange={(v) => setFormData({ ...formData, level: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>Nível {n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do centro de custo"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="parent">Centro de Custo Pai</Label>
                <Select 
                  value={formData.parent_id || '__none__'} 
                  onValueChange={(v) => setFormData({ ...formData, parent_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhum (raiz)</SelectItem>
                    {costCenters.filter(cc => cc.id !== editingItem?.id).map(cc => (
                      <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
