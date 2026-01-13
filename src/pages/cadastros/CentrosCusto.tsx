import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FolderTree, List, Check, X, Download, Trash2 } from 'lucide-react';
import { CostCenterTree } from '@/components/cadastros/CostCenterTree';
import {
  useCostCenterTree,
  useCostCenterList,
  useCostCenterSettings,
  useCreateCostCenter,
  useUpdateCostCenter,
  useMoveCostCenter,
  useToggleCostCenterActive,
  useDeleteCostCenter,
  CostCenter,
  getLevelLabel,
} from '@/hooks/useCostCenterHierarchy';
import { DataTable } from '@/components/common/DataTable';
import { useBulkSelection } from '@/hooks/useBulkSelection';
import { useBulkActions } from '@/hooks/useBulkActions';
import { BulkActionsBar, BulkEditModal, BulkSelectionCheckbox, type BulkAction } from '@/components/bulk';
import type { BulkEditInputType } from '@/components/bulk/BulkEditModal';

export default function CentrosCusto() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: treeData = [], isLoading } = useCostCenterTree();
  const { data: listData = [] } = useCostCenterList();
  const { data: settings } = useCostCenterSettings();

  const createMutation = useCreateCostCenter();
  const updateMutation = useUpdateCostCenter();
  const moveMutation = useMoveCostCenter();
  const toggleActiveMutation = useToggleCostCenterActive();
  const deleteMutation = useDeleteCostCenter();

  const [viewMode, setViewMode] = useState<'tree' | 'list'>('tree');
  const [showInactive, setShowInactive] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCenter | null>(null);
  const [parentItem, setParentItem] = useState<CostCenter | null>(null);
  const [selectedForMove, setSelectedForMove] = useState<CostCenter | null>(null);
  const [newParentId, setNewParentId] = useState<string>('');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
  });

  // Filtered list for display
  const displayList = showInactive ? listData : listData.filter((cc) => cc.is_active);

  // Can select function for bulk selection
  const canSelectItem = useCallback((item: CostCenter) => {
    return item.is_leaf;
  }, []);

  // Bulk selection
  const {
    selectedIds,
    isAllSelected,
    isPartialSelected,
    selectAll,
    deselectAll,
    toggleItem,
    isSelected,
    count: selectedCount,
  } = useBulkSelection({
    data: displayList,
    canSelect: canSelectItem,
  });

  // Bulk actions
  const { bulkUpdate, bulkDelete, bulkExport, isProcessing, progress } = useBulkActions({
    tableName: 'cost_centers',
    queryKey: ['cost-center-list'],
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cost_centers'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-tree'] });
      queryClient.invalidateQueries({ queryKey: ['cost-center-list'] });
      deselectAll();
    },
  });

  // Bulk edit modal state
  const [bulkEditModal, setBulkEditModal] = useState<{
    open: boolean;
    title: string;
    field: string;
    inputType: BulkEditInputType;
    isDestructive?: boolean;
    confirmMessage?: string;
  }>({
    open: false,
    title: '',
    field: '',
    inputType: 'text',
  });

  const resetForm = () => {
    setFormData({ code: '', name: '' });
    setEditingItem(null);
    setParentItem(null);
  };

  const handleNew = (parent?: CostCenter) => {
    resetForm();
    setParentItem(parent || null);
    setDialogOpen(true);
  };

  const handleEdit = (item: CostCenter) => {
    setEditingItem(item);
    setParentItem(null);
    setFormData({ code: item.code, name: item.name });
    setDialogOpen(true);
  };

  const handleMove = (item: CostCenter) => {
    setSelectedForMove(item);
    setNewParentId(item.parent_id || '__root__');
    setMoveDialogOpen(true);
  };

  const handleToggleActive = (item: CostCenter) => {
    toggleActiveMutation.mutate(
      { id: item.id, isActive: !item.is_active },
      {
        onSuccess: () => {
          toast({ title: item.is_active ? 'Centro desativado' : 'Centro ativado' });
        },
        onError: (err: Error) => {
          toast({ title: 'Erro', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  const handleDelete = (item: CostCenter) => {
    if (!item.is_leaf) {
      toast({
        title: 'Não é possível excluir',
        description: 'Remova os filhos primeiro',
        variant: 'destructive',
      });
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        toast({ title: 'Centro excluído' });
      },
      onError: (err: Error) => {
        toast({ title: 'Erro', description: err.message, variant: 'destructive' });
      },
    });
  };

  const handleSave = () => {
    if (!formData.code.trim() || !formData.name.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    if (editingItem) {
      updateMutation.mutate(
        { id: editingItem.id, code: formData.code, name: formData.name },
        {
          onSuccess: () => {
            toast({ title: 'Centro atualizado' });
            setDialogOpen(false);
            resetForm();
          },
          onError: (err: Error) => {
            toast({ title: 'Erro', description: err.message, variant: 'destructive' });
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          code: formData.code,
          name: formData.name,
          parent_id: parentItem?.id || null,
        },
        {
          onSuccess: () => {
            toast({ title: 'Centro criado' });
            setDialogOpen(false);
            resetForm();
          },
          onError: (err: Error) => {
            toast({ title: 'Erro', description: err.message, variant: 'destructive' });
          },
        }
      );
    }
  };

  const handleMoveConfirm = () => {
    if (!selectedForMove) return;

    moveMutation.mutate(
      { id: selectedForMove.id, newParentId: newParentId === '__root__' ? null : newParentId },
      {
        onSuccess: () => {
          toast({ title: 'Centro movido com sucesso' });
          setMoveDialogOpen(false);
          setSelectedForMove(null);
        },
        onError: (err: Error) => {
          toast({ title: 'Erro ao mover', description: err.message, variant: 'destructive' });
        },
      }
    );
  };

  // Possíveis destinos para mover (excluindo o próprio nó e seus descendentes)
  const moveTargets = listData.filter((cc) => {
    if (!selectedForMove) return true;
    if (cc.id === selectedForMove.id) return false;
    if (cc.path.startsWith(selectedForMove.path)) return false;
    if (cc.level >= 4) return false;
    return true;
  });

  // Bulk actions definitions
  const bulkActions: BulkAction[] = [
    {
      id: 'activate',
      label: 'Ativar',
      icon: <Check className="h-4 w-4" />,
      onClick: () => {
        const ids = Array.from(selectedIds);
        bulkUpdate(ids, { is_active: true });
      },
    },
    {
      id: 'deactivate',
      label: 'Inativar',
      icon: <X className="h-4 w-4" />,
      onClick: () => {
        const ids = Array.from(selectedIds);
        bulkUpdate(ids, { is_active: false });
      },
    },
    {
      id: 'export',
      label: 'Exportar',
      icon: <Download className="h-4 w-4" />,
      onClick: () => {
        const selectedItems = displayList.filter(item => selectedIds.has(item.id));
        bulkExport(selectedItems, [
          { key: 'code', header: 'Código' },
          { key: 'name', header: 'Nome' },
          { key: 'path_codes', header: 'Caminho' },
          { key: 'level', header: 'Nível' },
          { key: 'is_leaf', header: 'Tipo', formatter: (v: boolean) => v ? 'Folha' : 'Grupo' },
          { key: 'is_active', header: 'Ativo', formatter: (v: boolean) => v ? 'Sim' : 'Não' },
        ], 'CentrosCusto_Selecionados');
      },
    },
    {
      id: 'delete',
      label: 'Excluir',
      icon: <Trash2 className="h-4 w-4" />,
      variant: 'destructive',
      onClick: () => {
        // Check if any selected has children
        const selectedItems = displayList.filter(item => selectedIds.has(item.id));
        const hasNonLeaf = selectedItems.some(item => !item.is_leaf);
        
        if (hasNonLeaf) {
          toast({
            title: 'Alguns itens não podem ser excluídos',
            description: 'Apenas centros de custo folha podem ser excluídos',
            variant: 'destructive',
          });
          return;
        }

        setBulkEditModal({
          open: true,
          title: `Excluir ${selectedCount} centro(s) de custo`,
          field: '',
          inputType: 'confirm',
          isDestructive: true,
          confirmMessage: `Tem certeza que deseja excluir ${selectedCount} centro(s) de custo? Esta ação não pode ser desfeita.`,
        });
      },
    },
  ];

  const handleBulkEditConfirm = useCallback(async () => {
    if (bulkEditModal.isDestructive) {
      const ids = Array.from(selectedIds);
      await bulkDelete(ids);
    }
    setBulkEditModal(prev => ({ ...prev, open: false }));
  }, [bulkEditModal.isDestructive, selectedIds, bulkDelete]);

  const getSelectedItemsSummary = useCallback(() => {
    return displayList
      .filter(item => selectedIds.has(item.id))
      .map(item => ({
        id: item.id,
        label: item.name,
        sublabel: item.path_codes,
      }));
  }, [displayList, selectedIds]);

  const columns = [
    {
      key: 'select',
      header: '',
      render: (item: CostCenter) => (
        <BulkSelectionCheckbox
          checked={isSelected(item.id)}
          onChange={() => toggleItem(item.id)}
          disabled={!canSelectItem(item)}
          tooltip={!canSelectItem(item) ? 'Apenas folhas podem ser selecionadas' : undefined}
          aria-label={`Selecionar ${item.name}`}
        />
      ),
      className: 'w-10',
    },
    {
      key: 'path_codes',
      header: 'Caminho',
      render: (item: CostCenter) => (
        <span className="font-mono text-sm text-muted-foreground">{item.path_codes}</span>
      ),
    },
    { key: 'code', header: 'Código', className: 'w-28 font-mono' },
    { key: 'name', header: 'Nome' },
    {
      key: 'level',
      header: 'Nível',
      render: (item: CostCenter) => (
        <Badge variant="outline">{getLevelLabel(item.level, settings)}</Badge>
      ),
      className: 'w-32',
    },
    {
      key: 'is_leaf',
      header: 'Tipo',
      render: (item: CostCenter) => (
        <Badge variant={item.is_leaf ? 'secondary' : 'default'}>
          {item.is_leaf ? 'Folha' : 'Grupo'}
        </Badge>
      ),
      className: 'w-20',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: CostCenter) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      className: 'w-20',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Centros de Custo"
          description="Hierarquia de centros de custo com até 5 níveis configuráveis"
          action={{ label: 'Novo Centro', onClick: () => handleNew() }}
        />

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedCount}
          onClearSelection={deselectAll}
          actions={bulkActions}
          isProcessing={isProcessing}
          progress={progress}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'tree' | 'list')}>
              <TabsList>
                <TabsTrigger value="tree" className="gap-2">
                  <FolderTree className="h-4 w-4" />
                  Árvore
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-2">
                  <List className="h-4 w-4" />
                  Lista
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {viewMode === 'list' && (
              <div className="flex items-center gap-2">
                <BulkSelectionCheckbox
                  checked={isAllSelected}
                  indeterminate={isPartialSelected}
                  onChange={isAllSelected ? deselectAll : selectAll}
                  isHeader
                  aria-label="Selecionar todos"
                />
                <span className="text-sm text-muted-foreground">Todos</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Switch
                id="show-inactive"
                checked={showInactive}
                onCheckedChange={setShowInactive}
              />
              <Label htmlFor="show-inactive" className="text-sm">
                Mostrar inativos
              </Label>
            </div>
          </div>

          {settings && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Níveis: {settings.levels_enabled}</span>
              <span>•</span>
              <span>
                Política:{' '}
                {settings.posting_policy === 'leaf_only' ? 'Apenas folhas' : 'Qualquer nível'}
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : viewMode === 'tree' ? (
          <CostCenterTree
            data={treeData}
            settings={settings}
            showInactive={showInactive}
            onAddChild={handleNew}
            onEdit={handleEdit}
            onMove={handleMove}
            onToggleActive={handleToggleActive}
            onDelete={handleDelete}
          />
        ) : (
          <DataTable
            columns={columns}
            data={displayList}
            loading={isLoading}
            onRowClick={handleEdit}
            emptyMessage="Nenhum centro de custo cadastrado"
          />
        )}

        {/* Dialog para criar/editar */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
              </DialogTitle>
              {parentItem && (
                <DialogDescription>
                  Filho de: <strong>{parentItem.name}</strong> ({parentItem.code})
                  <br />
                  Nível: {getLevelLabel(parentItem.level + 1, settings)}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: ADM, VND-01, OB-045"
                />
              </div>
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Administrativo, Vendas Regional Sul"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Dialog para mover */}
        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Mover Centro de Custo</DialogTitle>
              {selectedForMove && (
                <DialogDescription>
                  Movendo: <strong>{selectedForMove.name}</strong> ({selectedForMove.code})
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Novo Pai</Label>
                <Select value={newParentId} onValueChange={setNewParentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Raiz (sem pai)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__root__">Raiz (sem pai)</SelectItem>
                    {moveTargets.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.path_codes} - {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleMoveConfirm} disabled={moveMutation.isPending}>
                  {moveMutation.isPending ? 'Movendo...' : 'Mover'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Edit Modal */}
        <BulkEditModal
          open={bulkEditModal.open}
          onOpenChange={(open) => setBulkEditModal(prev => ({ ...prev, open }))}
          title={bulkEditModal.title}
          items={getSelectedItemsSummary()}
          inputType={bulkEditModal.inputType}
          onConfirm={handleBulkEditConfirm}
          isLoading={isProcessing}
          isDestructive={bulkEditModal.isDestructive}
          confirmMessage={bulkEditModal.confirmMessage}
        />
      </div>
    </MainLayout>
  );
}
