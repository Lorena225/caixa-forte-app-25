// src/services/AutomaticAccountingService.ts
// Automatic Accounting Service - Journal Entry Automation, Posting Rules, and Accruals

import { supabase } from '@/integrations/supabase/client';

// ============= Core Types =============

export type AccountType = 'A' | 'P' | 'PL' | 'R' | 'D'; // Ativo, Passivo, Patrimônio Líquido, Receita, Despesa
export type NatureBalance = 'D' | 'C'; // Débito, Crédito

export type TriggerType = 
  | 'INVOICE_ISSUED' 
  | 'PAYMENT_RECEIVED' 
  | 'EXPENSE_PAID' 
  | 'BANK_TXN' 
  | 'ACCRUAL'
  | 'MONTH_END'
  | 'DEPRECIATION'
  | 'PROVISION';

export type EntryStatus = 'draft' | 'pending_approval' | 'approved' | 'posted' | 'reversed';

export interface AnalyticalAccount {
  id: string;
  code: string;
  name: string;
  parent_id: string | null;
  level: number;
  allows_posting: boolean;
  normal_balance: NatureBalance;
  is_active: boolean;
}

export interface AnalyticalAccountSet {
  id: string;
  name: string;
  accounts: AnalyticalAccountAllocation[];
}

export interface AnalyticalAccountAllocation {
  account_id: string;
  percentage: number;
  fixed_value?: number;
}

export interface AccountingRule {
  id: string;
  name: string;
  condition: RuleCondition;
  debit_account_code: string;
  credit_account_code: string;
  value_type: 'percentage' | 'fixed' | 'full_value';
  value: number;
  priority: number;
  is_active: boolean;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[];
}

export interface ChartOfAccounts {
  id: string;
  company_id: string;
  accounts: AccountNode[];
  settings: ChartSettings;
}

export interface AccountNode {
  id: string;
  code: string;
  name: string;
  account_type: AccountType;
  nature_balance: NatureBalance;
  parent_id: string | null;
  level: number;
  allows_posting: boolean;
  children: AccountNode[];
  rules: AccountingRule[];
}

export interface ChartSettings {
  posting_policy: 'leaf_only' | 'leaf_or_flag' | 'any';
  max_code_length: number;
  separator: string;
}

// ============= Journal Entry Types =============

export interface JournalEntry {
  id: string;
  company_id: string;
  entry_number: string;
  entry_date: string;
  posting_date: string;
  description: string;
  source_type: string;
  source_id?: string;
  status: EntryStatus;
  total_debit: number;
  total_credit: number;
  lines: JournalLine[];
  notes?: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
}

export interface JournalLine {
  id?: string;
  journal_entry_id?: string;
  line_number: number;
  account_id: string;
  account_code?: string;
  account_name?: string;
  debit_amount: number;
  credit_amount: number;
  description?: string;
  cost_center_id?: string;
  counterparty_id?: string;
  document_number?: string;
}

export interface JournalEntryTemplate {
  id: string;
  company_id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  rules: TemplateRule[];
  auto_generate: boolean;
  requires_approval: boolean;
  is_active: boolean;
  created_at: string;
}

export interface TemplateRule {
  condition: string;
  debit_account: string;
  debit_value: number | 'full' | 'calculated';
  credit_account: string;
  credit_value: number | 'full' | 'calculated';
  calculation_type?: 'percentage' | 'fixed' | 'formula';
  calculation_base?: string;
  analytical_account_set?: AnalyticalAccountSet;
}

// ============= Source Document Types =============

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  counterparty_id: string;
  counterparty_name: string;
  issue_date: string;
  due_date: string;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  status: string;
  items: InvoiceItem[];
  cost_center_id?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
  account_id?: string;
  tax_rate?: number;
}

export interface Payment {
  id: string;
  company_id: string;
  payment_date: string;
  amount: number;
  discount_amount: number;
  interest_amount: number;
  net_amount: number;
  payment_method: string;
  bank_account_id?: string;
  transaction_id?: string;
  cost_center_id?: string;
}

export interface Expense {
  id: string;
  company_id: string;
  expense_date: string;
  description: string;
  amount: number;
  tax_amount: number;
  net_amount: number;
  vendor_id: string;
  vendor_name: string;
  category_id?: string;
  cost_center_id?: string;
  document_number?: string;
}

// ============= Default Account Codes (Brazilian Standard) =============

const DEFAULT_ACCOUNTS = {
  // Assets (Ativo)
  CAIXA: '1.1.1.01',
  BANCOS: '1.1.1.02',
  CLIENTES: '1.1.2.01',
  ESTOQUES: '1.1.3.01',
  ADIANTAMENTOS: '1.1.4.01',
  DESPESAS_ANTECIPADAS: '1.1.5.01',
  
  // Liabilities (Passivo)
  FORNECEDORES: '2.1.1.01',
  IMPOSTOS_A_PAGAR: '2.1.2.01',
  SALARIOS_A_PAGAR: '2.1.3.01',
  PROVISOES: '2.1.4.01',
  RECEITAS_ANTECIPADAS: '2.1.5.01',
  
  // Equity (Patrimônio Líquido)
  CAPITAL_SOCIAL: '3.1.1.01',
  RESERVAS: '3.2.1.01',
  LUCROS_ACUMULADOS: '3.3.1.01',
  
  // Revenue (Receita)
  RECEITA_VENDAS: '4.1.1.01',
  RECEITA_SERVICOS: '4.1.2.01',
  RECEITAS_FINANCEIRAS: '4.2.1.01',
  OUTRAS_RECEITAS: '4.3.1.01',
  
  // Expenses (Despesa)
  CMV: '5.1.1.01',
  DESPESAS_OPERACIONAIS: '5.2.1.01',
  DESPESAS_FINANCEIRAS: '5.2.2.01',
  DESPESAS_TRIBUTARIAS: '5.2.3.01',
  DEPRECIACAO: '5.2.4.01',
  DESPESAS_PESSOAL: '5.2.5.01',
} as const;

// ============= JournalEntryAutomation Class =============

export class JournalEntryAutomation {
  private companyId: string;
  private templates: Map<TriggerType, JournalEntryTemplate[]> = new Map();
  private accountCache: Map<string, string> = new Map(); // code -> id

  constructor(companyId: string) {
    this.companyId = companyId;
  }

  // ============= Initialization =============

  async initialize(): Promise<void> {
    await Promise.all([
      this.loadTemplates(),
      this.loadAccountCache(),
    ]);
  }

  private async loadTemplates(): Promise<void> {
    const { data, error } = await supabase
      .from('posting_rules')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load posting rules:', error);
      return;
    }

    // Group by source_type (trigger)
    for (const rule of data || []) {
      const trigger = this.mapSourceTypeToTrigger(rule.source_type);
      const template = this.ruleToTemplate(rule);
      
      if (!this.templates.has(trigger)) {
        this.templates.set(trigger, []);
      }
      this.templates.get(trigger)!.push(template);
    }
  }

  private async loadAccountCache(): Promise<void> {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, code')
      .eq('company_id', this.companyId)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to load accounts:', error);
      return;
    }

    for (const account of data || []) {
      this.accountCache.set(account.code, account.id);
    }
  }

  private mapSourceTypeToTrigger(sourceType: string): TriggerType {
    const mapping: Record<string, TriggerType> = {
      'ar_receipt': 'PAYMENT_RECEIVED',
      'ap_payment': 'EXPENSE_PAID',
      'bank_fee': 'BANK_TXN',
      'interest': 'BANK_TXN',
      'discount': 'PAYMENT_RECEIVED',
      'tax': 'INVOICE_ISSUED',
    };
    return mapping[sourceType] || 'BANK_TXN';
  }

  private ruleToTemplate(rule: any): JournalEntryTemplate {
    return {
      id: rule.id,
      company_id: rule.company_id,
      name: rule.name,
      description: rule.description_template || '',
      trigger: this.mapSourceTypeToTrigger(rule.source_type),
      rules: [{
        condition: 'true',
        debit_account: rule.debit_account_id,
        debit_value: 'full',
        credit_account: rule.credit_account_id,
        credit_value: 'full',
      }],
      auto_generate: true,
      requires_approval: false,
      is_active: rule.is_active,
      created_at: rule.created_at,
    };
  }

  // ============= Event Handlers =============

  async onInvoiceIssued(invoice: Invoice): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    const entryDate = invoice.issue_date;

    // Main entry: Debit Clientes (A/R), Credit Receita
    const mainEntry = await this.createJournalEntry({
      entry_date: entryDate,
      description: `NF ${invoice.invoice_number} - ${invoice.counterparty_name}`,
      source_type: 'customer_invoice',
      source_id: invoice.id,
      lines: [
        {
          line_number: 1,
          account_id: await this.getAccountId(DEFAULT_ACCOUNTS.CLIENTES),
          debit_amount: invoice.total_amount,
          credit_amount: 0,
          description: `A receber - ${invoice.counterparty_name}`,
          counterparty_id: invoice.counterparty_id,
          cost_center_id: invoice.cost_center_id,
        },
        {
          line_number: 2,
          account_id: await this.getAccountId(DEFAULT_ACCOUNTS.RECEITA_VENDAS),
          debit_amount: 0,
          credit_amount: invoice.net_amount,
          description: `Receita de vendas`,
          cost_center_id: invoice.cost_center_id,
        },
      ],
    });

    if (mainEntry) entries.push(mainEntry);

    // If there are taxes, create tax entry
    if (invoice.tax_amount > 0) {
      const taxEntry = await this.createJournalEntry({
        entry_date: entryDate,
        description: `Impostos NF ${invoice.invoice_number}`,
        source_type: 'tax_provision',
        source_id: invoice.id,
        lines: [
          {
            line_number: 1,
            account_id: await this.getAccountId(DEFAULT_ACCOUNTS.DESPESAS_TRIBUTARIAS),
            debit_amount: invoice.tax_amount,
            credit_amount: 0,
            description: 'Impostos sobre vendas',
          },
          {
            line_number: 2,
            account_id: await this.getAccountId(DEFAULT_ACCOUNTS.IMPOSTOS_A_PAGAR),
            debit_amount: 0,
            credit_amount: invoice.tax_amount,
            description: 'Impostos a recolher',
          },
        ],
      });

      if (taxEntry) entries.push(taxEntry);
    }

    return entries;
  }

  async onPaymentReceived(payment: Payment): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    const entryDate = payment.payment_date;

    // Main entry: Debit Banco, Credit Clientes
    const lines: Omit<JournalLine, 'id' | 'journal_entry_id'>[] = [
      {
        line_number: 1,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.BANCOS),
        debit_amount: payment.net_amount,
        credit_amount: 0,
        description: `Recebimento - ${payment.payment_method}`,
        cost_center_id: payment.cost_center_id,
      },
      {
        line_number: 2,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.CLIENTES),
        debit_amount: 0,
        credit_amount: payment.amount,
        description: 'Baixa de duplicata',
        cost_center_id: payment.cost_center_id,
      },
    ];

    let lineNumber = 3;

    // Discount given
    if (payment.discount_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.DESPESAS_FINANCEIRAS),
        debit_amount: payment.discount_amount,
        credit_amount: 0,
        description: 'Desconto concedido',
      });
    }

    // Interest received
    if (payment.interest_amount > 0) {
      lines.push({
        line_number: lineNumber++,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.RECEITAS_FINANCEIRAS),
        debit_amount: 0,
        credit_amount: payment.interest_amount,
        description: 'Juros recebidos',
      });
    }

    const entry = await this.createJournalEntry({
      entry_date: entryDate,
      description: `Recebimento ${payment.payment_method}`,
      source_type: 'receipt',
      source_id: payment.id,
      lines,
    });

    if (entry) entries.push(entry);

    return entries;
  }

  async onExpensePaid(expense: Expense): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    const entryDate = expense.expense_date;

    // Entry: Debit Despesa, Credit Fornecedor ou Banco
    const lines: Omit<JournalLine, 'id' | 'journal_entry_id'>[] = [
      {
        line_number: 1,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.DESPESAS_OPERACIONAIS),
        debit_amount: expense.net_amount,
        credit_amount: 0,
        description: expense.description,
        cost_center_id: expense.cost_center_id,
        document_number: expense.document_number,
      },
      {
        line_number: 2,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.BANCOS),
        debit_amount: 0,
        credit_amount: expense.amount,
        description: `Pagamento - ${expense.vendor_name}`,
        counterparty_id: expense.vendor_id,
      },
    ];

    // Tax retention if applicable
    if (expense.tax_amount > 0) {
      lines.push({
        line_number: 3,
        account_id: await this.getAccountId(DEFAULT_ACCOUNTS.IMPOSTOS_A_PAGAR),
        debit_amount: 0,
        credit_amount: expense.tax_amount,
        description: 'Impostos retidos',
      });
    }

    const entry = await this.createJournalEntry({
      entry_date: entryDate,
      description: `Despesa - ${expense.description}`,
      source_type: 'expense',
      source_id: expense.id,
      lines,
    });

    if (entry) entries.push(entry);

    return entries;
  }

  async onMonthEnd(): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    const today = new Date();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const entryDate = lastDayOfMonth.toISOString().split('T')[0];

    // Generate depreciation entries
    const depreciationEntries = await this.generateDepreciationEntries(entryDate);
    entries.push(...depreciationEntries);

    // Generate provision entries
    const provisionEntries = await this.generateProvisionEntries(entryDate);
    entries.push(...provisionEntries);

    // Generate accrual entries
    const accrualEntries = await this.generateAccruals();
    entries.push(...accrualEntries);

    return entries;
  }

  async generateAccruals(): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];
    const today = new Date();
    const entryDate = today.toISOString().split('T')[0];

    // Fetch prepaid expenses that need to be amortized
    // Note: This uses a simplified approach - in production, you'd have a dedicated
    // prepaid_expenses or accruals table with proper start/end dates
    const { data: prepaidExpenses } = await supabase
      .from('transactions')
      .select('id, description, total_value, cost_center_id, notes')
      .eq('company_id', this.companyId)
      .eq('status', 'pago')
      .eq('direction', 'saida')
      .ilike('description', '%antecipado%');

    for (const expense of (prepaidExpenses || []) as any[]) {
      // Simplified: amortize over 12 months
      const monthlyAmount = (expense.total_value || 0) / 12;
      if (monthlyAmount <= 0) continue;

      const entry = await this.createJournalEntry({
        entry_date: entryDate,
        description: `Apropriação ${expense.description}`,
        source_type: 'accrual',
        source_id: expense.id,
        lines: [
          {
            line_number: 1,
            account_id: await this.getAccountId(DEFAULT_ACCOUNTS.DESPESAS_OPERACIONAIS),
            debit_amount: monthlyAmount,
            credit_amount: 0,
            description: `Apropriação mensal - ${expense.description}`,
            cost_center_id: expense.cost_center_id,
          },
          {
            line_number: 2,
            account_id: await this.getAccountId(DEFAULT_ACCOUNTS.DESPESAS_ANTECIPADAS),
            debit_amount: 0,
            credit_amount: monthlyAmount,
            description: 'Baixa de despesa antecipada',
          },
        ],
      });

      if (entry) entries.push(entry);
    }

    // Deferred revenue recognition
    const { data: deferredRevenue } = await supabase
      .from('transactions')
      .select('id, description, total_value, cost_center_id, notes')
      .eq('company_id', this.companyId)
      .eq('status', 'pago')
      .eq('direction', 'entrada')
      .ilike('description', '%antecipado%');

    for (const revenue of (deferredRevenue || []) as any[]) {
      // Simplified: recognize over 12 months
      const monthlyAmount = (revenue.total_value || 0) / 12;
      if (monthlyAmount <= 0) continue;

      const entry = await this.createJournalEntry({
        entry_date: entryDate,
        description: `Reconhecimento ${revenue.description}`,
        source_type: 'accrual',
        source_id: revenue.id,
        lines: [
          {
            line_number: 1,
            account_id: await this.getAccountId(DEFAULT_ACCOUNTS.RECEITAS_ANTECIPADAS),
            debit_amount: monthlyAmount,
            credit_amount: 0,
            description: 'Baixa de receita antecipada',
          },
          {
            line_number: 2,
            account_id: await this.getAccountId(DEFAULT_ACCOUNTS.RECEITA_SERVICOS),
            debit_amount: 0,
            credit_amount: monthlyAmount,
            description: `Reconhecimento mensal - ${revenue.description}`,
            cost_center_id: revenue.cost_center_id,
          },
        ],
      });

      if (entry) entries.push(entry);
    }

    return entries;
  }

  // ============= Helper Methods =============

  private async generateDepreciationEntries(entryDate: string): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];

    // Note: Fixed assets and provisions tables may not exist yet in all installations.
    // This is a template for when those tables are available.
    // For now, we'll use a simplified approach that doesn't require those tables.
    
    // In production, you would fetch from a fixed_assets table:
    // const { data: assets } = await supabase.from('fixed_assets').select('*')...
    
    // Placeholder: Return empty for now - implement when fixed_assets table exists
    console.log(`[AutomaticAccounting] Depreciation entries would be generated for ${entryDate}`);
    
    return entries;
  }

  private async generateProvisionEntries(entryDate: string): Promise<JournalEntry[]> {
    const entries: JournalEntry[] = [];

    // Note: Provisions table may not exist yet in all installations.
    // This is a template for when that table is available.
    
    // In production, you would fetch from a provisions table:
    // const { data: provisions } = await supabase.from('provisions').select('*')...
    
    // Placeholder: Return empty for now - implement when provisions table exists
    console.log(`[AutomaticAccounting] Provision entries would be generated for ${entryDate}`);

    return entries;
  }

  private async createJournalEntry(data: {
    entry_date: string;
    description: string;
    source_type: string;
    source_id?: string;
    lines: Omit<JournalLine, 'id' | 'journal_entry_id'>[];
  }): Promise<JournalEntry | null> {
    try {
      // Validate double-entry
      const totalDebit = data.lines.reduce((sum, l) => sum + l.debit_amount, 0);
      const totalCredit = data.lines.reduce((sum, l) => sum + l.credit_amount, 0);

      if (Math.abs(totalDebit - totalCredit) > 0.01) {
        console.error('Journal entry not balanced:', { totalDebit, totalCredit });
        return null;
      }

      // Generate entry number
      const { count } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', this.companyId);

      const entryNumber = `LC${String((count || 0) + 1).padStart(6, '0')}`;

      // Create header
      const { data: entry, error: entryError } = await supabase
        .from('journal_entries')
        .insert({
          company_id: this.companyId,
          entry_number: entryNumber,
          entry_date: data.entry_date,
          posting_date: data.entry_date,
          description: data.description,
          source_type: data.source_type,
          status: 'posted',
          total_debit: totalDebit,
          total_credit: totalCredit,
        })
        .select()
        .single();

      if (entryError) {
        console.error('Failed to create journal entry:', entryError);
        return null;
      }

      // Create lines
      const linesToInsert = data.lines
        .filter(l => l.account_id && (l.debit_amount > 0 || l.credit_amount > 0))
        .map(l => ({
          journal_entry_id: entry.id,
          line_number: l.line_number,
          account_id: l.account_id,
          debit_amount: l.debit_amount,
          credit_amount: l.credit_amount,
          description: l.description,
          cost_center_id: l.cost_center_id,
          counterparty_id: l.counterparty_id,
          document_number: l.document_number,
        }));

      const { error: linesError } = await supabase
        .from('journal_lines')
        .insert(linesToInsert);

      if (linesError) {
        console.error('Failed to create journal lines:', linesError);
        // Rollback entry
        await supabase.from('journal_entries').delete().eq('id', entry.id);
        return null;
      }

      // Create subledger link if source_id provided
      if (data.source_id) {
        await supabase.from('subledger_links').insert({
          journal_entry_id: entry.id,
          source_type: data.source_type,
          source_id: data.source_id,
        });
      }

      return {
        ...entry,
        status: entry.status as EntryStatus,
        lines: data.lines as JournalLine[],
      } as JournalEntry;
    } catch (err) {
      console.error('Error creating journal entry:', err);
      return null;
    }
  }

  private async getAccountId(code: string): Promise<string> {
    // Check cache first
    if (this.accountCache.has(code)) {
      return this.accountCache.get(code)!;
    }

    // Fetch from database
    const { data } = await supabase
      .from('accounts')
      .select('id')
      .eq('company_id', this.companyId)
      .eq('code', code)
      .single();

    if (data) {
      this.accountCache.set(code, data.id);
      return data.id;
    }

    // Return placeholder if not found
    console.warn(`Account not found: ${code}`);
    return code;
  }

  private monthDiff(startDate: Date, endDate: Date): number {
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth()) + 1
    );
  }
}

// ============= Utility Functions =============

export function validateJournalEntry(lines: JournalLine[]): {
  isValid: boolean;
  totalDebit: number;
  totalCredit: number;
  difference: number;
} {
  const totalDebit = lines.reduce((sum, l) => sum + (l.debit_amount || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit_amount || 0), 0);
  const difference = totalDebit - totalCredit;

  return {
    isValid: Math.abs(difference) < 0.01,
    totalDebit,
    totalCredit,
    difference,
  };
}

export function formatAccountCode(code: string, separator: string = '.'): string {
  // Format: 1.1.1.01 -> 1.1.1.01
  return code.replace(/(\d)(?=\d)/g, `$1${separator}`);
}

export function getAccountNature(accountType: AccountType): NatureBalance {
  // Assets and Expenses are naturally Debit
  // Liabilities, Equity, and Revenue are naturally Credit
  return ['A', 'D'].includes(accountType) ? 'D' : 'C';
}

export function createJournalEntryAutomation(companyId: string): JournalEntryAutomation {
  return new JournalEntryAutomation(companyId);
}
