import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Search,
  RefreshCw,
  MoreHorizontal,
  KeyRound,
  Shield,
  UserX,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useUsersList, useUpdateUserRole, useRemoveUser, useResetUserPassword, useInviteUser } from "@/hooks/useUsers";
import { useRoles } from "@/hooks/useRoles";
import { InviteUserDialog, UserDialog } from "@/components/permissions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

type StatusFilter = "all" | "active" | "pending" | "inactive";

export default function SettingsUsers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  
  // Dialog states
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editUser, setEditUser] = useState<any>(null);
  const [removeUserId, setRemoveUserId] = useState<string | null>(null);
  
  // Convert status filter to hook format
  const activeFilter = statusFilter === "all" ? undefined : statusFilter === "active";
  
  const { data: usersData, isLoading: usersLoading, refetch } = useUsersList(
    { 
      roleId: roleFilter === "all" ? undefined : roleFilter,
      isActive: activeFilter,
      search: searchQuery || undefined,
    },
    page,
    limit
  );
  
  const { data: roles, isLoading: rolesLoading } = useRoles(true);
  const updateRole = useUpdateUserRole();
  const removeUser = useRemoveUser();
  const resetPassword = useResetUserPassword();
  const inviteUser = useInviteUser();

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      await updateRole.mutateAsync({ userId, roleId });
      toast.success("Role atualizado com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar role");
    }
  };

  const handleRemoveUser = async () => {
    if (!removeUserId) return;
    try {
      await removeUser.mutateAsync(removeUserId);
      toast.success("Usuário removido com sucesso");
      setRemoveUserId(null);
    } catch (error) {
      toast.error("Erro ao remover usuário");
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      await resetPassword.mutateAsync(userId);
      toast.success("Email de reset de senha enviado");
    } catch (error) {
      toast.error("Erro ao enviar email de reset");
    }
  };

  const handleInvite = async (data: { email: string; full_name?: string; role_id?: string }) => {
    try {
      await inviteUser.mutateAsync({
        email: data.email,
        fullName: data.full_name,
        roleId: data.role_id,
      });
      toast.success(`Convite enviado para ${data.email}`);
      refetch();
    } catch (error) {
      toast.error("Erro ao enviar convite");
      throw error; // Re-throw to let the dialog handle it
    }
  };

  const handleSaveUser = async (data: any) => {
    // User save handled inside UserDialog via hook
    refetch();
  };

  const getStatusBadge = (user: any) => {
    if (!user.is_active) {
      return <Badge variant="destructive" className="gap-1">❌ Inativo</Badge>;
    }
    // Check if user has accepted invite (has logged in at least once)
    // For now, we'll check if they have a full_name set
    if (!user.full_name) {
      return <Badge variant="secondary" className="gap-1">⏳ Pendente</Badge>;
    }
    return <Badge className="gap-1 bg-primary hover:bg-primary/90">✅ Ativo</Badge>;
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const totalPages = usersData?.pages || 1;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Usuários e Permissões"
          description="Gerencie os usuários da sua empresa e suas permissões de acesso"
        >
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setInviteOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Convidar Usuário
          </Button>
        </PageHeader>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar por role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Roles</SelectItem>
                    {roles?.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={(v: StatusFilter) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">✅ Ativos</SelectItem>
                    <SelectItem value="pending">⏳ Pendentes</SelectItem>
                    <SelectItem value="inactive">❌ Inativos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Usuário</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersLoading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : usersData?.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  usersData?.users.map((user) => (
                    <TableRow key={user.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {getInitials(user.full_name, user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium">
                            {user.full_name || "Sem nome"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={user.role_id || ""}
                          onValueChange={(value) => handleRoleChange(user.id, value)}
                          disabled={updateRole.isPending}
                        >
                          <SelectTrigger className="w-[140px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {roles?.map((role) => (
                              <SelectItem key={role.id} value={role.id}>
                                <div className="flex items-center gap-2">
                                  <span className={role.is_system ? "text-blue-500" : "text-emerald-500"}>
                                    {role.is_system ? "🔵" : "🟢"}
                                  </span>
                                  {role.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditUser(user)}>
                              <Shield className="h-4 w-4 mr-2" />
                              Permissões Customizadas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleResetPassword(user.id)}>
                              <KeyRound className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => setRemoveUserId(user.id)}
                            >
                              <UserX className="h-4 w-4 mr-2" />
                              Remover Usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {!usersLoading && usersData && usersData.total > limit && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * limit) + 1} - {Math.min(page * limit, usersData.total)} de {usersData.total} usuários
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    Página {page} de {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <InviteUserDialog
        open={inviteOpen}
        roles={roles || []}
        onInvite={handleInvite}
        onCancel={() => setInviteOpen(false)}
      />

      {editUser && (
        <UserDialog
          open={!!editUser}
          user={editUser}
          onSave={handleSaveUser}
          onCancel={() => setEditUser(null)}
        />
      )}

      <AlertDialog open={!!removeUserId} onOpenChange={(open) => !open && setRemoveUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este usuário? Ele perderá acesso ao sistema imediatamente.
              Esta ação pode ser revertida reativando o usuário posteriormente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}