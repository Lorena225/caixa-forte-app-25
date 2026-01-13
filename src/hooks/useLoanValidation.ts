import type { LoanContract, LoanContractFormData } from '@/types/loans';

// Validation error messages (PT-BR)
export const LOAN_ERROR_MESSAGES = {
  CONTRACT_NUMBER_REQUIRED: 'Número do contrato é obrigatório',
  CREDITOR_REQUIRED: 'Selecione o credor',
  BANK_REQUIRED: 'Selecione o banco',
  BANK_ACCOUNT_REQUIRED: 'Selecione a conta bancária da empresa',
  LIABILITY_ACCOUNT_REQUIRED: 'Selecione a conta contábil (passivo) para o contrato',
  PRINCIPAL_POSITIVE: 'Valor principal deve ser maior que zero',
  INSTALLMENTS_POSITIVE: 'Número de parcelas deve ser maior que zero',
  GRACE_EXCEEDS_INSTALLMENTS: 'Carência não pode ser maior que o número de parcelas',
  RATE_VALID: 'Taxa nominal deve ser maior ou igual a zero',
  CONTRACT_DATE_REQUIRED: 'Data do contrato é obrigatória',
  DISBURSEMENT_DATE_REQUIRED: 'Data do desembolso é obrigatória',
  FIRST_DUE_DATE_REQUIRED: 'Data do primeiro vencimento é obrigatória',
  FIRST_DUE_BEFORE_CONTRACT: 'Primeiro vencimento deve ser >= data de contratação',
  DISBURSEMENT_BEFORE_CONTRACT: 'Desembolso deve ser >= data de contratação',
  HAS_INSTALLMENTS_CANNOT_EDIT: 'Já existem parcelas calculadas. Use a rotina de recálculo.',
  HAS_TITLES_CANNOT_EDIT: 'Já existem títulos gerados. Não é possível alterar campos estruturais.',
  NEEDS_RECALC: 'Contrato precisa ter as parcelas recalculadas antes de prosseguir.',
  NO_INSTALLMENTS_TO_GENERATE: 'Não há parcelas pendentes para gerar lançamentos.',
  CANNOT_ACTIVATE_WITHOUT_INSTALLMENTS: 'Calcule as parcelas antes de ativar o contrato.',
  CANNOT_ACTIVATE_NEEDS_RECALC: 'Recalcule as parcelas antes de ativar o contrato.',
  WALLET_REQUIRED: 'A conta bancária não possui carteira (wallet) vinculada.',
};

// Structural fields that trigger recalculation
export const STRUCTURAL_FIELDS = [
  'principal_amount',
  'amortization_system',
  'nominal_rate',
  'rate_type',
  'rate_index',
  'installments_count',
  'installment_period',
  'first_due_date',
  'grace_periods',
  'grace_type',
] as const;

export type StructuralField = typeof STRUCTURAL_FIELDS[number];

// Validate form data before creation/update
export function validateLoanFormData(
  formData: Partial<LoanContractFormData>,
  options?: { isUpdate?: boolean; hasInstallments?: boolean; hasGeneratedTitles?: boolean }
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!formData.contract_number?.trim()) {
    errors.contract_number = LOAN_ERROR_MESSAGES.CONTRACT_NUMBER_REQUIRED;
  }
  
  if (!formData.creditor_partner_id) {
    errors.creditor_partner_id = LOAN_ERROR_MESSAGES.CREDITOR_REQUIRED;
  }
  
  if (!formData.bank_id) {
    errors.bank_id = LOAN_ERROR_MESSAGES.BANK_REQUIRED;
  }
  
  if (!formData.company_bank_account_id) {
    errors.company_bank_account_id = LOAN_ERROR_MESSAGES.BANK_ACCOUNT_REQUIRED;
  }
  
  if (!formData.principal_amount || formData.principal_amount <= 0) {
    errors.principal_amount = LOAN_ERROR_MESSAGES.PRINCIPAL_POSITIVE;
  }
  
  if (!formData.installments_count || formData.installments_count <= 0) {
    errors.installments_count = LOAN_ERROR_MESSAGES.INSTALLMENTS_POSITIVE;
  }
  
  if (formData.nominal_rate === undefined || formData.nominal_rate < 0) {
    errors.nominal_rate = LOAN_ERROR_MESSAGES.RATE_VALID;
  }
  
  if (formData.grace_periods && formData.installments_count && formData.grace_periods > formData.installments_count) {
    errors.grace_periods = LOAN_ERROR_MESSAGES.GRACE_EXCEEDS_INSTALLMENTS;
  }
  
  if (!formData.contract_date) {
    errors.contract_date = LOAN_ERROR_MESSAGES.CONTRACT_DATE_REQUIRED;
  }
  
  if (!formData.disbursement_date) {
    errors.disbursement_date = LOAN_ERROR_MESSAGES.DISBURSEMENT_DATE_REQUIRED;
  }
  
  if (!formData.first_due_date) {
    errors.first_due_date = LOAN_ERROR_MESSAGES.FIRST_DUE_DATE_REQUIRED;
  }
  
  // Date validations
  if (formData.contract_date && formData.first_due_date) {
    if (formData.first_due_date < formData.contract_date) {
      errors.first_due_date = LOAN_ERROR_MESSAGES.FIRST_DUE_BEFORE_CONTRACT;
    }
  }
  
  if (formData.contract_date && formData.disbursement_date) {
    if (formData.disbursement_date < formData.contract_date) {
      errors.disbursement_date = LOAN_ERROR_MESSAGES.DISBURSEMENT_BEFORE_CONTRACT;
    }
  }
  
  return errors;
}

// Check if contract can be edited
export function canEditContract(contract: LoanContract): { canEdit: boolean; reason?: string } {
  if (contract.status !== 'EDICAO') {
    return { canEdit: false, reason: `Contrato com status "${contract.status}" não pode ser editado.` };
  }
  
  if (contract.has_generated_titles) {
    return { canEdit: false, reason: LOAN_ERROR_MESSAGES.HAS_TITLES_CANNOT_EDIT };
  }
  
  return { canEdit: true };
}

// Check if structural fields can be edited
export function canEditStructuralFields(
  contract: LoanContract,
  hasInstallments: boolean
): { canEdit: boolean; reason?: string; requiresRecalc?: boolean } {
  if (contract.status !== 'EDICAO') {
    return { canEdit: false, reason: `Contrato com status "${contract.status}" não permite alterações estruturais.` };
  }
  
  if (contract.has_generated_titles) {
    return { canEdit: false, reason: LOAN_ERROR_MESSAGES.HAS_TITLES_CANNOT_EDIT };
  }
  
  if (hasInstallments) {
    return { 
      canEdit: true, 
      requiresRecalc: true, 
      reason: 'Alterações estruturais exigirão recálculo das parcelas.' 
    };
  }
  
  return { canEdit: true };
}

// Check if contract needs recalculation
export function needsRecalculation(contract: LoanContract): boolean {
  return contract.needs_recalc === true;
}

// Check if can calculate installments
export function canCalculateInstallments(
  contract: LoanContract
): { canCalculate: boolean; reason?: string } {
  if (contract.status !== 'EDICAO') {
    return { canCalculate: false, reason: 'Só é possível calcular parcelas de contratos em edição.' };
  }
  
  return { canCalculate: true };
}

// Check if can generate AP titles
export function canGenerateAPTitles(
  contract: LoanContract,
  pendingInstallmentsCount: number
): { canGenerate: boolean; reason?: string } {
  if (contract.needs_recalc) {
    return { canGenerate: false, reason: LOAN_ERROR_MESSAGES.NEEDS_RECALC };
  }
  
  if (pendingInstallmentsCount === 0) {
    return { canGenerate: false, reason: LOAN_ERROR_MESSAGES.NO_INSTALLMENTS_TO_GENERATE };
  }
  
  return { canGenerate: true };
}

// Check if can activate contract
export function canActivateContract(
  contract: LoanContract,
  hasInstallments: boolean
): { canActivate: boolean; reason?: string } {
  if (contract.status !== 'EDICAO') {
    return { canActivate: false, reason: 'Contrato já está ativo ou encerrado.' };
  }
  
  if (!hasInstallments) {
    return { canActivate: false, reason: LOAN_ERROR_MESSAGES.CANNOT_ACTIVATE_WITHOUT_INSTALLMENTS };
  }
  
  if (contract.needs_recalc) {
    return { canActivate: false, reason: LOAN_ERROR_MESSAGES.CANNOT_ACTIVATE_NEEDS_RECALC };
  }
  
  return { canActivate: true };
}

// Format validation errors for display
export function formatValidationErrors(errors: Record<string, string>): string {
  return Object.values(errors).filter(Boolean).join('. ');
}
