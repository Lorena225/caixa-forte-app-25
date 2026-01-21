import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Edit,
  Copy,
  Trash2,
  Download,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Users,
  Shield,
} from "lucide-react";
import { useRole, useDeleteRole, useDuplicateRole } from "@/hooks/useRoles";
import { useRolePermissions, usePermissions } from "@/hooks/usePermissions";
import { useUsersList } from "@/hooks/useUsers";
import { RoleDialog } from "@/components/permissions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, string> = {
  ver: "Ver",
  criar: "Criar",
  editar: "Editar",
  deletar: "Deletar",
  aprovar: "Aprovar",
  configurar: "Config.",
};

export default function SettingsRoleDetail() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");
  
  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateName, setDuplicateName] = useState("");

  const { data: role, isLoading: roleLoading } = useRole(roleId || null);
  const { data: rolePermissions, isLoading: permissionsLoading } = useRolePermissions(roleId || null);
  const { data: allPermissions } = usePermissions();
  const { data: usersData } = useUsersList({ roleId: roleId || undefined }, 1, 10);
  
  const deleteRoleMutation = useDeleteRole();
  const duplicateRoleMutation = useDuplicateRole();

  // Get unique modules from all permissions
  const modules = useMemo(() => {
    const mods = new Set<string>();
    allPermissions?.forEach((p) => mods.add(p.module));
    return Array.from(mods).sort();
  }, [allPermissions]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    if (!rolePermissions) return [];
    
    return rolePermissions.filter((perm) => {
      if (moduleFilter !== "all" && perm.module !== moduleFilter) return false;
      if (actionFilter !== "all" && perm.action !== actionFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          perm.resource.toLowerCase().includes(query) ||
          perm.module.toLowerCase().includes(query) ||
          perm.description?.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [rolePermissions, moduleFilter, actionFilter, searchQuery]);

  // Group permissions by module and resource
  const groupedPermissions = useMemo(() => {
    const groups: Record<string, Record<string, typeof filteredPermissions>> = {};
    
    filteredPermissions.forEach((perm) => {
      if (!groups[perm.module]) groups[perm.module] = {};
      if (!groups[perm.module][perm.resource]) groups[perm.module][perm.resource] = [];
      groups[perm.module][perm.resource].push(perm);
    });
    
    return groups;
  }, [filteredPermissions]);

  const handleDelete = async () => {
    if (!roleId) return;
    try {
      await deleteRoleMutation.mutateAsync({ roleId });
      toast.success("Papel removido com sucesso");
      navigate("/configuracoes/papeis");
    } catch (error) {
      toast.error("Erro ao remover papel");
    }
  };

  const handleDuplicate = async () => {
    if (!roleId || !duplicateName.trim()) return;
    try {
      const newRole = await duplicateRoleMutation.mutateAsync({
        sourceRoleId: roleId,
        newName: duplicateName.trim(),
      });
      toast.success("Papel duplicado com sucesso");
      setDuplicateOpen(false);
      if (newRole) {
        navigate(`/configuracoes/papeis/${newRole.id}`);
      }
    } catch (error) {
      toast.error("Erro ao duplicar papel");
    }
  };

  const handleExport = () => {
    if (!role || !rolePermissions) return;
    const data = JSON.stringify({ role, permissions: rolePermissions }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `papel-${role.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Papel exportado com sucesso");
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  if (roleLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <Card>
            <CardContent className="py-6">
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  if (!role) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Papel não encontrado</p>
          <Button onClick={() => navigate("/configuracoes/papeis")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Papéis
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/configuracoes/papeis")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {role.is_system ? "🔵" : "🟢"}
                </span>
                <h1 className="text-2xl font-bold">{role.name}</h1>
                {role.is_system && (
                  <Badge variant="secondary">Sistema</Badge>
                )}
              </div>
              {role.description && (
                <p className="text-muted-foreground mt-1">{role.description}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>
                  Criado em: {format(new Date(role.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
                <span>
                  Atualizado em: {format(new Date(role.updated_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            {!role.is_system && (
              <>
                <Button variant="outline" onClick={() => setEditOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDuplicateName(`${role.name} (Cópia)`);
                    setDuplicateOpen(true);
                  }}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicar
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Deletar
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{rolePermissions?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Permissões</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{usersData?.total || 0}</p>
                  <p className="text-sm text-muted-foreground">Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {role.is_active ? "Ativo" : "Inativo"}
                  </p>
                  <p className="text-sm text-muted-foreground">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Permissions */}
        <Card>
          <CardHeader>
            <CardTitle>Permissões Concedidas</CardTitle>
            <CardDescription>
              Permissões que os usuários deste papel possuem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar permissão..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={moduleFilter} onValueChange={setModuleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Módulo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Módulos</SelectItem>
                    {modules.map((mod) => (
                      <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {Object.entries(ACTION_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Permissions Table */}
            {permissionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredPermissions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma permissão encontrada
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Módulo</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead className="text-center">Ver</TableHead>
                    <TableHead className="text-center">Criar</TableHead>
                    <TableHead className="text-center">Editar</TableHead>
                    <TableHead className="text-center">Deletar</TableHead>
                    <TableHead className="text-center">Aprovar</TableHead>
                    <TableHead className="text-center">Config.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedPermissions).map(([module, resources]) =>
                    Object.entries(resources).map(([resource, perms], idx) => (
                      <TableRow key={`${module}-${resource}`}>
                        {idx === 0 ? (
                          <TableCell className="font-medium" rowSpan={Object.keys(resources).length}>
                            {module}
                          </TableCell>
                        ) : null}
                        <TableCell>{resource}</TableCell>
                        {["ver", "criar", "editar", "deletar", "aprovar", "configurar"].map((action) => {
                          const hasPerm = perms.some((p) => p.action === action);
                          return (
                            <TableCell key={action} className="text-center">
                              {hasPerm ? (
                                <CheckCircle2 className="h-4 w-4 text-primary mx-auto" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground/30 mx-auto" />
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Usuários neste Papel</CardTitle>
              <CardDescription>
                {usersData?.total || 0} usuário(s) com este papel
              </CardDescription>
            </div>
            {usersData && usersData.total > 3 && (
              <Button
                variant="outline"
                onClick={() => navigate(`/configuracoes/usuarios?role=${roleId}`)}
              >
                Ver todos ({usersData.total})
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {usersData?.users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum usuário com este papel
              </p>
            ) : (
              <div className="space-y-3">
                {usersData?.users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate(`/configuracoes/usuarios?search=${user.email}`)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(user.full_name, user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.full_name || "Sem nome"}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <Badge variant={user.is_active ? "default" : "secondary"}>
                      {user.is_active ? "✅ Ativo" : "⏳ Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <RoleDialog
        open={editOpen}
        role={role}
        onSave={async () => {
          setEditOpen(false);
        }}
        onCancel={() => setEditOpen(false)}
      />

      {/* Duplicate Dialog */}
      <Dialog open={duplicateOpen} onOpenChange={setDuplicateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Papel</DialogTitle>
            <DialogDescription>
              Criar um novo papel baseado em "{role.name}" com as mesmas permissões.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">Nome do novo papel</Label>
              <Input
                id="duplicate-name"
                value={duplicateName}
                onChange={(e) => setDuplicateName(e.target.value)}
                placeholder="Nome do papel"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleDuplicate}
              disabled={!duplicateName.trim() || duplicateRoleMutation.isPending}
            >
              {duplicateRoleMutation.isPending ? "Duplicando..." : "Duplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Papel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o papel "{role.name}"?
              {usersData && usersData.total > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este papel possui {usersData.total} usuário(s) associado(s).
                  Eles serão movidos para o papel padrão.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteRoleMutation.isPending ? "Removendo..." : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}