import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Calculator, AlertCircle, Info } from 'lucide-react';
import { useCreateLoanContract } from '@/hooks/useLoanContracts';
import { validateLoanFormData, LOAN_ERROR_MESSAGES } from '@/hooks/useLoanValidation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BankSelect } from '@/components/cadastros/BankSelect';
import type { BankReference } from '@/hooks/useBanksReference';
import { calculateInstallments, formatCurrency, validateCalculationParams } from '@/lib/loanCalculations';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { 
  LoanContractFormData, 
  LoanOperationType, 
  AmortizationSystem,
  RateType,
  RatePeriod,
  GraceType,
  InstallmentPeriod,
  CalculatedInstallment,
} from '@/types/loans';

const operationTypes: { value: LoanOperationType; label: string }[] = [
  { value: 'EMPRESTIMO', label: 'Empréstimo' },
  { value: 'FINANCIAMENTO', label: 'Financiamento' },
  { value: 'CONTA_GARANTIDA', label: 'Conta Garantida' },
  { value: 'OUTRO', label: 'Outro' },
];

const amortizationSystems: { value: AmortizationSystem; label: string; description: string }[] = [
  { value: 'SAC', label: 'SAC', description: 'Sistema de Amortização Constante - Parcelas decrescentes' },
  { value: 'PRICE', label: 'PRICE', description: 'Tabela Price - Parcelas constantes' },
];

const ratePeriods: { value: RatePeriod; label: string }[] = [
  { value: 'MES', label: 'ao mês (a.m.)' },
  { value: 'ANO', label: 'ao ano (a.a.)' },
];

const installmentPeriods: { value: InstallmentPeriod; label: string }[] = [
  { value: 'MENSAL', label: 'Mensal' },
  { value: 'BIMESTRAL', label: 'Bimestral' },
  { value: 'TRIMESTRAL', label: 'Trimestral' },
  { value: 'ANUAL', label: 'Anual' },
];

const graceTypes: { value: GraceType; label: string }[] = [
  { value: 'SEM_CARENCIA', label: 'Sem carência' },
  { value: 'SO_JUROS', label: 'Só juros (amortização após)' },
  { value: 'TOTAL', label: 'Carência total (sem pagamento)' },
];

export default function ContratoNovoPage() {
  const navigate = useNavigate();
  const { currentCompany } = useAuth();
  const createMutation = useCreateLoanContract();
  
  const [formData, setFormData] = useState<Partial<LoanContractFormData>>({
    contract_number: '',
    operation_type: 'EMPRESTIMO',
    creditor_partner_id: '',
    bank_id: '',
    company_bank_account_id: '',
    principal_amount: 0,
    amortization_system: 'PRICE',
    rate_type: 'FIXA',
    nominal_rate: 0,
    rate_period: 'MES',
    grace_periods: 0,
    grace_type: 'SEM_CARENCIA',
    installments_count: 12,
    installment_period: 'MENSAL',
    contract_date: new Date().toISOString().split('T')[0],
    disbursement_date: '',
    first_due_date: '',
    notes: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<CalculatedInstallment[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedBank, setSelectedBank] = useState<BankReference | null>(null);

  // Fetch counterparties (creditors)
  const { data: counterparties } = useQuery({
    queryKey: ['counterparties-suppliers', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('counterparties')
        .select('id, name, document')
        .eq('company_id', currentCompany.id)
        .eq('is_supplier', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  // Fetch bank accounts
  const { data: bankAccounts } = useQuery({
    queryKey: ['bank-accounts', currentCompany?.id],
    queryFn: async () => {
      if (!currentCompany?.id) return [];
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('id, account_number, agency, bank_code, bank_name')
        .eq('company_id', currentCompany.id)
        .eq('is_active', true)
        .order('bank_name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentCompany?.id,
  });

  const updateField = (field: keyof LoanContractFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    // Hide preview when structural fields change
    if (['principal_amount', 'nominal_rate', 'installments_count', 'amortization_system', 'first_due_date', 'grace_periods', 'grace_type'].includes(field)) {
      setShowPreview(false);
    }
  };

  const handlePreview = () => {
    const validationErrors = validateCalculationParams({
      principal: formData.principal_amount,
      nominalRate: formData.nominal_rate,
      ratePeriod: formData.rate_period,
      installmentsCount: formData.installments_count,
      installmentPeriod: formData.installment_period,
      amortizationSystem: formData.amortization_system,
      gracePeriods: formData.grace_periods,
      graceType: formData.grace_type,
      firstDueDate: formData.first_due_date ? new Date(formData.first_due_date) : undefined,
    });
    
    if (validationErrors.length > 0) {
      setErrors({ preview: validationErrors.join('; ') });
      return;
    }
    
    const calculated = calculateInstallments({
      principal: formData.principal_amount!,
      nominalRate: formData.nominal_rate!,
      ratePeriod: formData.rate_period!,
      installmentsCount: formData.installments_count!,
      installmentPeriod: formData.installment_period!,
      amortizationSystem: formData.amortization_system!,
      gracePeriods: formData.grace_periods!,
      graceType: formData.grace_type!,
      firstDueDate: new Date(formData.first_due_date!),
    });
    
    setPreview(calculated);
    setShowPreview(true);
    setErrors({});
  };

  const validate = (): boolean => {
    const newErrors = validateLoanFormData(formData);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    createMutation.mutate(formData as LoanContractFormData, {
      onSuccess: (data) => {
        navigate(`/tesouraria/contratos/${data.id}`);
      },
    });
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tesouraria/contratos')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader
          title="Novo Contrato de Empréstimo"
          description="Cadastre um novo contrato com cálculo automático de parcelas"
        />
      </div>

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Campos marcados com <span className="text-destructive">*</span> são obrigatórios. 
          Após salvar, você poderá calcular as parcelas e gerar os títulos no Contas a Pagar.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_number">Número do Contrato <span className="text-destructive">*</span></Label>
              <Input
                id="contract_number"
                value={formData.contract_number}
                onChange={(e) => updateField('contract_number', e.target.value)}
                placeholder="Ex: EMP-2024-001"
                className={errors.contract_number ? 'border-destructive' : ''}
              />
              {errors.contract_number && (
                <p className="text-sm text-destructive">{errors.contract_number}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="operation_type">Tipo de Operação <span className="text-destructive">*</span></Label>
              <Select
                value={formData.operation_type}
                onValueChange={(v) => updateField('operation_type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operationTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="creditor_partner_id">Credor (Fornecedor) <span className="text-destructive">*</span></Label>
              <Select
                value={formData.creditor_partner_id}
                onValueChange={(v) => updateField('creditor_partner_id', v)}
              >
                <SelectTrigger className={errors.creditor_partner_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione o credor" />
                </SelectTrigger>
                <SelectContent>
                  {counterparties?.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id}>
                      {cp.name} {cp.document && `(${cp.document})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.creditor_partner_id && (
                <p className="text-sm text-destructive">{errors.creditor_partner_id}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Banco e Conta */}
        <Card>
          <CardHeader>
            <CardTitle>Banco e Conta</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Banco <span className="text-destructive">*</span></Label>
              <BankSelect
                value={selectedBank}
                onChange={(bank) => {
                  setSelectedBank(bank);
                  updateField('bank_id', bank?.id || '');
                }}
                error={!!errors.bank_id}
              />
              {errors.bank_id && <p className="text-sm text-destructive">{errors.bank_id}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="company_bank_account_id">Conta Bancária da Empresa <span className="text-destructive">*</span></Label>
              <Select
                value={formData.company_bank_account_id}
                onValueChange={(v) => updateField('company_bank_account_id', v)}
              >
                <SelectTrigger className={errors.company_bank_account_id ? 'border-destructive' : ''}>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts?.map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bank_name || acc.bank_code} - Ag. {acc.agency} / CC {acc.account_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.company_bank_account_id && (
                <p className="text-sm text-destructive">{errors.company_bank_account_id}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Condições Financeiras */}
        <Card>
          <CardHeader>
            <CardTitle>Condições Financeiras</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="principal_amount">Valor Principal (R$) <span className="text-destructive">*</span></Label>
                <Input
                  id="principal_amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.principal_amount || ''}
                  onChange={(e) => updateField('principal_amount', parseFloat(e.target.value) || 0)}
                  placeholder="0,00"
                  className={errors.principal_amount ? 'border-destructive' : ''}
                />
                {errors.principal_amount && (
                  <p className="text-sm text-destructive">{errors.principal_amount}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="installments_count">Número de Parcelas <span className="text-destructive">*</span></Label>
                <Input
                  id="installments_count"
                  type="number"
                  min="1"
                  max="360"
                  value={formData.installments_count || ''}
                  onChange={(e) => updateField('installments_count', parseInt(e.target.value) || 0)}
                  className={errors.installments_count ? 'border-destructive' : ''}
                />
                {errors.installments_count && (
                  <p className="text-sm text-destructive">{errors.installments_count}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="installment_period">Periodicidade <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.installment_period}
                  onValueChange={(v) => updateField('installment_period', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {installmentPeriods.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amortization_system">Sistema de Amortização <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.amortization_system}
                  onValueChange={(v) => updateField('amortization_system', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {amortizationSystems.map((sys) => (
                      <SelectItem key={sys.value} value={sys.value}>
                        <div>
                          <span className="font-medium">{sys.label}</span>
                          <span className="text-muted-foreground text-xs ml-2">
                            {sys.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="nominal_rate">Taxa Nominal (%) <span className="text-destructive">*</span></Label>
                <Input
                  id="nominal_rate"
                  type="number"
                  step="0.0001"
                  min="0"
                  value={formData.nominal_rate ? (formData.nominal_rate * 100).toFixed(4) : ''}
                  onChange={(e) => updateField('nominal_rate', (parseFloat(e.target.value) || 0) / 100)}
                  placeholder="Ex: 1.5"
                  className={errors.nominal_rate ? 'border-destructive' : ''}
                />
                {errors.nominal_rate && (
                  <p className="text-sm text-destructive">{errors.nominal_rate}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="rate_period">Período da Taxa <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.rate_period}
                  onValueChange={(v) => updateField('rate_period', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ratePeriods.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grace_periods">Períodos de Carência</Label>
                <Input
                  id="grace_periods"
                  type="number"
                  min="0"
                  value={formData.grace_periods || ''}
                  onChange={(e) => updateField('grace_periods', parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className={errors.grace_periods ? 'border-destructive' : ''}
                />
                {errors.grace_periods && (
                  <p className="text-sm text-destructive">{errors.grace_periods}</p>
                )}
              </div>
            </div>

            {formData.grace_periods && formData.grace_periods > 0 && (
              <div className="space-y-2">
                <Label htmlFor="grace_type">Tipo de Carência <span className="text-destructive">*</span></Label>
                <Select
                  value={formData.grace_type}
                  onValueChange={(v) => updateField('grace_type', v)}
                >
                  <SelectTrigger className="w-full md:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {graceTypes.filter(g => g.value !== 'SEM_CARENCIA').map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Datas */}
        <Card>
          <CardHeader>
            <CardTitle>Datas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contract_date">Data do Contrato <span className="text-destructive">*</span></Label>
              <Input
                id="contract_date"
                type="date"
                value={formData.contract_date}
                onChange={(e) => updateField('contract_date', e.target.value)}
                className={errors.contract_date ? 'border-destructive' : ''}
              />
              {errors.contract_date && (
                <p className="text-sm text-destructive">{errors.contract_date}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="disbursement_date">Data do Desembolso <span className="text-destructive">*</span></Label>
              <Input
                id="disbursement_date"
                type="date"
                value={formData.disbursement_date}
                min={formData.contract_date}
                onChange={(e) => updateField('disbursement_date', e.target.value)}
                className={errors.disbursement_date ? 'border-destructive' : ''}
              />
              {errors.disbursement_date && (
                <p className="text-sm text-destructive">{errors.disbursement_date}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="first_due_date">Primeiro Vencimento <span className="text-destructive">*</span></Label>
              <Input
                id="first_due_date"
                type="date"
                value={formData.first_due_date}
                min={formData.contract_date}
                onChange={(e) => updateField('first_due_date', e.target.value)}
                className={errors.first_due_date ? 'border-destructive' : ''}
              />
              {errors.first_due_date && (
                <p className="text-sm text-destructive">{errors.first_due_date}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              placeholder="Observações adicionais sobre o contrato..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Preview */}
        {showPreview && preview.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Prévia das Parcelas
              </CardTitle>
              <CardDescription>
                Primeiras 6 parcelas calculadas. Total: {formatCurrency(
                  preview.reduce((sum, p) => sum + p.installment_amount, 0)
                )} em {preview.length} parcelas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="py-2 text-left">Parcela</th>
                      <th className="py-2 text-left">Vencimento</th>
                      <th className="py-2 text-right">Prestação</th>
                      <th className="py-2 text-right">Juros</th>
                      <th className="py-2 text-right">Amortização</th>
                      <th className="py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 6).map((inst) => (
                      <tr key={inst.installment_no} className="border-b">
                        <td className="py-2">{inst.installment_no}</td>
                        <td className="py-2">{inst.due_date}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(inst.installment_amount)}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(inst.interest_amount)}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(inst.amortization_amount)}</td>
                        <td className="py-2 text-right">{formatCurrency(inst.remaining_balance)}</td>
                      </tr>
                    ))}
                    {preview.length > 6 && (
                      <tr>
                        <td colSpan={6} className="py-2 text-center text-muted-foreground">
                          ... e mais {preview.length - 6} parcelas
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Errors */}
        {errors.preview && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded">
            <AlertCircle className="h-4 w-4" />
            {errors.preview}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 justify-end">
          <Button type="button" variant="outline" onClick={handlePreview}>
            <Calculator className="h-4 w-4 mr-2" />
            Simular Parcelas
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending ? 'Salvando...' : 'Salvar Contrato'}
          </Button>
        </div>
      </form>
      </div>
    </MainLayout>
  );
}
