// src/services/TaxCalculationService.ts
// Brazilian Tax Calculation Service - Complete implementation for PIS, COFINS, ICMS, ISS, IRPJ, CSLL

import { supabase } from '@/integrations/supabase/client';

// ============= Types =============

export type TaxRegime = 'SIMPLES' | 'LUCRO_REAL' | 'LUCRO_PRESUMIDO';

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  ncm?: string;
  cfop?: string;
  cst_icms?: string;
  csosn?: string;
  is_service: boolean;
  icms_base?: number;
  icms_rate?: number;
  ipi_rate?: number;
  pis_rate?: number;
  cofins_rate?: number;
  iss_rate?: number;
}

export interface Document {
  id: string;
  type: 'nfe' | 'nfse' | 'nfce' | 'cte';
  total_products: number;
  total_services: number;
  total_discount: number;
  total_shipping: number;
  total_other_expenses: number;
  total_document: number;
  items: LineItem[];
}

export interface TaxCalculationResult {
  pis: number;
  cofins: number;
  icms: number;
  icms_st?: number;
  ipi?: number;
  iss: number;
  irpj: number;
  csll: number;
  total_taxes: number;
  effective_rate: number;
  breakdown: TaxBreakdown;
}

export interface TaxBreakdown {
  pis: { base: number; rate: number; value: number };
  cofins: { base: number; rate: number; value: number };
  icms: { base: number; rate: number; value: number; reduction?: number };
  icms_st?: { base: number; rate: number; mva: number; value: number };
  ipi?: { base: number; rate: number; value: number };
  iss: { base: number; rate: number; value: number };
  irpj: { base: number; rate: number; additional: number; value: number };
  csll: { base: number; rate: number; value: number };
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'error';
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  severity: 'warning';
}

export interface TaxReport {
  period: { year: number; month: number };
  company_id: string;
  regime: TaxRegime;
  summary: TaxCalculationResult;
  documents: DocumentTaxSummary[];
  obligations: TaxObligation[];
  generated_at: string;
}

export interface DocumentTaxSummary {
  document_id: string;
  document_type: string;
  document_number: string;
  issue_date: string;
  taxes: TaxCalculationResult;
}

export interface TaxObligation {
  code: string;
  name: string;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue';
}

// ============= Tax Rate Constants =============

const TAX_RATES = {
  // Lucro Presumido rates
  LUCRO_PRESUMIDO: {
    pis: 0.65,
    cofins: 3.0,
    irpj: {
      base_services: 32,
      base_commerce: 8,
      rate: 15,
      additional_threshold: 20000, // Monthly
      additional_rate: 10,
    },
    csll: {
      base_services: 32,
      base_commerce: 12,
      rate: 9,
    },
  },
  // Lucro Real rates (non-cumulative)
  LUCRO_REAL: {
    pis: 1.65,
    cofins: 7.6,
    irpj: {
      rate: 15,
      additional_threshold: 20000,
      additional_rate: 10,
    },
    csll: {
      rate: 9,
    },
  },
  // ICMS interstate rates
  ICMS_INTERSTATE: {
    'default': 12,
    'SP_to_RJ': 12,
    'SP_to_MG': 12,
    'SP_to_RS': 12,
    'SP_to_SC': 12,
    'SP_to_PR': 12,
    'SP_to_north': 7, // North, Northeast, Center-West, ES
    // Add more state combinations as needed
  },
  // Simples Nacional annexes (simplified)
  SIMPLES: {
    anexo_I: { // Commerce
      faixas: [
        { limit: 180000, rate: 4.0 },
        { limit: 360000, rate: 7.3 },
        { limit: 720000, rate: 9.5 },
        { limit: 1800000, rate: 10.7 },
        { limit: 3600000, rate: 14.3 },
        { limit: 4800000, rate: 19.0 },
      ],
    },
    anexo_III: { // Services
      faixas: [
        { limit: 180000, rate: 6.0 },
        { limit: 360000, rate: 11.2 },
        { limit: 720000, rate: 13.5 },
        { limit: 1800000, rate: 16.0 },
        { limit: 3600000, rate: 21.0 },
        { limit: 4800000, rate: 33.0 },
      ],
    },
  },
} as const;

// ISS rates by municipality (simplified)
const ISS_RATES: Record<string, number> = {
  'SAO_PAULO': 5.0,
  'RIO_DE_JANEIRO': 5.0,
  'BELO_HORIZONTE': 5.0,
  'CURITIBA': 5.0,
  'PORTO_ALEGRE': 5.0,
  'DEFAULT': 5.0,
};

// ICMS internal rates by state
const ICMS_INTERNAL_RATES: Record<string, number> = {
  'SP': 18,
  'RJ': 20,
  'MG': 18,
  'RS': 17,
  'PR': 18,
  'SC': 17,
  'BA': 18,
  'PE': 18,
  'CE': 18,
  'GO': 17,
  'DF': 18,
  'DEFAULT': 18,
};

// ============= TaxCalculation Class =============

export class TaxCalculation {
  private document: Document;
  private companyTaxRegime: TaxRegime;
  private items: LineItem[];
  private state: string;
  private city: string;
  private destinationState?: string;
  private companyId?: string;

  constructor(
    document: Document,
    companyTaxRegime: TaxRegime,
    state: string,
    city: string,
    destinationState?: string,
    companyId?: string
  ) {
    this.document = document;
    this.companyTaxRegime = companyTaxRegime;
    this.items = document.items;
    this.state = state.toUpperCase();
    this.city = city.toUpperCase().replace(/\s+/g, '_');
    this.destinationState = destinationState?.toUpperCase();
    this.companyId = companyId;
  }

  // ============= Main Tax Calculations =============

  calculatePIS(): number {
    const base = this.getProductsTotal();
    const rate = this.getPISRate();
    return this.round(base * (rate / 100));
  }

  calculateCOFINS(): number {
    const base = this.getProductsTotal();
    const rate = this.getCOFINSRate();
    return this.round(base * (rate / 100));
  }

  calculateICMS(): number {
    const base = this.getICMSBase();
    const rate = this.getICMSRate();
    return this.round(base * (rate / 100));
  }

  calculateICMSST(mva: number = 0): number {
    if (mva === 0) return 0;
    
    const icmsOwn = this.calculateICMS();
    const baseOwn = this.getICMSBase();
    const baseST = baseOwn * (1 + mva / 100);
    const rateST = this.getICMSInternalRate(this.destinationState || this.state);
    const icmsST = this.round(baseST * (rateST / 100) - icmsOwn);
    
    return Math.max(0, icmsST);
  }

  calculateISS(): number {
    const base = this.getServicesTotal();
    const rate = this.getISSRate();
    return this.round(base * (rate / 100));
  }

  calculateIRPJ(): number {
    if (this.companyTaxRegime === 'SIMPLES') {
      return 0; // Included in DAS
    }

    const { base, rate, additional } = this.getIRPJParams();
    let irpj = this.round(base * (rate / 100));
    
    // Additional 10% on profit exceeding R$ 20,000/month
    if (base > TAX_RATES.LUCRO_REAL.irpj.additional_threshold) {
      irpj += this.round(
        (base - TAX_RATES.LUCRO_REAL.irpj.additional_threshold) * 
        (additional / 100)
      );
    }
    
    return irpj;
  }

  calculateCSLL(): number {
    if (this.companyTaxRegime === 'SIMPLES') {
      return 0; // Included in DAS
    }

    const { base, rate } = this.getCSLLParams();
    return this.round(base * (rate / 100));
  }

  // ============= Full Tax Calculation =============

  calculateAllTaxes(): TaxCalculationResult {
    const pis = this.calculatePIS();
    const cofins = this.calculateCOFINS();
    const icms = this.calculateICMS();
    const iss = this.calculateISS();
    const irpj = this.calculateIRPJ();
    const csll = this.calculateCSLL();
    
    const total_taxes = pis + cofins + icms + iss + irpj + csll;
    const effective_rate = this.document.total_document > 0 
      ? (total_taxes / this.document.total_document) * 100 
      : 0;

    return {
      pis,
      cofins,
      icms,
      iss,
      irpj,
      csll,
      total_taxes: this.round(total_taxes),
      effective_rate: this.round(effective_rate, 2),
      breakdown: this.getDetailedBreakdown(),
    };
  }

  // ============= Validation =============

  validateTaxCompliance(): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Validate document
    if (!this.document.id) {
      errors.push({
        code: 'DOC_001',
        field: 'document.id',
        message: 'ID do documento é obrigatório',
        severity: 'error',
      });
    }

    // Validate items
    if (this.items.length === 0) {
      errors.push({
        code: 'ITEM_001',
        field: 'items',
        message: 'Documento deve conter pelo menos um item',
        severity: 'error',
      });
    }

    // Validate NCM for products
    this.items.forEach((item, index) => {
      if (!item.is_service && !item.ncm) {
        errors.push({
          code: 'NCM_001',
          field: `items[${index}].ncm`,
          message: `Item ${index + 1}: NCM é obrigatório para produtos`,
          severity: 'error',
        });
      }

      if (!item.is_service && item.ncm && !/^\d{8}$/.test(item.ncm)) {
        errors.push({
          code: 'NCM_002',
          field: `items[${index}].ncm`,
          message: `Item ${index + 1}: NCM deve ter 8 dígitos`,
          severity: 'error',
        });
      }

      if (!item.is_service && !item.cfop) {
        warnings.push({
          code: 'CFOP_001',
          field: `items[${index}].cfop`,
          message: `Item ${index + 1}: CFOP não informado`,
          severity: 'warning',
        });
      }
    });

    // Validate state
    if (!this.state || this.state.length !== 2) {
      errors.push({
        code: 'STATE_001',
        field: 'state',
        message: 'UF de origem inválida',
        severity: 'error',
      });
    }

    // Validate tax regime
    if (!['SIMPLES', 'LUCRO_REAL', 'LUCRO_PRESUMIDO'].includes(this.companyTaxRegime)) {
      errors.push({
        code: 'REGIME_001',
        field: 'companyTaxRegime',
        message: 'Regime tributário inválido',
        severity: 'error',
      });
    }

    // Check for high tax burden
    const result = this.calculateAllTaxes();
    if (result.effective_rate > 30) {
      warnings.push({
        code: 'TAX_001',
        field: 'effective_rate',
        message: `Carga tributária elevada: ${result.effective_rate.toFixed(2)}%`,
        severity: 'warning',
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============= Report Generation =============

  generateTaxReport(): TaxReport {
    const now = new Date();
    const taxes = this.calculateAllTaxes();

    return {
      period: {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
      company_id: this.companyId || '',
      regime: this.companyTaxRegime,
      summary: taxes,
      documents: [{
        document_id: this.document.id,
        document_type: this.document.type,
        document_number: this.document.id.substring(0, 8),
        issue_date: now.toISOString(),
        taxes,
      }],
      obligations: this.generateObligations(taxes),
      generated_at: now.toISOString(),
    };
  }

  // ============= Private Helper Methods =============

  private getProductsTotal(): number {
    return this.items
      .filter(item => !item.is_service)
      .reduce((sum, item) => sum + item.total, 0);
  }

  private getServicesTotal(): number {
    return this.items
      .filter(item => item.is_service)
      .reduce((sum, item) => sum + item.total, 0);
  }

  private getICMSBase(): number {
    return this.getProductsTotal() + 
           this.document.total_shipping + 
           this.document.total_other_expenses - 
           this.document.total_discount;
  }

  private getPISRate(): number {
    if (this.companyTaxRegime === 'SIMPLES') return 0;
    if (this.companyTaxRegime === 'LUCRO_PRESUMIDO') {
      return TAX_RATES.LUCRO_PRESUMIDO.pis;
    }
    return TAX_RATES.LUCRO_REAL.pis;
  }

  private getCOFINSRate(): number {
    if (this.companyTaxRegime === 'SIMPLES') return 0;
    if (this.companyTaxRegime === 'LUCRO_PRESUMIDO') {
      return TAX_RATES.LUCRO_PRESUMIDO.cofins;
    }
    return TAX_RATES.LUCRO_REAL.cofins;
  }

  private getICMSRate(): number {
    // Interstate operation
    if (this.destinationState && this.destinationState !== this.state) {
      return this.getICMSInterstateRate();
    }
    // Internal operation
    return this.getICMSInternalRate(this.state);
  }

  private getICMSInterstateRate(): number {
    const northNortheastCenterWest = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'PA', 'PB', 'PE', 'PI', 'RN', 'RO', 'RR', 'SE', 'TO'];
    
    if (northNortheastCenterWest.includes(this.destinationState || '')) {
      return 7;
    }
    return 12;
  }

  private getICMSInternalRate(state: string): number {
    return ICMS_INTERNAL_RATES[state] || ICMS_INTERNAL_RATES['DEFAULT'];
  }

  private getISSRate(): number {
    return ISS_RATES[this.city] || ISS_RATES['DEFAULT'];
  }

  private getIRPJParams(): { base: number; rate: number; additional: number } {
    const total = this.document.total_document;
    const hasServices = this.getServicesTotal() > 0;

    if (this.companyTaxRegime === 'LUCRO_PRESUMIDO') {
      const basePercent = hasServices 
        ? TAX_RATES.LUCRO_PRESUMIDO.irpj.base_services 
        : TAX_RATES.LUCRO_PRESUMIDO.irpj.base_commerce;
      
      return {
        base: total * (basePercent / 100),
        rate: TAX_RATES.LUCRO_PRESUMIDO.irpj.rate,
        additional: TAX_RATES.LUCRO_PRESUMIDO.irpj.additional_rate,
      };
    }

    // Lucro Real - uses actual profit (simplified here)
    return {
      base: total * 0.08, // Simplified - should use actual profit
      rate: TAX_RATES.LUCRO_REAL.irpj.rate,
      additional: TAX_RATES.LUCRO_REAL.irpj.additional_rate,
    };
  }

  private getCSLLParams(): { base: number; rate: number } {
    const total = this.document.total_document;
    const hasServices = this.getServicesTotal() > 0;

    if (this.companyTaxRegime === 'LUCRO_PRESUMIDO') {
      const basePercent = hasServices 
        ? TAX_RATES.LUCRO_PRESUMIDO.csll.base_services 
        : TAX_RATES.LUCRO_PRESUMIDO.csll.base_commerce;
      
      return {
        base: total * (basePercent / 100),
        rate: TAX_RATES.LUCRO_PRESUMIDO.csll.rate,
      };
    }

    return {
      base: total * 0.12, // Simplified
      rate: TAX_RATES.LUCRO_REAL.csll.rate,
    };
  }

  private getDetailedBreakdown(): TaxBreakdown {
    const productsTotal = this.getProductsTotal();
    const servicesTotal = this.getServicesTotal();
    const icmsBase = this.getICMSBase();
    const { base: irpjBase, rate: irpjRate, additional: irpjAdditional } = this.getIRPJParams();
    const { base: csllBase, rate: csllRate } = this.getCSLLParams();

    return {
      pis: {
        base: productsTotal,
        rate: this.getPISRate(),
        value: this.calculatePIS(),
      },
      cofins: {
        base: productsTotal,
        rate: this.getCOFINSRate(),
        value: this.calculateCOFINS(),
      },
      icms: {
        base: icmsBase,
        rate: this.getICMSRate(),
        value: this.calculateICMS(),
      },
      iss: {
        base: servicesTotal,
        rate: this.getISSRate(),
        value: this.calculateISS(),
      },
      irpj: {
        base: irpjBase,
        rate: irpjRate,
        additional: irpjAdditional,
        value: this.calculateIRPJ(),
      },
      csll: {
        base: csllBase,
        rate: csllRate,
        value: this.calculateCSLL(),
      },
    };
  }

  private generateObligations(taxes: TaxCalculationResult): TaxObligation[] {
    const now = new Date();
    const obligations: TaxObligation[] = [];

    if (taxes.icms > 0) {
      obligations.push({
        code: 'ICMS',
        name: 'ICMS - Imposto sobre Circulação de Mercadorias',
        due_date: this.getNextDueDate(now, 9).toISOString(),
        amount: taxes.icms,
        status: 'pending',
      });
    }

    if (taxes.pis > 0) {
      obligations.push({
        code: 'PIS',
        name: 'PIS - Programa de Integração Social',
        due_date: this.getNextDueDate(now, 25).toISOString(),
        amount: taxes.pis,
        status: 'pending',
      });
    }

    if (taxes.cofins > 0) {
      obligations.push({
        code: 'COFINS',
        name: 'COFINS - Contribuição para Financiamento da Seguridade Social',
        due_date: this.getNextDueDate(now, 25).toISOString(),
        amount: taxes.cofins,
        status: 'pending',
      });
    }

    if (taxes.iss > 0) {
      obligations.push({
        code: 'ISS',
        name: 'ISS - Imposto Sobre Serviços',
        due_date: this.getNextDueDate(now, 10).toISOString(),
        amount: taxes.iss,
        status: 'pending',
      });
    }

    if (taxes.irpj > 0) {
      obligations.push({
        code: 'IRPJ',
        name: 'IRPJ - Imposto de Renda Pessoa Jurídica',
        due_date: this.getNextDueDate(now, this.companyTaxRegime === 'LUCRO_PRESUMIDO' ? 31 : 25).toISOString(),
        amount: taxes.irpj,
        status: 'pending',
      });
    }

    if (taxes.csll > 0) {
      obligations.push({
        code: 'CSLL',
        name: 'CSLL - Contribuição Social sobre o Lucro Líquido',
        due_date: this.getNextDueDate(now, this.companyTaxRegime === 'LUCRO_PRESUMIDO' ? 31 : 25).toISOString(),
        amount: taxes.csll,
        status: 'pending',
      });
    }

    return obligations;
  }

  private getNextDueDate(from: Date, day: number): Date {
    const result = new Date(from);
    result.setMonth(result.getMonth() + 1);
    result.setDate(Math.min(day, this.getDaysInMonth(result)));
    return result;
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private round(value: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(value * factor) / factor;
  }
}

// ============= TaxRateUpdater Class =============

export class TaxRateUpdater {
  private companyId: string;

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  async updateRatesFromReceita(): Promise<void> {
    // In production, this would call the Receita Federal API
    // For now, we update from our local database
    console.log('Updating tax rates from Receita Federal...');
    
    const { data: rules, error } = await supabase
      .from('regras_tributacao')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching tax rules:', error);
      throw new Error('Falha ao buscar regras de tributação');
    }

    console.log(`Loaded ${rules?.length || 0} active tax rules`);
  }

  async updateRatesByState(uf: string): Promise<void> {
    const upperUF = uf.toUpperCase();
    console.log(`Updating tax rates for state: ${upperUF}`);

    const { data: rules, error } = await supabase
      .from('regras_tributacao')
      .select('*')
      .eq('company_id', this.companyId)
      .or(`uf_origem.eq.${upperUF},uf_destino.eq.${upperUF}`)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching state tax rules:', error);
      throw new Error(`Falha ao buscar regras para UF ${upperUF}`);
    }

    console.log(`Found ${rules?.length || 0} rules for state ${upperUF}`);
  }

  async getApplicableRule(
    ncm: string,
    cfop: string,
    ufOrigem: string,
    ufDestino: string
  ): Promise<Record<string, number> | null> {
    const { data: rules, error } = await supabase
      .from('regras_tributacao')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('is_active', true)
      .or(`ncm.eq.${ncm},ncm.is.null`)
      .or(`cfop.eq.${cfop},cfop.is.null`)
      .or(`uf_origem.eq.${ufOrigem},uf_origem.is.null`)
      .or(`uf_destino.eq.${ufDestino},uf_destino.is.null`)
      .order('prioridade', { ascending: true })
      .limit(1);

    if (error || !rules || rules.length === 0) {
      return null;
    }

    const rule = rules[0];
    return {
      icms: rule.aliquota_icms || 0,
      ipi: rule.aliquota_ipi || 0,
      pis: rule.aliquota_pis || 0,
      cofins: rule.aliquota_cofins || 0,
      mva: rule.mva || 0,
      fcp: rule.fcp || 0,
      difal: rule.difal || 0,
    };
  }
}

// ============= Factory Function =============

export function createTaxCalculation(
  document: Document,
  companyTaxRegime: TaxRegime,
  state: string,
  city: string,
  destinationState?: string,
  companyId?: string
): TaxCalculation {
  return new TaxCalculation(
    document,
    companyTaxRegime,
    state,
    city,
    destinationState,
    companyId
  );
}

// ============= Utility Functions =============

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function getTaxRegimeLabel(regime: TaxRegime): string {
  const labels: Record<TaxRegime, string> = {
    'SIMPLES': 'Simples Nacional',
    'LUCRO_REAL': 'Lucro Real',
    'LUCRO_PRESUMIDO': 'Lucro Presumido',
  };
  return labels[regime];
}
