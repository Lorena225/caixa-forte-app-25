import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  useRoles,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  usePermissions,
  useRolePermissions,
  useUpdateRolePermissions,
  useUserProfiles,
  useUpdateUserProfile,
  useDeleteUserProfile,
  useUserAuditLog,
  Permission,
  Role,
  UserProfile,
} from "@/hooks/useUserManagement";
import { useCompanyUsers, useUpdateUserRole, useRemoveCompanyUser } from "@/hooks/useAdminSettings";
import { useAuth } from "@/contexts/AuthContext";
import {
  Loader2,
  Users,
  Shield,
  UserPlus,
  Trash2,
  Edit,
  Plus,
  Eye,
  Key,
  Clock,
  Search,
  Filter,
  ChevronRight,
  CheckCircle2,
  XCircle,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// =====================================================
// USERS TAB COMPONENT
// =====================================================
function UsersTab() {
  const { data: users, isLoading } = useCompanyUsers();
  const { data: roles } = useRoles();
  const { data: userProfiles } = useUserProfiles();
  const updateUserRole = useUpdateUserRole();
  const updateProfile = useUpdateUserProfile();
  const removeUser = useRemoveCompanyUser();
  const { user: currentUser, currentCompany } = useAuth();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFullName, setInviteFullName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("gestor");
  const [inviting, setInviting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [editUser, setEditUser] = useState<any>(null);

  const handleInvite = async () => {
    if (!inviteEmail || !currentCompany?.id) return;
    setInviting(true);
    try {
      // For now, create invite functionality
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", inviteEmail)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase.from("company_users").insert([
          {
            company_id: currentCompany.id,
            user_id: existingProfile.id,
            role: inviteRole as "admin" | "gestor" | "visualizador",
          },
        ]);
        if (error) throw error;
        toast.success("Usuário adicionado à empresa");
      } else {
        toast.info("Um convite será enviado para o email informado");
      }
      setInviteOpen(false);
      setInviteEmail("");
      setInviteFullName("");
      setInvitePhone("");
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setInviting(false);
    }
  };

  const filteredUsers = users?.filter((u: any) => {
    const matchSearch =
      !searchTerm ||
      u.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.user_id.includes(searchTerm);
    return matchSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Criar Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>
                Preencha os dados para criar um novo usuário
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Nome Completo</Label>
                <Input
                  id="fullName"
                  placeholder="Nome completo"
                  value={inviteFullName}
                  onChange={(e) => setInviteFullName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone (opcional)</Label>
                <Input
                  id="phone"
                  placeholder="(11) 99999-9999"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Papel Principal</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.code}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail}>
                {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Usuário
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários ({filteredUsers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Último Acesso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers?.map((companyUser: any) => (
                <TableRow key={companyUser.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {companyUser.profiles?.full_name || "Sem nome"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ID: {companyUser.user_id.slice(0, 8)}...
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={companyUser.role}
                      onValueChange={(value) =>
                        updateUserRole.mutate({ id: companyUser.id, role: value as "admin" | "gestor" | "visualizador" })
                      }
                      disabled={companyUser.user_id === currentUser?.id}
                    >
                      <SelectTrigger className="w-40">
                        <Badge variant="outline">
                          <Shield className="h-3 w-3 mr-1" />
                          {companyUser.role}
                        </Badge>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="gestor">Gestor</SelectItem>
                        <SelectItem value="visualizador">Visualizador</SelectItem>
                        {roles?.map((role) => (
                          <SelectItem key={role.id} value={role.code}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                <TableCell>
                    <Badge variant="default" className="bg-primary">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Ativo
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">-</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditUser(companyUser)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={companyUser.user_id === currentUser?.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover usuário?</AlertDialogTitle>
                            <AlertDialogDescription>
                              O usuário perderá acesso à empresa.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => removeUser.mutate(companyUser.id)}
                            >
                              Remover
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
        </CardContent>
      </Card>

      {/* Edit User Sheet */}
      <Sheet open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Editar Usuário</SheetTitle>
            <SheetDescription>
              Altere as configurações e permissões do usuário
            </SheetDescription>
          </SheetHeader>
          {editUser && (
            <div className="space-y-6 py-6">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editUser.profiles?.full_name || ""}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label>Papel Principal</Label>
                <Select
                  value={editUser.role}
                  onValueChange={(value) => {
                    updateUserRole.mutate({ id: editUser.id, role: value as "admin" | "gestor" | "visualizador" });
                    setEditUser({ ...editUser, role: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="visualizador">Visualizador</SelectItem>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.code}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Permissões Personalizadas
                </Label>
                <p className="text-sm text-muted-foreground">
                  Adicione ou remova permissões específicas para este usuário
                </p>
                <Button variant="outline" className="w-full" disabled>
                  <Plus className="h-4 w-4 mr-2" />
                  Gerenciar Permissões Extras
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// =====================================================
// ROLES TAB COMPONENT
// =====================================================
function RolesTab() {
  const { data: roles, isLoading } = useRoles();
  const { data: permissions } = usePermissions();
  const createRole = useCreateRole();
  const updateRole = useUpdateRole();
  const deleteRole = useDeleteRole();
  const updateRolePermissions = useUpdateRolePermissions();

  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState({ name: "", description: "" });
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  const { data: rolePerms } = useRolePermissions(editRole?.id || null);

  // Group permissions by module
  const permissionsByModule = (permissions || []).reduce((acc, perm) => {
    const module = perm.module || "Outros";
    if (!acc[module]) acc[module] = [];
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const handleCreate = async () => {
    await createRole.mutateAsync(newRole);
    setCreateOpen(false);
    setNewRole({ name: "", description: "" });
  };

  const handleEditRole = (role: Role) => {
    setEditRole(role);
    // Load current permissions
    const currentPerms = rolePerms?.map((rp: any) => rp.permission_id) || [];
    setSelectedPermissions(currentPerms);
  };

  const handleSaveRolePermissions = async () => {
    if (!editRole) return;
    await updateRolePermissions.mutateAsync({
      roleId: editRole.id,
      permissionIds: selectedPermissions,
    });
    setEditRole(null);
  };

  const togglePermission = (permId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permId) ? prev.filter((p) => p !== permId) : [...prev, permId]
    );
  };

  const toggleModulePermissions = (module: string, checked: boolean) => {
    const modulePerms = permissionsByModule[module]?.map((p) => p.id) || [];
    if (checked) {
      setSelectedPermissions((prev) => [...new Set([...prev, ...modulePerms])]);
    } else {
      setSelectedPermissions((prev) => prev.filter((p) => !modulePerms.includes(p)));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
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
                Defina um novo papel com permissões personalizadas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Papel</Label>
                <Input
                  placeholder="Ex: Analista Financeiro"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  placeholder="Descreva as responsabilidades deste papel"
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Roles List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Papéis Disponíveis
            </CardTitle>
            <CardDescription>
              {roles?.length || 0} papel(éis) configurado(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* System Roles */}
              {["admin", "gestor", "visualizador"].map((sysRole) => (
                <div
                  key={sysRole}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium capitalize">{sysRole}</p>
                      <p className="text-xs text-muted-foreground">Papel do sistema</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Sistema</Badge>
                </div>
              ))}

              <Separator className="my-4" />

              {/* Custom Roles */}
              {roles?.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer"
                  onClick={() => handleEditRole(role)}
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5" />
                    <div>
                      <p className="font-medium">{role.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {role.description || "Sem descrição"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={role.is_active ? "default" : "secondary"}>
                      {role.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}

              {(!roles || roles.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum papel personalizado</p>
                  <p className="text-sm">Crie papéis para definir permissões específicas</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Matriz de Permissões</CardTitle>
            <CardDescription>
              {editRole ? `Editando: ${editRole.name}` : "Selecione um papel para editar"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {editRole ? (
              <div className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  {Object.entries(permissionsByModule).map(([module, perms]) => {
                    const modulePermIds = perms.map((p) => p.id);
                    const allChecked = modulePermIds.every((id) =>
                      selectedPermissions.includes(id)
                    );
                    const someChecked = modulePermIds.some((id) =>
                      selectedPermissions.includes(id)
                    );

                    return (
                      <div key={module} className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Checkbox
                            checked={allChecked}
                            // @ts-ignore
                            indeterminate={someChecked && !allChecked}
                            onCheckedChange={(checked) =>
                              toggleModulePermissions(module, !!checked)
                            }
                          />
                          <Label className="font-semibold capitalize">{module}</Label>
                        </div>
                        <div className="ml-6 grid gap-1">
                          {perms.map((perm) => (
                            <div key={perm.id} className="flex items-center gap-2">
                              <Checkbox
                                checked={selectedPermissions.includes(perm.id)}
                                onCheckedChange={() => togglePermission(perm.id)}
                              />
                              <Label className="text-sm font-normal cursor-pointer">
                                {perm.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setEditRole(null)}>
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveRolePermissions}
                    disabled={updateRolePermissions.isPending}
                  >
                    {updateRolePermissions.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar Permissões
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Selecione um papel ao lado</p>
                <p className="text-sm">para editar suas permissões</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =====================================================
// AUDIT TAB COMPONENT
// =====================================================
function AuditTab() {
  const { data: logs, isLoading } = useUserAuditLog({ limit: 50 });

  const actionLabels: Record<string, string> = {
    role_create: "Papel Criado",
    role_update: "Papel Atualizado",
    role_delete: "Papel Excluído",
    role_permissions_update: "Permissões do Papel Atualizadas",
    user_profile_create: "Perfil Criado",
    user_profile_update: "Perfil Atualizado",
    user_profile_delete: "Perfil Removido",
    user_custom_permissions_update: "Permissões Personalizadas Atualizadas",
    login: "Login",
    logout: "Logout",
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Trilha de Auditoria
        </CardTitle>
        <CardDescription>
          Histórico de ações relacionadas a usuários e permissões
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Recurso</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {actionLabels[log.action] || log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {log.resource || "-"}
                </TableCell>
                <TableCell>
                  {log.success ? (
                    <Badge variant="default">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sucesso
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="h-3 w-3 mr-1" />
                      Falha
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {(!logs || logs.length === 0) && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum registro de auditoria encontrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function UserManagement() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Gestão de Usuários"
          description="Gerencie usuários, papéis e permissões granulares"
        />

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="roles" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Papéis
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Auditoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="roles">
            <RolesTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditTab />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
