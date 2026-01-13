// Loan Contract Types
export type LoanOperationType = 'EMPRESTIMO' | 'FINANCIAMENTO' | 'CONTA_GARANTIDA' | 'OUTRO';
export type LoanContractStatus = 'EDICAO' | 'ATIVO' | 'ENCERRADO' | 'CANCELADO';
export type AmortizationSystem = 'SAC' | 'PRICE';
export type RateType = 'FIXA' | 'INDEXADA';
export type RateIndex = 'CDI' | 'IPCA' | 'SELIC' | 'OUTRO';
export type RatePeriod = 'MES' | 'ANO' | 'DIA';
export type GraceType = 'SEM_CARENCIA' | 'SO_JUROS' | 'TOTAL';
export type InstallmentPeriod = 'MENSAL' | 'BIMESTRAL' | 'TRIMESTRAL' | 'ANUAL';
export type LoanInstallmentStatus = 'PREVISTA' | 'GERADA' | 'BAIXADA' | 'RENEGOCIADA' | 'CANCELADA';

export interface LoanContractType {
  id: string;
  company_id: string;
  name: string;
  default_amortization: AmortizationSystem;
  default_liability_account_id?: string;
  default_interest_expense_account_id?: string;
  default_cost_center_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoanContract {
  id: string;
  company_id: string;
  contract_type_id?: string;
  contract_number: string;
  operation_type: LoanOperationType;
  status: LoanContractStatus;
  
  // Parties
  creditor_partner_id: string;
  bank_id: string;
  company_bank_account_id: string;
  
  // Conditions
  principal_amount: number;
  currency: string;
  amortization_system: AmortizationSystem;
  rate_type: RateType;
  rate_index?: RateIndex;
  nominal_rate: number;
  rate_period: RatePeriod;
  grace_periods: number;
  grace_type: GraceType;
  installments_count: number;
  installment_period: InstallmentPeriod;
  
  // Dates
  contract_date: string;
  disbursement_date: string;
  first_due_date: string;
  
  // Accounting Integration
  liability_account_id?: string;
  interest_expense_account_id?: string;
  cost_center_id?: string;
  
  // AP Generation Parameters
  ap_title_type: string;
  ap_series?: string;
  description_template?: string;
  payment_bank_account_id?: string;
  
  // Controls
  opening_balance?: number;
  allow_recalculate: boolean;
  notes?: string;
  
  created_at: string;
  updated_at: string;
  created_by?: string;
  
  // Relations (populated on fetch)
  creditor?: {
    id: string;
    name: string;
    document?: string;
  };
  bank?: {
    id: string;
    name: string;
    compe_code: string;
  };
  bank_account?: {
    id: string;
    account_number: string;
    agency_number: string;
  };
  installments_summary?: {
    total: number;
    generated: number;
    paid: number;
    next_due_date?: string;
    remaining_balance?: number;
  };
}

export interface LoanInstallment {
  id: string;
  company_id: string;
  contract_id: string;
  installment_no: number;
  due_date: string;
  installment_amount: number;
  interest_amount: number;
  amortization_amount: number;
  remaining_balance: number;
  status: LoanInstallmentStatus;
  ap_transaction_id?: string;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CalculatedInstallment {
  installment_no: number;
  due_date: string;
  installment_amount: number;
  interest_amount: number;
  amortization_amount: number;
  remaining_balance: number;
}

export interface LoanContractFormData {
  contract_number: string;
  operation_type: LoanOperationType;
  creditor_partner_id: string;
  bank_id: string;
  company_bank_account_id: string;
  principal_amount: number;
  amortization_system: AmortizationSystem;
  rate_type: RateType;
  rate_index?: RateIndex;
  nominal_rate: number;
  rate_period: RatePeriod;
  grace_periods: number;
  grace_type: GraceType;
  installments_count: number;
  installment_period: InstallmentPeriod;
  contract_date: string;
  disbursement_date: string;
  first_due_date: string;
  cost_center_id?: string;
  payment_bank_account_id?: string;
  notes?: string;
}

export interface GenerateAPParams {
  contract_id: string;
  max_installment?: number;
  max_date?: string;
}
