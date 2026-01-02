import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { DataTable } from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Lock, FileText } from 'lucide-react';

const docGroupLabels: Record<string, string> = {
  fiscal: 'Fiscal',
  financeiro: 'Financeiro',
  comprovante: 'Comprovante',
  contrato: 'Contrato',
  titulo: 'Título',
  movimento: 'Movimento',
  ajuste: 'Ajuste',
  outros: 'Outros',
};

const docGroupColors: Record<string, string> = {
  fiscal: 'bg-info/10 text-info',
  financeiro: 'bg-success/10 text-success',
  comprovante: 'bg-warning/10 text-warning',
  contrato: 'bg-primary/10 text-primary',
  titulo: 'bg-secondary/50 text-secondary-foreground',
  movimento: 'bg-muted text-muted-foreground',
  ajuste: 'bg-destructive/10 text-destructive',
  outros: 'bg-muted text-muted-foreground',
};

export default function DocumentTypes() {
  const { currentCompany } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState({
    doc_code: '',
    doc_name: '',
    doc_group: 'outros' as string,
    requires_number: false,
    number_label: 'Número do documento',
    requires_counterparty: false,
    is_active: true,
  });

  const { data: documentTypes = [], isLoading } = useQuery({
    queryKey: ['document_types_all', currentCompany?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('document_types')
        .select('*')
        .or(`company_id.is.null,company_id.eq.${currentCompany?.id}`)
        .order('doc_group')
        .order('doc_name');
      if (error) throw error;
      return data;
    },
    enabled: !!currentCompany?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingItem) {
        // Apenas atualizar campos editáveis (não system items não podem mudar doc_code)
        const updatePayload: any = {
          doc_name: data.doc_name,
          doc_group: data.doc_group,
          requires_number: data.requires_number,
          number_label: data.number_label,
          requires_counterparty: data.requires_counterparty,
          is_active: data.is_active,
        };
        
        // Se não for item de sistema, permite editar código
        if (!editingItem.is_system) {
          updatePayload.doc_code = data.doc_code;
        }
        
        const { error } = await supabase
          .from('document_types')
          .update(updatePayload)
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const insertData = {
          doc_code: data.doc_code,
          doc_name: data.doc_name,
          doc_group: data.doc_group as any,
          requires_number: data.requires_number,
          number_label: data.number_label,
          requires_counterparty: data.requires_counterparty,
          is_active: data.is_active,
          company_id: currentCompany?.id,
          is_system: false,
        };
        const { error } = await supabase.from('document_types').insert(insertData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document_types'] });
      queryClient.invalidateQueries({ queryKey: ['document_types_all'] });
      setDialogOpen(false);
      setEditingItem(null);
      resetForm();
      toast({ title: editingItem ? 'Tipo atualizado!' : 'Tipo criado!' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      doc_code: '',
      doc_name: '',
      doc_group: 'outros',
      requires_number: false,
      number_label: 'Número do documento',
      requires_counterparty: false,
      is_active: true,
    });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      doc_code: item.doc_code,
      doc_name: item.doc_name,
      doc_group: item.doc_group,
      requires_number: item.requires_number,
      number_label: item.number_label || 'Número do documento',
      requires_counterparty: item.requires_counterparty,
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingItem(null);
    resetForm();
    setDialogOpen(true);
  };

  const columns = [
    {
      key: 'doc_code',
      header: 'Código',
      render: (item: any) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm">{item.doc_code}</span>
          {item.is_system && (
            <Tooltip>
              <TooltipTrigger>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>Tipo de sistema</TooltipContent>
            </Tooltip>
          )}
        </div>
      ),
      className: 'w-40',
    },
    { key: 'doc_name', header: 'Nome' },
    {
      key: 'doc_group',
      header: 'Grupo',
      render: (item: any) => (
        <Badge variant="outline" className={docGroupColors[item.doc_group]}>
          {docGroupLabels[item.doc_group]}
        </Badge>
      ),
      className: 'w-32',
    },
    {
      key: 'requires_number',
      header: 'Exige Nº',
      render: (item: any) => (item.requires_number ? 'Sim' : 'Não'),
      className: 'w-24',
    },
    {
      key: 'is_active',
      header: 'Status',
      render: (item: any) => (
        <Badge variant={item.is_active ? 'default' : 'secondary'}>
          {item.is_active ? 'Ativo' : 'Inativo'}
        </Badge>
      ),
      className: 'w-24',
    },
    {
      key: 'actions',
      header: '',
      render: (item: any) => (
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
          <Pencil className="h-4 w-4" />
        </Button>
      ),
      className: 'w-16',
    },
  ];

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Tipos de Documento"
          description="Configure os tipos de documento usados em lançamentos e títulos"
          action={{ label: 'Novo Tipo', onClick: handleNew }}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Tipos de Documento Cadastrados</CardTitle>
                <CardDescription>
                  Tipos de sistema (com cadeado) não podem ser excluídos, apenas editados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={columns}
              data={documentTypes}
              loading={isLoading}
              onRowClick={handleEdit}
              emptyMessage="Nenhum tipo de documento cadastrado"
            />
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? 'Editar Tipo de Documento' : 'Novo Tipo de Documento'}
              </DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate(formData);
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código *</Label>
                  <Input
                    value={formData.doc_code}
                    onChange={(e) => setFormData({ ...formData, doc_code: e.target.value.toUpperCase() })}
                    placeholder="NFE, BOLETO"
                    required
                    disabled={editingItem?.is_system}
                    maxLength={50}
                  />
                  {editingItem?.is_system && (
                    <p className="text-xs text-muted-foreground">Código de sistema não pode ser alterado</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Grupo *</Label>
                  <Select
                    value={formData.doc_group}
                    onValueChange={(v) => setFormData({ ...formData, doc_group: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(docGroupLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.doc_name}
                  onChange={(e) => setFormData({ ...formData, doc_name: e.target.value })}
                  placeholder="Nota Fiscal Eletrônica"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Label do número (quando exigido)</Label>
                <Input
                  value={formData.number_label}
                  onChange={(e) => setFormData({ ...formData, number_label: e.target.value })}
                  placeholder="Número do documento"
                />
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.requires_number}
                    onCheckedChange={(v) => setFormData({ ...formData, requires_number: v })}
                  />
                  <Label>Exige número do documento</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.requires_counterparty}
                    onCheckedChange={(v) => setFormData({ ...formData, requires_counterparty: v })}
                  />
                  <Label>Exige parceiro (cliente/fornecedor)</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
                  />
                  <Label>Ativo</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
