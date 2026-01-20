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
  useOrganizationalUnits,
  useCreateOrganizationalUnit,
  useUpdateOrganizationalUnit,
  useDeleteOrganizationalUnit,
  OrganizationalUnit,
  buildOrganizationalTree
} from '@/hooks/useOperacional';
import { Pencil, Trash2, Network, Building2, Store, Building, Layers, ChevronRight, ChevronDown, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeOptions = [
  { value: 'empresa', label: 'Empresa', icon: Building2 },
  { value: 'unidade', label: 'Unidade', icon: Building },
  { value: 'filial', label: 'Filial', icon: Store },
  { value: 'setor', label: 'Setor', icon: Layers },
  { value: 'departamento', label: 'Departamento', icon: Network },
];

const getTypeIcon = (type: string) => {
  const opt = typeOptions.find(t => t.value === type);
  return opt?.icon || Network;
};

export default function EstruturaOrganizacional() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrganizationalUnit | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'setor' as OrganizationalUnit['type'],
    parent_unit_id: '' as string | null,
    description: '',
    is_active: true,
  });

  const { data: units = [], isLoading } = useOrganizationalUnits({ is_active: showInactive ? undefined : true });
  const createMutation = useCreateOrganizationalUnit();
  const updateMutation = useUpdateOrganizationalUnit();
  const deleteMutation = useDeleteOrganizationalUnit();

  // Build tree structure
  const tree = useMemo(() => buildOrganizationalTree(units), [units]);

  // Filter by search
  const filteredUnits = useMemo(() => {
    if (!searchTerm) return units;
    const term = searchTerm.toLowerCase();
    return units.filter(u => 
      u.name.toLowerCase().includes(term) || 
      u.code?.toLowerCase().includes(term)
    );
  }, [units, searchTerm]);

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      type: 'setor',
      parent_unit_id: null,
      description: '',
      is_active: true,
    });
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: OrganizationalUnit) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code || '',
      type: item.type,
      parent_unit_id: item.parent_unit_id,
      description: item.description || '',
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
      parent_unit_id: formData.parent_unit_id || null,
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
    if (confirm('Tem certeza que deseja excluir esta unidade?')) {
      deleteMutation.mutate(id);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Get parent path for display
  const getParentPath = (parentId: string | null): string => {
    if (!parentId) return '-';
    const parent = units.find(u => u.id === parentId);
    return parent?.name || '-';
  };

  // Recursive tree row renderer
  const renderTreeRow = (node: OrganizationalUnit, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);
    const TypeIcon = getTypeIcon(node.type);

    return (
      <>
        <TableRow key={node.id} className={cn(!node.is_active && 'opacity-50')}>
          <TableCell>
            <div className="flex items-center gap-2" style={{ paddingLeft: depth * 24 }}>
              {hasChildren ? (
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(node.id)}>
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              ) : (
                <div className="w-6" />
              )}
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{node.name}</span>
            </div>
          </TableCell>
          <TableCell>{node.code || '-'}</TableCell>
          <TableCell>
            <span className="capitalize">{node.type}</span>
          </TableCell>
          <TableCell>{getParentPath(node.parent_unit_id)}</TableCell>
          <TableCell>
            <StatusBadge status={node.is_active ? 'ativo' : 'inativo'} />
          </TableCell>
          <TableCell>
            <TooltipProvider>
              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(node)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Editar</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(node.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Excluir</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </TableCell>
        </TableRow>
        {hasChildren && isExpanded && node.children!.map(child => renderTreeRow(child, depth + 1))}
      </>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader
              title="Estrutura Organizacional"
              description="Gerencie a hierarquia de empresas, unidades, filiais e setores"
              action={{ label: 'Nova Unidade', onClick: handleNew }}
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
                <TableHead className="w-[300px]">Nome</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Unidade Pai</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : searchTerm ? (
                filteredUnits.map(unit => renderTreeRow(unit, 0))
              ) : (
                tree.map(node => renderTreeRow(node, 0))
              )}
              {!isLoading && units.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma unidade organizacional cadastrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Unidade' : 'Nova Unidade Organizacional'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nome da unidade"
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo *</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="parent">Unidade Pai</Label>
                <Select 
                  value={formData.parent_unit_id || '__none__'} 
                  onValueChange={(v) => setFormData({ ...formData, parent_unit_id: v === '__none__' ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Nenhuma (raiz)</SelectItem>
                    {units.filter(u => u.id !== editingItem?.id).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional"
              />
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
