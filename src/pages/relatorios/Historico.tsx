// =====================================================
// HISTÓRICO DE RELATÓRIOS GERADOS
// =====================================================

import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Search,
  Download,
  Eye,
  Trash2,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { useReportExecutions } from '@/hooks/useAdvancedReports';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const STATUS_ICONS = {
  completed: <CheckCircle className="h-4 w-4 text-primary" />,
  failed: <XCircle className="h-4 w-4 text-destructive" />,
  running: <RefreshCw className="h-4 w-4 text-primary animate-spin" />,
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
};

const FORMAT_ICONS = {
  pdf: <FileText className="h-4 w-4" />,
  excel: <FileSpreadsheet className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  json: <FileSpreadsheet className="h-4 w-4" />,
};

export default function HistoricoRelatorios() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  const { data: executions = [], isLoading, refetch } = useReportExecutions(100);
  
  const filteredExecutions = executions.filter(exec => {
    const matchesSearch = exec.reportName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || exec.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <a href="/relatorios/central">
              <ArrowLeft className="h-4 w-4" />
            </a>
          </Button>
          <PageHeader
            title="Histórico de Relatórios"
            description="Visualize e baixe relatórios gerados anteriormente"
          />
        </div>
        
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome do relatório..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="running">Em execução</SelectItem>
                  <SelectItem value="failed">Com erro</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Executions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Execuções ({filteredExecutions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredExecutions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 rounded-full bg-muted p-4">
                  <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Nenhum relatório gerado</h3>
                <p className="mb-6 max-w-md text-sm text-muted-foreground">
                  Os relatórios gerados aparecerão aqui. Acesse a Central para gerar seu primeiro relatório.
                </p>
                <Button asChild>
                  <a href="/relatorios/central">Ir para Central</a>
                </Button>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Relatório</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Formato</TableHead>
                      <TableHead>Gerado em</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExecutions.map((exec) => (
                      <TableRow key={exec.id}>
                        <TableCell className="font-medium">
                          {exec.reportName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {STATUS_ICONS[exec.status as keyof typeof STATUS_ICONS]}
                            <span className="capitalize">{exec.status}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {FORMAT_ICONS[exec.exportFormat as keyof typeof FORMAT_ICONS]}
                            <Badge variant="outline" className="uppercase">
                              {exec.exportFormat}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {format(new Date(exec.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(exec.createdAt), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {exec.durationMs ? `${(exec.durationMs / 1000).toFixed(1)}s` : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {exec.status === 'completed' && exec.fileUrl && (
                              <>
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={exec.fileUrl} target="_blank" rel="noreferrer">
                                    <Eye className="h-4 w-4" />
                                  </a>
                                </Button>
                                <Button variant="ghost" size="icon" asChild>
                                  <a href={exec.fileUrl} download>
                                    <Download className="h-4 w-4" />
                                  </a>
                                </Button>
                              </>
                            )}
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}