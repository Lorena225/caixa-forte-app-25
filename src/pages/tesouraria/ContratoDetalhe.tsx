import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Calculator, 
  FileText, 
  Play,
  RefreshCcw,
  Building2,
  Calendar,
  Percent,
  DollarSign,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Lock,
  Edit,
} from 'lucide-react';
import { 
  useLoanContract, 
  useLoanInstallments,
  useCalculateInstallments,
  useGenerateAPTitles,
  useActivateLoanContract,
} from '@/hooks/useLoanContracts';
import { 
  canCalculateInstallments,
  canGenerateAPTitles,
  canActivateContract,
  needsRecalculation,
} from '@/hooks/useLoanValidation';
import { NeedsRecalcBanner } from '@/components/loans/NeedsRecalcBanner';
import { ConfirmationDialog } from '@/components/loans/ConfirmationDialog';
import { formatCurrency, formatRate } from '@/lib/loanCalculations';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { LoanContractStatus, LoanInstallmentStatus } from '@/types/loans';

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

const installmentStatusLabels: Record<LoanInstallmentStatus, string> = {
  'PREVISTA': 'Prevista',
  'GERADA': 'Título Gerado',
  'BAIXADA': 'Paga',
  'RENEGOCIADA': 'Renegociada',
  'CANCELADA': 'Cancelada',
};

const installmentStatusIcons: Record<LoanInstallmentStatus, React.ReactNode> = {
  'PREVISTA': <Clock className="h-4 w-4 text-muted-foreground" />,
  'GERADA': <FileText className="h-4 w-4 text-blue-500" />,
  'BAIXADA': <CheckCircle2 className="h-4 w-4 text-green-500" />,
  'RENEGOCIADA': <RefreshCcw className="h-4 w-4 text-amber-500" />,
  'CANCELADA': <AlertCircle className="h-4 w-4 text-destructive" />,
};

export default function ContratoDetalhePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'dados';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);
  const [generateMode, setGenerateMode] = useState<'all' | 'number' | 'date'>('all');
  const [generateValue, setGenerateValue] = useState('');
  
  const { data: contract, isLoading: contractLoading } = useLoanContract(id);
  const { data: installments, isLoading: installmentsLoading } = useLoanInstallments(id);
  
  const calculateMutation = useCalculateInstallments();
  const generateAPMutation = useGenerateAPTitles();
  const activateMutation = useActivateLoanContract();

  const hasInstallments = installments && installments.length > 0;
  const pendingInstallments = installments?.filter(i => i.status === 'PREVISTA' && !i.ap_transaction_id) || [];
  const generatedInstallments = installments?.filter(i => i.status !== 'PREVISTA') || [];

  // Validation checks
  const canCalculate = contract ? canCalculateInstallments(contract) : { canCalculate: false };
  const canGenerate = contract ? canGenerateAPTitles(contract, pendingInstallments.length) : { canGenerate: false };
  const canActivate = contract ? canActivateContract(contract, !!hasInstallments) : { canActivate: false };
  const needsRecalc = contract ? needsRecalculation(contract) : false;

  const handleCalculate = () => {
    if (contract) {
      if (hasInstallments) {
        setShowRecalcDialog(true);
      } else {
        calculateMutation.mutate(contract);
      }
    }
  };

  const confirmRecalculate = () => {
    if (contract) {
      calculateMutation.mutate(contract, {
        onSuccess: () => setShowRecalcDialog(false),
      });
    }
  };

  const handleGenerateAP = () => {
    if (!contract) return;
    
    const params: any = { contract_id: contract.id };
    
    if (generateMode === 'number' && generateValue) {
      params.max_installment = parseInt(generateValue);
    } else if (generateMode === 'date' && generateValue) {
      params.max_date = generateValue;
    }
    
    generateAPMutation.mutate(params, {
      onSuccess: () => {
        setShowGenerateDialog(false);
        setGenerateValue('');
      },
    });
  };

  const handleActivate = () => {
    if (contract) {
      activateMutation.mutate(contract.id, {
        onSuccess: () => setShowActivateDialog(false),
      });
    }
  };

  if (contractLoading) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!contract) {
    return (
      <MainLayout>
        <div className="space-y-6">
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Contrato não encontrado</h2>
              <p className="text-muted-foreground mb-4">
                O contrato solicitado não existe ou você não tem permissão para visualizá-lo.
              </p>
              <Button onClick={() => navigate('/tesouraria/contratos')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para Contratos
              </Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const isReadOnly = contract.status !== 'EDICAO';

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tesouraria/contratos')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              Contrato {contract.contract_number}
              <Badge variant={statusVariants[contract.status]}>
                {statusLabels[contract.status]}
              </Badge>
              {isReadOnly && (
                <Lock className="h-4 w-4 text-muted-foreground" />
              )}
            </h1>
            <p className="text-muted-foreground">
              {contract.creditor?.name} • {contract.bank?.name}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {contract.status === 'EDICAO' && (
            <>
              {!hasInstallments ? (
                <Button 
                  onClick={handleCalculate}
                  disabled={calculateMutation.isPending || !canCalculate.canCalculate}
                  title={canCalculate.reason}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  {calculateMutation.isPending ? 'Calculando...' : 'Calcular Parcelas'}
                </Button>
              ) : (
                <>
                  {contract.allow_recalculate && (
                    <Button 
                      variant="outline"
                      onClick={handleCalculate}
                      disabled={calculateMutation.isPending}
                    >
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Recalcular
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    onClick={() => setShowGenerateDialog(true)}
                    disabled={!canGenerate.canGenerate}
                    title={canGenerate.reason}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Gerar Lançamentos
                  </Button>
                  <Button 
                    onClick={() => setShowActivateDialog(true)} 
                    disabled={!canActivate.canActivate}
                    title={canActivate.reason}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Ativar Contrato
                  </Button>
                </>
              )}
            </>
          )}
          
          {contract.status === 'ATIVO' && pendingInstallments.length > 0 && (
            <Button 
              onClick={() => setShowGenerateDialog(true)}
              disabled={!canGenerate.canGenerate}
              title={canGenerate.reason}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar Lançamentos ({pendingInstallments.length})
            </Button>
          )}
        </div>
      </div>

      {/* Needs Recalc Banner */}
      {needsRecalc && (
        <NeedsRecalcBanner
          reason={contract.recalc_reason}
          onRecalculate={handleCalculate}
          isRecalculating={calculateMutation.isPending}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dados">Dados do Contrato</TabsTrigger>
          <TabsTrigger value="parcelas">
            Parcelas
            {installments && installments.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {installments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">Configurações AP</TabsTrigger>
        </TabsList>

        {/* Tab: Dados do Contrato */}
        <TabsContent value="dados" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Partes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Partes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Credor</Label>
                  <p className="font-medium">{contract.creditor?.name}</p>
                  {contract.creditor?.document && (
                    <p className="text-sm text-muted-foreground">{contract.creditor.document}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground">Banco</Label>
                  <p className="font-medium">
                    {contract.bank?.compe_code} - {contract.bank?.name}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Conta Bancária</Label>
                  <p className="font-medium">
                    Ag. {contract.bank_account?.agency_number} / CC {contract.bank_account?.account_number}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Datas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Datas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Data do Contrato</Label>
                  <p className="font-medium">
                    {format(new Date(contract.contract_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data do Desembolso</Label>
                  <p className="font-medium">
                    {format(new Date(contract.disbursement_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Primeiro Vencimento</Label>
                  <p className="font-medium">
                    {format(new Date(contract.first_due_date), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Condições */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Condições Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Valor Principal</Label>
                  <p className="font-medium text-xl">{formatCurrency(contract.principal_amount)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Sistema</Label>
                    <p className="font-medium">{contract.amortization_system}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Parcelas</Label>
                    <p className="font-medium">{contract.installments_count}x {contract.installment_period.toLowerCase()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Taxa */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Percent className="h-5 w-5" />
                  Taxa de Juros
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Taxa Nominal</Label>
                  <p className="font-medium text-xl">
                    {formatRate(contract.nominal_rate, contract.rate_period)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Tipo de Taxa</Label>
                    <p className="font-medium">{contract.rate_type === 'FIXA' ? 'Fixa' : 'Indexada'}</p>
                  </div>
                  {contract.rate_index && (
                    <div>
                      <Label className="text-muted-foreground">Indexador</Label>
                      <p className="font-medium">{contract.rate_index}</p>
                    </div>
                  )}
                </div>
                {contract.grace_periods > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Carência</Label>
                    <p className="font-medium">
                      {contract.grace_periods} período(s) - {contract.grace_type.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notas */}
          {contract.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{contract.notes}</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab: Parcelas */}
        <TabsContent value="parcelas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>Grade de Parcelas</span>
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                {installments && installments.length > 0 && (
                  <div className="flex gap-2 text-sm font-normal">
                    <Badge variant="outline">
                      Previstas: {pendingInstallments.length}
                    </Badge>
                    <Badge variant="default">
                      Geradas: {generatedInstallments.length}
                    </Badge>
                  </div>
                )}
              </CardTitle>
              <CardDescription>
                Parcelas calculadas automaticamente. Não é possível editar valores manualmente (MVP).
              </CardDescription>
            </CardHeader>
            <CardContent>
              {installmentsLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : !installments || installments.length === 0 ? (
                <div className="text-center py-12">
                  <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma parcela calculada</h3>
                  <p className="text-muted-foreground mb-4">
                    Clique em "Calcular Parcelas" para gerar a grade de amortização.
                  </p>
                  {contract.status === 'EDICAO' && (
                    <Button onClick={handleCalculate} disabled={calculateMutation.isPending}>
                      <Calculator className="h-4 w-4 mr-2" />
                      Calcular Parcelas
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Parcela</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead className="text-right">Prestação</TableHead>
                        <TableHead className="text-right">Juros</TableHead>
                        <TableHead className="text-right">Amortização</TableHead>
                        <TableHead className="text-right">Saldo Devedor</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Título AP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {installments.map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">
                            {inst.installment_no}/{contract.installments_count}
                          </TableCell>
                          <TableCell>
                            {format(new Date(inst.due_date), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(inst.installment_amount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(inst.interest_amount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(inst.amortization_amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(inst.remaining_balance)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              {installmentStatusIcons[inst.status]}
                              <span className="text-sm">{installmentStatusLabels[inst.status]}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {inst.ap_transaction_id ? (
                              <Button
                                variant="link"
                                size="sm"
                                className="p-0 h-auto"
                                onClick={() => navigate(`/contas-pagar?id=${inst.ap_transaction_id}`)}
                              >
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Ver título
                              </Button>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Configurações AP */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Geração de Títulos AP</CardTitle>
              <CardDescription>
                Parâmetros utilizados ao gerar títulos em Contas a Pagar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo de Título</Label>
                  <p className="font-medium">{contract.ap_title_type || 'Padrão'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Série</Label>
                  <p className="font-medium">{contract.ap_series || '-'}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Template de Descrição</Label>
                <p className="font-medium font-mono text-sm bg-muted p-2 rounded">
                  {contract.description_template || 'Empréstimo {bank} – Contrato {contract} – Parcela {k}/{n}'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Conta Contábil (Passivo)</Label>
                <p className="font-medium">
                  {contract.liability_account_id || (
                    <span className="text-destructive">Não configurada - configure antes de gerar títulos</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog: Gerar Lançamentos */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar Lançamentos AP</DialogTitle>
            <DialogDescription>
              Você está prestes a gerar {pendingInstallments.length} lançamentos financeiros.
              Parcelas já geradas não serão duplicadas.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <RadioGroup value={generateMode} onValueChange={(v) => setGenerateMode(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all">Todas as parcelas pendentes ({pendingInstallments.length})</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="number" id="number" />
                <Label htmlFor="number">Até a parcela nº:</Label>
                {generateMode === 'number' && (
                  <Input
                    type="number"
                    min={1}
                    max={contract.installments_count}
                    value={generateValue}
                    onChange={(e) => setGenerateValue(e.target.value)}
                    className="w-24"
                    placeholder="Ex: 6"
                  />
                )}
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="date" id="date" />
                <Label htmlFor="date">Até a data:</Label>
                {generateMode === 'date' && (
                  <Input
                    type="date"
                    value={generateValue}
                    onChange={(e) => setGenerateValue(e.target.value)}
                    className="w-40"
                  />
                )}
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateAP}
              disabled={generateAPMutation.isPending}
            >
              {generateAPMutation.isPending ? 'Gerando...' : 'Confirmar Geração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar Ativação */}
      <ConfirmationDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        title="Ativar Contrato"
        description={`Você está prestes a ativar o contrato ${contract.contract_number}. Após a ativação, os campos estruturais (valor, taxa, parcelas, sistema) não poderão ser alterados. Deseja continuar?`}
        confirmLabel="Ativar Contrato"
        type="warning"
        onConfirm={handleActivate}
        isPending={activateMutation.isPending}
      />

      {/* Dialog: Confirmar Recálculo */}
      <ConfirmationDialog
        open={showRecalcDialog}
        onOpenChange={setShowRecalcDialog}
        title="Recalcular Parcelas"
        description="Recalcular irá substituir TODAS as parcelas previstas (não geradas). Parcelas já geradas como títulos AP serão mantidas. Deseja continuar?"
        confirmLabel="Recalcular"
        type="warning"
        onConfirm={confirmRecalculate}
        isPending={calculateMutation.isPending}
      />
      </div>
    </MainLayout>
  );
}
