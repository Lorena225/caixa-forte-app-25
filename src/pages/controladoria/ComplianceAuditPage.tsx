import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Download, 
  RefreshCw, 
  Calendar as CalendarIcon,
  FileText,
  Filter,
  FileSpreadsheet
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RegistroAuditoria {
  id: string;
  dataGeracao: Date;
  tipoObrigacao: string;
  status: 'enviado' | 'pronto' | 'erro' | 'pendente';
  usuario: string;
}

const registros: RegistroAuditoria[] = [
  { id: '1', dataGeracao: new Date('2026-01-15'), tipoObrigacao: 'SPED Fiscal', status: 'enviado', usuario: 'Lorena' },
  { id: '2', dataGeracao: new Date('2026-01-10'), tipoObrigacao: 'ECD', status: 'pronto', usuario: 'Admin' },
  { id: '3', dataGeracao: new Date('2026-01-05'), tipoObrigacao: 'ECF', status: 'enviado', usuario: 'Lorena' },
  { id: '4', dataGeracao: new Date('2025-12-28'), tipoObrigacao: 'SPED Fiscal', status: 'enviado', usuario: 'Carlos' },
  { id: '5', dataGeracao: new Date('2025-12-20'), tipoObrigacao: 'FCONT', status: 'pronto', usuario: 'Admin' },
  { id: '6', dataGeracao: new Date('2025-12-15'), tipoObrigacao: 'DANFE', status: 'enviado', usuario: 'Lorena' },
];

const tiposObrigacao = ['SPED Fiscal', 'ECD', 'ECF', 'FCONT', 'DANFE'];

export default function ComplianceAuditPage() {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedTipos, setSelectedTipos] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const handleDownload = (registro: RegistroAuditoria) => {
    toast.success(`Download de ${registro.tipoObrigacao} iniciado`);
  };

  const handleReenviar = (registro: RegistroAuditoria) => {
    toast.info(`Reenviando ${registro.tipoObrigacao}...`);
  };

  const handleExportarRelatorio = () => {
    toast.success('Exportando relatório de compliance...');
  };

  const toggleTipo = (tipo: string) => {
    setSelectedTipos(prev => 
      prev.includes(tipo) ? prev.filter(t => t !== tipo) : [...prev, tipo]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredRegistros = registros.filter(r => {
    const matchesTipo = selectedTipos.length === 0 || selectedTipos.includes(r.tipoObrigacao);
    const matchesStatus = selectedStatus.length === 0 || selectedStatus.includes(r.status);
    const matchesDate = (!dateRange.from || r.dataGeracao >= dateRange.from) && 
                       (!dateRange.to || r.dataGeracao <= dateRange.to);
    return matchesTipo && matchesStatus && matchesDate;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'enviado':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Enviado</Badge>;
      case 'pronto':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Pronto</Badge>;
      case 'erro':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Erro</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <MainLayout>
      <div className="p-6 space-y-6">
        <PageHeader title="Histórico & Auditoria" />

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6">
              {/* Período */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Período</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-64 justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/yyyy")
                        )
                      ) : (
                        <span className="text-muted-foreground">Selecionar período</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                      locale={ptBR}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Tipo */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {tiposObrigacao.map(tipo => (
                    <Button
                      key={tipo}
                      variant={selectedTipos.includes(tipo) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleTipo(tipo)}
                    >
                      {tipo}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <div className="flex gap-4">
                  {['enviado', 'pronto', 'erro', 'pendente'].map(status => (
                    <div key={status} className="flex items-center gap-2">
                      <Checkbox 
                        id={status}
                        checked={selectedStatus.includes(status)}
                        onCheckedChange={() => toggleStatus(status)}
                      />
                      <label htmlFor={status} className="text-sm capitalize cursor-pointer">{status}</label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabela de Registros */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Geração</TableHead>
                  <TableHead>Tipo Obrigação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRegistros.map((registro) => (
                  <TableRow key={registro.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      {format(registro.dataGeracao, "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-gray-400" />
                        {registro.tipoObrigacao}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(registro.status)}</TableCell>
                    <TableCell>{registro.usuario}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(registro)}
                          className="gap-1"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleReenviar(registro)}
                          className="gap-1"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Reenviar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredRegistros.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum registro encontrado com os filtros aplicados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Botão Exportar */}
        <div className="flex justify-end">
          <Button onClick={handleExportarRelatorio} size="lg" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar Relatório de Compliance
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
