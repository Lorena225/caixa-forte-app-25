import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useApprovalWorkflows, useCreateApprovalWorkflow, useUpdateApprovalWorkflow, useDeleteApprovalWorkflow } from "@/hooks/useAdminSettings";
import { Loader2, GitBranch, Plus, Trash2, Edit, CheckCircle2, XCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const entityTypeLabels: Record<string, string> = {
  payment: "Pagamentos",
  invoice: "Notas Fiscais",
  purchase_order: "Pedidos de Compra",
  expense: "Despesas",
  transfer: "Transferências",
  journal_entry: "Lançamentos Contábeis",
};

interface WorkflowFormData {
  name: string;
  entity_type: string;
  min_amount: string;
  max_amount: string;
  is_active: boolean;
}

const emptyWorkflow: WorkflowFormData = {
  name: "",
  entity_type: "payment",
  min_amount: "",
  max_amount: "",
  is_active: true,
};

export default function Approvals() {
  const { data: workflows, isLoading } = useApprovalWorkflows();
  const createWorkflow = useCreateApprovalWorkflow();
  const updateWorkflow = useUpdateApprovalWorkflow();
  const deleteWorkflow = useDeleteApprovalWorkflow();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<any>(null);
  const [formData, setFormData] = useState<WorkflowFormData>(emptyWorkflow);

  const handleOpenCreate = () => {
    setEditingWorkflow(null);
    setFormData(emptyWorkflow);
    setDialogOpen(true);
  };

  const handleOpenEdit = (workflow: any) => {
    setEditingWorkflow(workflow);
    setFormData({
      name: workflow.name || "",
      entity_type: workflow.entity_type || "payment",
      min_amount: workflow.min_amount?.toString() || "",
      max_amount: workflow.max_amount?.toString() || "",
      is_active: workflow.is_active ?? true,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      name: formData.name,
      entity_type: formData.entity_type,
      min_amount: formData.min_amount ? parseFloat(formData.min_amount) : undefined,
      max_amount: formData.max_amount ? parseFloat(formData.max_amount) : undefined,
      is_active: formData.is_active,
    };

    if (editingWorkflow) {
      await updateWorkflow.mutateAsync({ id: editingWorkflow.id, ...data });
    } else {
      await createWorkflow.mutateAsync(data);
    }
    setDialogOpen(false);
    setFormData(emptyWorkflow);
    setEditingWorkflow(null);
  };

  const formatCurrency = (value: number | null) => {
    if (value === null || value === undefined) return "-";
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Fluxos de Aprovação"
          description="Configure workflows de aprovação para diferentes tipos de documentos"
          action={
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Fluxo
            </Button>
          }
        />

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWorkflow ? "Editar Fluxo" : "Novo Fluxo de Aprovação"}
              </DialogTitle>
              <DialogDescription>
                {editingWorkflow 
                  ? "Atualize as configurações do fluxo" 
                  : "Configure um novo fluxo de aprovação"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Fluxo *</Label>
                <Input
                  id="name"
                  placeholder="Ex: Aprovação de Pagamentos Acima de R$ 10.000"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="entity_type">Tipo de Documento</Label>
                <Select 
                  value={formData.entity_type} 
                  onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Pagamentos</SelectItem>
                    <SelectItem value="invoice">Notas Fiscais</SelectItem>
                    <SelectItem value="purchase_order">Pedidos de Compra</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                    <SelectItem value="transfer">Transferências</SelectItem>
                    <SelectItem value="journal_entry">Lançamentos Contábeis</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_amount">Valor Mínimo (R$)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    placeholder="0,00"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_amount">Valor Máximo (R$)</Label>
                  <Input
                    id="max_amount"
                    type="number"
                    placeholder="Sem limite"
                    value={formData.max_amount}
                    onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Fluxo ativo</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!formData.name || createWorkflow.isPending || updateWorkflow.isPending}
              >
                {(createWorkflow.isPending || updateWorkflow.isPending) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingWorkflow ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Fluxos Configurados
            </CardTitle>
            <CardDescription>
              {workflows?.length || 0} fluxo(s) de aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workflows && workflows.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Faixa de Valor</TableHead>
                    <TableHead>Etapas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {workflows.map((workflow: any) => (
                    <TableRow key={workflow.id}>
                      <TableCell className="font-medium">{workflow.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityTypeLabels[workflow.entity_type] || workflow.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(workflow.min_amount)} - {formatCurrency(workflow.max_amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {workflow.approval_steps?.length || 0} etapa(s)
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {workflow.is_active ? (
                          <Badge className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleOpenEdit(workflow)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir fluxo?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. Solicitações pendentes deste fluxo serão canceladas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteWorkflow.mutate(workflow.id)}>
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum fluxo de aprovação configurado</p>
                <p className="text-sm">Crie fluxos para controlar aprovações de documentos</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
