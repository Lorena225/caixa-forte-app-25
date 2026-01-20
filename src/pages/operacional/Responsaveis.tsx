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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { 
  useCostCenterResponsibles,
  useCreateCostCenterResponsible,
  useUpdateCostCenterResponsible,
  useDeleteCostCenterResponsible,
  CostCenterResponsible
} from '@/hooks/useOperacional';
import { useCostCenterList } from '@/hooks/useCostCenterHierarchy';
import { formatDate } from '@/lib/formatters';
import { Pencil, Trash2, Users, Calendar, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Responsaveis() {
  const { toast } = useToast();
  const [showInactive, setShowInactive] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCostCenter, setFilterCostCenter] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CostCenterResponsible | null>(null);
  
  const [formData, setFormData] = useState({
    cost_center_id: '',
    user_id: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '' as string | null,
    notes: '',
    is_active: true,
  });

  const { data: responsibles = [], isLoading } = useCostCenterResponsibles({ is_active: showInactive ? undefined : true });
  const { data: costCenters = [] } = useCostCenterList();
  const createMutation = useCreateCostCenterResponsible();
  const updateMutation = useUpdateCostCenterResponsible();
  const deleteMutation = useDeleteCostCenterResponsible();

  // Filter responsibles
  const filteredData = useMemo(() => {
    let result = responsibles;
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(r => 
        r.cost_center?.name?.toLowerCase().includes(term) ||
        r.cost_center?.code?.toLowerCase().includes(term)
      );
    }
    
    if (filterCostCenter) {
      result = result.filter(r => r.cost_center_id === filterCostCenter);
    }
    
    return result;
  }, [responsibles, searchTerm, filterCostCenter]);

  const resetForm = () => {
    setFormData({
      cost_center_id: '',
      user_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: null,
      notes: '',
      is_active: true,
    });
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const handleEdit = (item: CostCenterResponsible) => {
    setEditingItem(item);
    setFormData({
      cost_center_id: item.cost_center_id,
      user_id: item.user_id,
      start_date: item.start_date,
      end_date: item.end_date,
      notes: item.notes || '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.cost_center_id || !formData.user_id) {
      toast({ title: 'Erro', description: 'Centro de custo e responsável são obrigatórios', variant: 'destructive' });
      return;
    }

    const payload = {
      ...formData,
      end_date: formData.end_date || null,
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
    if (confirm('Tem certeza que deseja excluir este registro?')) {
      deleteMutation.mutate(id);
    }
  };

  // Check if period is active
  const isPeriodActive = (startDate: string, endDate: string | null): boolean => {
    const today = new Date().toISOString().split('T')[0];
    if (startDate > today) return false;
    if (endDate && endDate < today) return false;
    return true;
  };

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start gap-4">
          <BackButton />
          <div className="flex-1">
            <PageHeader
              title="Responsáveis pelo Centro de Custo"
              description="Defina responsáveis e períodos de vigência para cada centro de custo"
              action={{ label: 'Novo Responsável', onClick: handleNew }}
            />
          </div>
        </div>

        {/* Info card */}
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  Histórico preservado
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-300">
                  Novos períodos geram novos registros. O histórico de responsáveis anteriores é mantido para auditoria.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Input
                placeholder="Buscar por centro de custo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-xs"
              />
              <Select value={filterCostCenter || '__all__'} onValueChange={(v) => setFilterCostCenter(v === '__all__' ? '' : v)}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Centro de Custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos Centros de Custo</SelectItem>
                  {costCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
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
                <TableHead>Centro de Custo</TableHead>
                <TableHead>Responsável (ID)</TableHead>
                <TableHead>Início Vigência</TableHead>
                <TableHead>Fim Vigência</TableHead>
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
                    Nenhum responsável cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((resp) => {
                  const isActive = resp.is_active && isPeriodActive(resp.start_date, resp.end_date);
                  return (
                    <TableRow key={resp.id} className={cn(!isActive && 'opacity-50')}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{resp.cost_center?.name || '-'}</span>
                            <span className="text-sm text-muted-foreground ml-2">({resp.cost_center?.code})</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{resp.user_id.slice(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(resp.start_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {resp.end_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 text-muted-foreground" />
                            {formatDate(resp.end_date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Indefinido</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={isActive ? 'ativo' : 'inativo'} />
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleEdit(resp)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(resp.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Excluir</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Responsável' : 'Novo Responsável'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cost_center">Centro de Custo *</Label>
              <Select 
                value={formData.cost_center_id} 
                onValueChange={(v) => setFormData({ ...formData, cost_center_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o centro de custo..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map(cc => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user_id">ID do Responsável (UUID) *</Label>
              <Input
                id="user_id"
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                placeholder="UUID do usuário responsável"
              />
              <p className="text-xs text-muted-foreground">
                Informe o UUID do usuário que será responsável por este centro de custo.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Início Vigência *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fim Vigência</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date || ''}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value || null })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre a designação..."
                rows={3}
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
