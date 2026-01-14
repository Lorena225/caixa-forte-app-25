import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { useRH } from '@/hooks/useRH';
import { Skeleton } from '@/components/ui/skeleton';

export default function Ponto() {
  const { registrosPonto, pontoLoading } = useRH();

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Ponto Eletrônico</h1>
          <p className="text-muted-foreground">Registro e aprovação de ponto</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Registros Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-center">Entrada 1</TableHead>
                  <TableHead className="text-center">Saída 1</TableHead>
                  <TableHead className="text-center">Entrada 2</TableHead>
                  <TableHead className="text-center">Saída 2</TableHead>
                  <TableHead className="text-center">Horas Trab.</TableHead>
                  <TableHead className="text-center">Extras</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pontoLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : registrosPonto.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum registro de ponto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  registrosPonto.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono">
                        {new Date(p.data).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{p.funcionario?.nome_completo}</p>
                        <p className="text-xs text-muted-foreground">{p.funcionario?.matricula}</p>
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {p.entrada_1 || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {p.saida_1 || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {p.entrada_2 || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {p.saida_2 || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono">
                        {p.horas_trabalhadas || '-'}
                      </TableCell>
                      <TableCell className="text-center font-mono text-green-600">
                        {p.horas_extras || '-'}
                      </TableCell>
                      <TableCell>
                        {p.aprovado ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aprovado
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <XCircle className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
