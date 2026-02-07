import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditLogs } from "@/hooks/useGovernanceSettings";
import { Activity, Search, Filter, Clock, User, Database, ArrowRight, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function AuditLogsTab() {
  const [filters, setFilters] = useState<{ table_name?: string; action?: string }>({});
  const { data: logs, isLoading } = useAuditLogs({ ...filters, limit: 100 });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getActionBadge = (action: string) => {
    switch (action?.toUpperCase()) {
      case "INSERT":
        return <Badge className="bg-green-100 text-green-800">Criação</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-100 text-blue-800">Alteração</Badge>;
      case "DELETE":
        return <Badge className="bg-red-100 text-red-800">Exclusão</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.table_name?.toLowerCase().includes(search) ||
      log.username?.toLowerCase().includes(search) ||
      log.action?.toLowerCase().includes(search)
    );
  });

  const getFieldChanges = (oldData: any, newData: any) => {
    if (!oldData && newData) {
      return Object.entries(newData).map(([key, value]) => ({
        field: key,
        old: null,
        new: value,
      }));
    }
    if (oldData && !newData) {
      return Object.entries(oldData).map(([key, value]) => ({
        field: key,
        old: value,
        new: null,
      }));
    }
    if (oldData && newData) {
      const changes: any[] = [];
      const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);
      allKeys.forEach((key) => {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
          changes.push({
            field: key,
            old: oldData[key],
            new: newData[key],
          });
        }
      });
      return changes;
    }
    return [];
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={filters.table_name || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, table_name: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Tabela" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as tabelas</SelectItem>
                <SelectItem value="transactions">Transações</SelectItem>
                <SelectItem value="accounts">Contas</SelectItem>
                <SelectItem value="cost_centers">Centros de Custo</SelectItem>
                <SelectItem value="counterparties">Contrapartes</SelectItem>
                <SelectItem value="user_roles">Permissões</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.action || "all"}
              onValueChange={(value) =>
                setFilters({ ...filters, action: value === "all" ? undefined : value })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="INSERT">Criação</SelectItem>
                <SelectItem value="UPDATE">Alteração</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs de Auditoria
          </CardTitle>
          <CardDescription>
            Rastreabilidade completa de todas as alterações no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center p-8">Carregando...</div>
          ) : filteredLogs?.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead className="text-right">Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        {log.username || "Sistema"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Database className="h-3 w-3 text-muted-foreground" />
                        <code className="text-xs bg-muted px-1 py-0.5 rounded">{log.table_name}</code>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell>
                      <code className="text-xs text-muted-foreground">{log.ip_address || "-"}</code>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedLog(log)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Log de Auditoria</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Data/Hora</p>
                    <p className="font-medium">
                      {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Usuário</p>
                    <p className="font-medium">{selectedLog.username || "Sistema"}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Tabela</p>
                    <p className="font-medium font-mono">{selectedLog.table_name}</p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded-lg">
                    <p className="text-sm text-muted-foreground">Ação</p>
                    {getActionBadge(selectedLog.action)}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="font-medium">Alterações:</p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campo</TableHead>
                          <TableHead>Valor Anterior</TableHead>
                          <TableHead></TableHead>
                          <TableHead>Novo Valor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getFieldChanges(selectedLog.old_data, selectedLog.new_data).map((change, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono text-sm">{change.field}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {change.old !== null ? JSON.stringify(change.old) : "-"}
                            </TableCell>
                            <TableCell className="text-center">
                              <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            </TableCell>
                            <TableCell className="text-sm">
                              {change.new !== null ? JSON.stringify(change.new) : "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
