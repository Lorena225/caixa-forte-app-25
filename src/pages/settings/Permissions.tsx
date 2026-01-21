import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Filter,
  Download,
  Info,
  Eye,
  Plus,
  Pencil,
  Trash2,
  CheckSquare,
  Settings,
  RefreshCw,
} from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";
import { toast } from "sonner";
import type { PermissionAction } from "@/types/permissions";

const ACTION_CONFIG: Record<PermissionAction, { label: string; icon: React.ReactNode; color: string }> = {
  ver: { label: "Ver", icon: <Eye className="h-3 w-3" />, color: "bg-emerald-500" },
  criar: { label: "Criar", icon: <Plus className="h-3 w-3" />, color: "bg-blue-500" },
  editar: { label: "Editar", icon: <Pencil className="h-3 w-3" />, color: "bg-amber-500" },
  deletar: { label: "Deletar", icon: <Trash2 className="h-3 w-3" />, color: "bg-red-500" },
  aprovar: { label: "Aprovar", icon: <CheckSquare className="h-3 w-3" />, color: "bg-purple-500" },
  configurar: { label: "Configurar", icon: <Settings className="h-3 w-3" />, color: "bg-slate-500" },
};

export default function SettingsPermissions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  const { data: permissions, isLoading, refetch } = usePermissions();

  // Get unique modules
  const modules = useMemo(() => {
    const mods = new Set<string>();
    permissions?.forEach((p) => mods.add(p.module));
    return Array.from(mods).sort();
  }, [permissions]);

  // Filter permissions
  const filteredPermissions = useMemo(() => {
    if (!permissions) return [];
    
    return permissions.filter((perm) => {
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
  }, [permissions, moduleFilter, actionFilter, searchQuery]);

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

  // Stats
  const stats = useMemo(() => {
    if (!permissions) return { total: 0, byAction: {} as Record<string, number> };
    
    const byAction: Record<string, number> = {};
    permissions.forEach((p) => {
      byAction[p.action] = (byAction[p.action] || 0) + 1;
    });
    
    return { total: permissions.length, byAction };
  }, [permissions]);

  const handleExport = () => {
    if (!permissions) return;
    
    // Create CSV
    const headers = ["Módulo", "Recurso", "Ação", "Descrição", "Código"];
    const rows = permissions.map((p) => [
      p.module,
      p.resource,
      p.action,
      p.description || "",
      p.code,
    ]);
    
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((c) => `"${c}"`).join(",")),
    ].join("\n");
    
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "catalogo-permissoes.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Catálogo exportado com sucesso");
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Catálogo de Permissões"
          description="Visualize todas as permissões disponíveis no sistema"
        >
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </PageHeader>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-7">
          <Card className="md:col-span-1">
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          {Object.entries(ACTION_CONFIG).map(([action, config]) => (
            <Card key={action}>
              <CardContent className="pt-6 text-center">
                <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full ${config.color} text-white mb-2`}>
                  {config.icon}
                </div>
                <p className="text-xl font-bold">{stats.byAction[action] || 0}</p>
                <p className="text-sm text-muted-foreground">{config.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por recurso ou módulo..."
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
                    {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${config.color}`} />
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Matrix */}
        <Card>
          <CardHeader>
            <CardTitle>Matriz Completa</CardTitle>
            <CardDescription>
              {filteredPermissions.length} permissão(ões) encontrada(s)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 10 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredPermissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Nenhuma permissão encontrada</p>
                {searchQuery && (
                  <Button
                    variant="link"
                    onClick={() => setSearchQuery("")}
                    className="mt-2"
                  >
                    Limpar busca
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[150px]">Módulo</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead className="text-center w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>Ver</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <Plus className="h-3 w-3" />
                        <span>Criar</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <Pencil className="h-3 w-3" />
                        <span>Editar</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <Trash2 className="h-3 w-3" />
                        <span>Deletar</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        <span>Aprovar</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center w-[80px]">
                      <div className="flex items-center justify-center gap-1">
                        <Settings className="h-3 w-3" />
                        <span>Config.</span>
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedPermissions).flatMap(([module, resources]) =>
                    Object.entries(resources).map(([resource, perms], idx) => (
                      <TableRow key={`${module}-${resource}`}>
                        {idx === 0 ? (
                          <TableCell 
                            className="font-medium align-top"
                            rowSpan={Object.keys(resources).length}
                          >
                            <Badge variant="outline">{module}</Badge>
                          </TableCell>
                        ) : null}
                        <TableCell>{resource}</TableCell>
                        {(["ver", "criar", "editar", "deletar", "aprovar", "configurar"] as PermissionAction[]).map((action) => {
                          const perm = perms.find((p) => p.action === action);
                          const config = ACTION_CONFIG[action];
                          return (
                            <TableCell key={action} className="text-center">
                              {perm ? (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${config.color} text-white cursor-help`}>
                                      <Info className="h-3 w-3" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-medium">{perm.code}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {perm.description || "Sem descrição"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              ) : (
                                <span className="text-muted-foreground/30">—</span>
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
      </div>
    </MainLayout>
  );
}