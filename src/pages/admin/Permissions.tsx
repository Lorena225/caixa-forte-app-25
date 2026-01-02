import { useState } from "react";
import MainLayout from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useCustomRoles, useCreateCustomRole, useDeleteCustomRole } from "@/hooks/useAdminSettings";
import { Loader2, Shield, Plus, Trash2, Edit } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const baseRoleLabels: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  operador: "Operador",
  visualizador: "Visualizador",
};

const defaultPermissions = [
  { module: "Dashboard", permissions: ["Visualizar", "Exportar"] },
  { module: "Contas a Receber", permissions: ["Visualizar", "Criar", "Editar", "Excluir", "Baixar"] },
  { module: "Contas a Pagar", permissions: ["Visualizar", "Criar", "Editar", "Excluir", "Baixar"] },
  { module: "Fluxo de Caixa", permissions: ["Visualizar", "Exportar"] },
  { module: "DRE", permissions: ["Visualizar", "Exportar"] },
  { module: "Contabilidade", permissions: ["Visualizar", "Lançar", "Estornar"] },
  { module: "Fiscal", permissions: ["Visualizar", "Emitir NF", "Cancelar NF"] },
  { module: "Configurações", permissions: ["Visualizar", "Editar"] },
];

export default function Permissions() {
  const { data: roles, isLoading } = useCustomRoles();
  const createRole = useCreateCustomRole();
  const deleteRole = useDeleteCustomRole();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    description: "",
    base_role: "operador" as "admin" | "gestor" | "operador" | "visualizador",
  });

  const handleCreate = async () => {
    await createRole.mutateAsync(newRole);
    setDialogOpen(false);
    setNewRole({ name: "", description: "", base_role: "operador" });
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
          title="Papéis e Permissões"
          description="Configure papéis customizados e controle de acesso (RBAC)"
          action={
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Papel
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Papel</DialogTitle>
                  <DialogDescription>
                    Defina um novo papel com permissões baseadas em um papel existente
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do Papel</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Analista Financeiro"
                      value={newRole.name}
                      onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea
                      id="description"
                      placeholder="Descreva as responsabilidades deste papel"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="base_role">Papel Base</Label>
                    <Select 
                      value={newRole.base_role} 
                      onValueChange={(v: any) => setNewRole({ ...newRole, base_role: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador (acesso total)</SelectItem>
                        <SelectItem value="gestor">Gestor (leitura e escrita)</SelectItem>
                        <SelectItem value="operador">Operador (operações do dia a dia)</SelectItem>
                        <SelectItem value="visualizador">Visualizador (apenas leitura)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      O papel base define as permissões iniciais que podem ser refinadas
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={!newRole.name || createRole.isPending}
                  >
                    {createRole.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar Papel
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          }
        />

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Papéis Customizados
              </CardTitle>
              <CardDescription>
                Papéis criados para esta empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {roles && roles.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Papel Base</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.map((role: any) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">{role.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {role.description || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {baseRoleLabels[role.base_role] || role.base_role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={role.is_active ? "default" : "secondary"}>
                            {role.is_active ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" disabled>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" disabled={role.is_system}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir papel?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Usuários com este papel serão desvinculados.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteRole.mutate(role.id)}>
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
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum papel customizado criado</p>
                  <p className="text-sm">Use os papéis padrão ou crie papéis personalizados</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Matriz de Permissões</CardTitle>
              <CardDescription>
                Visão geral das permissões por módulo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Permissões Disponíveis</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {defaultPermissions.map((item) => (
                    <TableRow key={item.module}>
                      <TableCell className="font-medium">{item.module}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.permissions.map((perm) => (
                            <Badge key={perm} variant="outline" className="text-xs">
                              {perm}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
