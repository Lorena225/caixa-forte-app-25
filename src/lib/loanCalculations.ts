import { addMonths, addDays, addYears } from 'date-fns';
import type { 
  AmortizationSystem, 
  RatePeriod, 
  InstallmentPeriod, 
  GraceType,
  CalculatedInstallment 
} from '@/types/loans';

interface CalculationParams {
  principal: number;
  nominalRate: number;
  ratePeriod: RatePeriod;
  installmentsCount: number;
  installmentPeriod: InstallmentPeriod;
  amortizationSystem: AmortizationSystem;
  gracePeriods: number;
  graceType: GraceType;
  firstDueDate: Date;
}

// Convert rate to period rate
function convertRateToPeriod(
  rate: number, 
  fromPeriod: RatePeriod, 
  toPeriod: InstallmentPeriod
): number {
  // Periods per year
  const periodsPerYear: Record<InstallmentPeriod, number> = {
    'MENSAL': 12,
    'BIMESTRAL': 6,
    'TRIMESTRAL': 4,
    'ANUAL': 1,
  };

  let annualRate: number;
  
  // Convert to annual rate first
  switch (fromPeriod) {
    case 'MES':
      annualRate = Math.pow(1 + rate, 12) - 1;
      break;
    case 'ANO':
      annualRate = rate;
      break;
    case 'DIA':
      annualRate = Math.pow(1 + rate, 365) - 1;
      break;
    default:
      annualRate = rate;
  }

  // Convert from annual to target period
  const targetPeriods = periodsPerYear[toPeriod];
  return Math.pow(1 + annualRate, 1 / targetPeriods) - 1;
}

// Add periods to date
function addPeriods(date: Date, periods: number, periodType: InstallmentPeriod): Date {
  switch (periodType) {
    case 'MENSAL':
      return addMonths(date, periods);
    case 'BIMESTRAL':
      return addMonths(date, periods * 2);
    case 'TRIMESTRAL':
      return addMonths(date, periods * 3);
    case 'ANUAL':
      return addYears(date, periods);
    default:
      return addMonths(date, periods);
  }
}

// Round to 2 decimal places (centavos)
function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

// Calculate SAC installments
function calculateSAC(params: CalculationParams): CalculatedInstallment[] {
  const { 
    principal, 
    nominalRate, 
    ratePeriod, 
    installmentsCount, 
    installmentPeriod,
    gracePeriods,
    graceType,
    firstDueDate 
  } = params;

  const periodRate = convertRateToPeriod(nominalRate, ratePeriod, installmentPeriod);
  const installments: CalculatedInstallment[] = [];
  
  // In SAC, amortization is constant
  const effectiveInstallments = installmentsCount - gracePeriods;
  const constantAmortization = roundCurrency(principal / effectiveInstallments);
  
  let balance = principal;

  for (let k = 1; k <= installmentsCount; k++) {
    const dueDate = addPeriods(firstDueDate, k - 1, installmentPeriod);
    const isGracePeriod = k <= gracePeriods;
    
    let interest = roundCurrency(balance * periodRate);
    let amortization: number;
    let installmentAmount: number;
    
    if (isGracePeriod) {
      switch (graceType) {
        case 'SO_JUROS':
          // Only interest, no amortization
          amortization = 0;
          installmentAmount = interest;
          break;
        case 'TOTAL':
          // No payment at all (balance stays the same)
          amortization = 0;
          interest = 0;
          installmentAmount = 0;
          break;
        default:
          // SEM_CARENCIA - should not happen
          amortization = constantAmortization;
          installmentAmount = amortization + interest;
      }
    } else {
      amortization = constantAmortization;
      installmentAmount = roundCurrency(amortization + interest);
    }
    
    // Adjust last installment for rounding differences
    if (k === installmentsCount && amortization > 0) {
      amortization = roundCurrency(balance);
      installmentAmount = roundCurrency(amortization + interest);
    }
    
    balance = roundCurrency(balance - amortization);
    
    installments.push({
      installment_no: k,
      due_date: dueDate.toISOString().split('T')[0],
      installment_amount: installmentAmount,
      interest_amount: interest,
      amortization_amount: amortization,
      remaining_balance: Math.max(0, balance),
    });
  }

  return installments;
}

// Calculate PRICE installments (French amortization)
function calculatePrice(params: CalculationParams): CalculatedInstallment[] {
  const { 
    principal, 
    nominalRate, 
    ratePeriod, 
    installmentsCount, 
    installmentPeriod,
    gracePeriods,
    graceType,
    firstDueDate 
  } = params;

  const periodRate = convertRateToPeriod(nominalRate, ratePeriod, installmentPeriod);
  const installments: CalculatedInstallment[] = [];
  
  // Effective installments (excluding grace)
  const effectiveInstallments = installmentsCount - gracePeriods;
  
  // PRICE formula: PMT = PV * i / (1 - (1 + i)^(-n))
  const pmt = principal * periodRate / (1 - Math.pow(1 + periodRate, -effectiveInstallments));
  const constantPayment = roundCurrency(pmt);
  
  let balance = principal;

  for (let k = 1; k <= installmentsCount; k++) {
    const dueDate = addPeriods(firstDueDate, k - 1, installmentPeriod);
    const isGracePeriod = k <= gracePeriods;
    
    let interest = roundCurrency(balance * periodRate);
    let amortization: number;
    let installmentAmount: number;
    
    if (isGracePeriod) {
      switch (graceType) {
        case 'SO_JUROS':
          amortization = 0;
          installmentAmount = interest;
          break;
        case 'TOTAL':
          amortization = 0;
          interest = 0;
          installmentAmount = 0;
          break;
        default:
          amortization = roundCurrency(constantPayment - interest);
          installmentAmount = constantPayment;
      }
    } else {
      amortization = roundCurrency(constantPayment - interest);
      installmentAmount = constantPayment;
    }
    
    // Adjust last installment for rounding differences
    if (k === installmentsCount && amortization > 0) {
      amortization = roundCurrency(balance);
      installmentAmount = roundCurrency(amortization + interest);
    }
    
    balance = roundCurrency(balance - amortization);
    
    installments.push({
      installment_no: k,
      due_date: dueDate.toISOString().split('T')[0],
      installment_amount: installmentAmount,
      interest_amount: interest,
      amortization_amount: amortization,
      remaining_balance: Math.max(0, balance),
    });
  }

  return installments;
}

// Main calculation function
export function calculateInstallments(params: CalculationParams): CalculatedInstallment[] {
  if (params.amortizationSystem === 'SAC') {
    return calculateSAC(params);
  } else {
    return calculatePrice(params);
  }
}

// Validate calculation params
export function validateCalculationParams(params: Partial<CalculationParams>): string[] {
  const errors: string[] = [];
  
  if (!params.principal || params.principal <= 0) {
    errors.push('Valor principal deve ser maior que zero');
  }
  
  if (params.nominalRate === undefined || params.nominalRate < 0) {
    errors.push('Taxa nominal deve ser maior ou igual a zero');
  }
  
  if (!params.installmentsCount || params.installmentsCount <= 0) {
    errors.push('Número de parcelas deve ser maior que zero');
  }
  
  if (params.gracePeriods && params.gracePeriods >= (params.installmentsCount || 0)) {
    errors.push('Período de carência deve ser menor que o número de parcelas');
  }
  
  if (!params.firstDueDate) {
    errors.push('Data do primeiro vencimento é obrigatória');
  }
  
  return errors;
}

// Format rate for display
export function formatRate(rate: number, period: RatePeriod): string {
  const percentage = rate * 100;
  const periodLabel = {
    'MES': 'a.m.',
    'ANO': 'a.a.',
    'DIA': 'a.d.',
  }[period];
  
  return `${percentage.toFixed(2)}% ${periodLabel}`;
}

// Format currency for display
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
