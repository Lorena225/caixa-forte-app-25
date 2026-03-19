import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { FileText, Download, Eye } from 'lucide-react';
import { usePayroll } from '@/hooks/hcm/usePayroll';
import { useEmployees } from '@/hooks/hcm/useEmployees';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const monthNames = [
  '', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function HCMHolerites() {
  const { payslips, payslipsLoading } = usePayroll();
  const { employees } = useEmployees();

  const getEmployeeName = (employeeId: string) => {
    return employees.find(e => e.id === employeeId)?.full_name || 
           payslips.find(p => p.employee_id === employeeId)?.employee?.full_name || 
           'N/A';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Holerites</h1>
          <p className="text-muted-foreground">Contracheques digitais dos colaboradores</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total de Holerites</p>
                  <p className="text-2xl font-bold">{payslips.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Eye className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Disponíveis</p>
                  <p className="text-2xl font-bold">
                    {payslips.filter(p => p.is_available).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Holerites Emitidos</CardTitle>
          </CardHeader>
          <CardContent>
            {payslipsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : payslips.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum holerite emitido</p>
                <p className="text-sm mt-1">Os holerites serão gerados automaticamente após o processamento da folha</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Referência</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Disponível</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((payslip) => (
                    <TableRow key={payslip.id}>
                      <TableCell className="font-medium">
                        {getEmployeeName(payslip.employee_id)}
                      </TableCell>
                      <TableCell>
                        {monthNames[payslip.reference_month]}/{payslip.reference_year}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payslip.document_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={payslip.is_available ? 'default' : 'secondary'}>
                          {payslip.is_available ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {payslip.pdf_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={payslip.pdf_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4 mr-1" /> PDF
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
