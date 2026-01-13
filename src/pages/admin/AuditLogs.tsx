import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuditLogs, useAuditLogTables, AuditLogFilters } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, Eye, FileText, Search, Edit, Trash2, Plus } from "lucide-react";

export default function AuditLogs() {
  const [filters, setFilters] = useState<AuditLogFilters>({});
  const { data: logs, isLoading, refetch } = useAuditLogs(filters);
  const { data: tables } = useAuditLogTables();

  const getActionBadge = (action: string) => {
    switch (action) {
      case "INSERT":
        return <Badge className="bg-green-500"><Plus className="h-3 w-3 mr-1" />Criação</Badge>;
      case "UPDATE":
        return <Badge className="bg-blue-500"><Edit className="h-3 w-3 mr-1" />Alteração</Badge>;
      case "DELETE":
        return <Badge variant="destructive"><Trash2 className="h-3 w-3 mr-1" />Exclusão</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatTableName = (name: string) => {
    return name
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <MainLayout>
      <PageHeader
        title="Logs de Auditoria"
        description="Histórico de alterações em dados sensíveis"
      >
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="mr-2 h-4 w-4" />Atualizar
        </Button>
      </PageHeader>

      {/* Filters */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Tabela</Label>
              <Select
                value={filters.table_name || "all"}
                onValueChange={(v) => setFilters({ ...filters, table_name: v === "all" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {tables?.map((table) => (
                    <SelectItem key={table} value={table}>
                      {formatTableName(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ação</Label>
              <Select
                value={filters.action || "all"}
                onValueChange={(v) => setFilters({ ...filters, action: v === "all" ? undefined : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="INSERT">Criação</SelectItem>
                  <SelectItem value="UPDATE">Alteração</SelectItem>
                  <SelectItem value="DELETE">Exclusão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Input
                type="date"
                value={filters.date_from || ""}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value || undefined })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Final</Label>
              <Input
                type="date"
                value={filters.date_to || ""}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value || undefined })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Registros
          </CardTitle>
          <CardDescription>Últimas 200 alterações</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum log encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Tabela</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Registro</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{formatTableName(log.table_name)}</Badge>
                    </TableCell>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.record_id?.substring(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="icon" variant="ghost">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Alteração</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Tabela:</span>
                                <p>{formatTableName(log.table_name)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Ação:</span>
                                <p>{log.action}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Data:</span>
                                <p>{format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}</p>
                              </div>
                            </div>
                            {log.old_data && (
                              <div>
                                <span className="text-muted-foreground text-sm">Dados Anteriores:</span>
                                <ScrollArea className="h-40 rounded border p-2 bg-destructive/5">
                                  <pre className="text-xs">
                                    {JSON.stringify(log.old_data, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}
                            {log.new_data && (
                              <div>
                                <span className="text-muted-foreground text-sm">Dados Novos:</span>
                                <ScrollArea className="h-40 rounded border p-2 bg-green-500/5">
                                  <pre className="text-xs">
                                    {JSON.stringify(log.new_data, null, 2)}
                                  </pre>
                                </ScrollArea>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
