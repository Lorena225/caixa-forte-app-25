import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/common/TableSkeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { 
  Plus, 
  MoreHorizontal, 
  Eye, 
  FileText, 
  Search,
  Building2,
  TrendingDown,
  Calendar,
} from 'lucide-react';
import { useLoanContracts } from '@/hooks/useLoanContracts';
import { formatCurrency } from '@/lib/loanCalculations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LoanContractStatus, AmortizationSystem, LoanOperationType } from '@/types/loans';

const statusLabels: Record<LoanContractStatus, string> = {
  'EDICAO': 'Em Edição',
  'ATIVO': 'Ativo',
  'ENCERRADO': 'Encerrado',
  'CANCELADO': 'Cancelado',
};

const statusVariants: Record<LoanContractStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'EDICAO': 'secondary',
  'ATIVO': 'default',
  'ENCERRADO': 'outline',
  'CANCELADO': 'destructive',
};

const operationLabels: Record<LoanOperationType, string> = {
  'EMPRESTIMO': 'Empréstimo',
  'FINANCIAMENTO': 'Financiamento',
  'CONTA_GARANTIDA': 'Conta Garantida',
  'OUTRO': 'Outro',
};

export default function ContratosPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { data: contracts, isLoading, error } = useLoanContracts();

  const filteredContracts = contracts?.filter((contract) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      contract.contract_number.toLowerCase().includes(searchLower) ||
      contract.creditor?.name?.toLowerCase().includes(searchLower) ||
      contract.bank?.name?.toLowerCase().includes(searchLower)
    );
  }) || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Contratos de Empréstimos e Financiamentos"
        description="Gerencie contratos com cálculo automático de parcelas (SAC/Price) e geração de títulos AP"
      />

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, credor ou banco..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={() => navigate('/tesouraria/contratos/novo')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Contrato
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contratos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton columns={7} rows={5} />
          ) : error ? (
            <div className="text-destructive text-center py-8">
              Erro ao carregar contratos: {error.message}
            </div>
          ) : filteredContracts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nenhum contrato encontrado"
              description={searchTerm 
                ? "Nenhum contrato corresponde à busca" 
                : "Crie seu primeiro contrato de empréstimo ou financiamento"}
              actionLabel={!searchTerm ? "Novo Contrato" : undefined}
              onAction={!searchTerm ? () => navigate('/tesouraria/contratos/novo') : undefined
                    Novo Contrato
                  </Button>
                )
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nº Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Credor</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead className="text-right">Principal</TableHead>
                    <TableHead className="text-center">Sistema</TableHead>
                    <TableHead className="text-center">Parcelas</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow 
                      key={contract.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/tesouraria/contratos/${contract.id}`)}
                    >
                      <TableCell className="font-medium">
                        {contract.contract_number}
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {operationLabels[contract.operation_type]}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {contract.creditor?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {contract.bank?.compe_code} - {contract.bank?.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(contract.principal_amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {contract.amortization_system}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {contract.installments_count}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={statusVariants[contract.status]}>
                          {statusLabels[contract.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tesouraria/contratos/${contract.id}`);
                            }}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/tesouraria/contratos/${contract.id}?tab=parcelas`);
                            }}>
                              <Calendar className="h-4 w-4 mr-2" />
                              Ver Parcelas
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {contracts && contracts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Contratos Ativos</p>
                  <p className="text-2xl font-bold">
                    {contracts.filter(c => c.status === 'ATIVO').length}
                  </p>
                </div>
                <TrendingDown className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Principal (Ativos)</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      contracts
                        .filter(c => c.status === 'ATIVO')
                        .reduce((sum, c) => sum + c.principal_amount, 0)
                    )}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Em Edição</p>
                  <p className="text-2xl font-bold">
                    {contracts.filter(c => c.status === 'EDICAO').length}
                  </p>
                </div>
                <Building2 className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
