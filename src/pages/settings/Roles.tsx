import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { Card, CardContent } from "@/components/ui/card";
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
  Plus,
  Search,
  RefreshCw,
  Filter,
  Download,
} from "lucide-react";
import { useRoles, useDeleteRole, useDuplicateRole } from "@/hooks/useRoles";
import { RoleCard, RoleDialog } from "@/components/permissions";
import { toast } from "sonner";
import type { Role } from "@/types/permissions";

type RoleFilter = "all" | "system" | "custom";

export default function SettingsRoles() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<"name" | "users" | "created">("name");
  
  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleteRoleInfo, setDeleteRoleInfo] = useState<{ name: string; userCount: number } | null>(null);
  const [duplicateRole, setDuplicateRole] = useState<Role | null>(null);
  const [duplicateName, setDuplicateName] = useState("");

  const { data: roles, isLoading, refetch } = useRoles(true);
  const deleteRoleMutation = useDeleteRole();
  const duplicateRoleMutation = useDuplicateRole();

  // Filter and sort roles
  const filteredRoles = roles?.filter((role) => {
    // Filter by type
    if (roleFilter === "system" && !role.is_system) return false;
    if (roleFilter === "custom" && role.is_system) return false;
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        role.name.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query)
      );
    }
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case "users":
        return (b.user_count || 0) - (a.user_count || 0);
      case "created":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return a.name.localeCompare(b.name);
    }
  }) || [];

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    try {
      await deleteRoleMutation.mutateAsync({ roleId: deleteRoleId });
      toast.success("Papel removido com sucesso");
      setDeleteRoleId(null);
      setDeleteRoleInfo(null);
    } catch (error) {
      toast.error("Erro ao remover papel");
    }
  };

  const handleDuplicate = async () => {
    if (!duplicateRole || !duplicateName.trim()) return;
    try {
      await duplicateRoleMutation.mutateAsync({
        sourceRoleId: duplicateRole.id,
        newName: duplicateName.trim(),
      });
      toast.success("Papel duplicado com sucesso");
      setDuplicateRole(null);
      setDuplicateName("");
    } catch (error) {
      toast.error("Erro ao duplicar papel");
    }
  };

  const openDeleteDialog = (role: Role) => {
    setDeleteRoleId(role.id);
    setDeleteRoleInfo({ name: role.name, userCount: role.user_count || 0 });
  };

  const openDuplicateDialog = (role: Role) => {
    setDuplicateRole(role);
    setDuplicateName(`${role.name} (Cópia)`);
  };

  const handleRoleClick = (role: Role) => {
    navigate(`/configuracoes/papeis/${role.id}`);
  };

  const handleExport = () => {
    if (!roles) return;
    const data = JSON.stringify(roles, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "papeis-permissoes.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Papéis exportados com sucesso");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Papéis e Permissões"
          description="Gerencie os papéis de acesso e suas permissões"
        >
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Papel
          </Button>
        </PageHeader>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={roleFilter} onValueChange={(v: RoleFilter) => setRoleFilter(v)}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filtrar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Papéis</SelectItem>
                    <SelectItem value="system">🔵 Papéis do Sistema</SelectItem>
                    <SelectItem value="custom">🟢 Papéis Customizados</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: "name" | "users" | "created") => setSortBy(v)}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Ordenar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Por Nome</SelectItem>
                    <SelectItem value="users">Por Usuários</SelectItem>
                    <SelectItem value="created">Por Data</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roles Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredRoles.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Nenhum papel encontrado</p>
              {searchQuery && (
                <Button
                  variant="link"
                  onClick={() => setSearchQuery("")}
                  className="mt-2"
                >
                  Limpar busca
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <RoleCard
                key={role.id}
                role={role}
                onClick={() => handleRoleClick(role)}
                onEdit={() => setEditRole(role)}
                onDuplicate={() => openDuplicateDialog(role)}
                onDelete={() => openDeleteDialog(role)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <RoleDialog
        open={createOpen || !!editRole}
        role={editRole}
        onSave={async () => {
          setCreateOpen(false);
          setEditRole(null);
          refetch();
        }}
        onCancel={() => {
          setCreateOpen(false);
          setEditRole(null);
        }}
      />

      {/* Duplicate Dialog */}
      <Dialog open={!!duplicateRole} onOpenChange={(open) => !open && setDuplicateRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Papel</DialogTitle>
            <DialogDescription>
              Criar um novo papel baseado em "{duplicateRole?.name}" com as mesmas permissões.
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
            <Button variant="outline" onClick={() => setDuplicateRole(null)}>
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
      <AlertDialog open={!!deleteRoleId} onOpenChange={(open) => !open && setDeleteRoleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Papel</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover o papel "{deleteRoleInfo?.name}"?
              {deleteRoleInfo && deleteRoleInfo.userCount > 0 && (
                <span className="block mt-2 text-destructive font-medium">
                  ⚠️ Este papel possui {deleteRoleInfo.userCount} usuário(s) associado(s).
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