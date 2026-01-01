// Default Excel import templates
import type { TemplateColumn, ImportEntityType } from './types';

export interface DefaultTemplate {
  entity: ImportEntityType;
  name: string;
  description: string;
  columns: TemplateColumn[];
  sampleData: Record<string, unknown>[];
  instructions: string[];
}

// Account Categories Template
export const accountCategoriesTemplate: DefaultTemplate = {
  entity: 'account_categories',
  name: 'Categorias de Conta',
  description: 'Importação de categorias (grupos) do plano de contas',
  columns: [
    { name: 'code', label: 'Código', type: 'text', required: true, description: 'Código único da categoria (ex: R01, D05)' },
    { name: 'name', label: 'Nome', type: 'text', required: true, description: 'Nome da categoria' },
    { name: 'category_type', label: 'Tipo', type: 'enum', required: true, options: ['receita', 'despesa', 'custo', 'ativo', 'passivo', 'patrimonio_liquido'], description: 'Tipo da categoria' },
    { name: 'parent_code', label: 'Código Categoria Pai', type: 'text', required: false, description: 'Código da categoria pai (para hierarquia)' },
    { name: 'is_active', label: 'Ativo', type: 'boolean', required: false, default: true },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false, description: 'ID único para evitar duplicatas' },
  ],
  sampleData: [
    { code: 'R01', name: 'Receitas com Serviços', category_type: 'receita', parent_code: '', is_active: 'Sim', external_key: 'CAT-R01' },
    { code: 'R02', name: 'Receitas com Produtos', category_type: 'receita', parent_code: '', is_active: 'Sim', external_key: 'CAT-R02' },
    { code: 'D01', name: 'Despesas Operacionais', category_type: 'despesa', parent_code: '', is_active: 'Sim', external_key: 'CAT-D01' },
    { code: 'D02', name: 'Despesas Administrativas', category_type: 'despesa', parent_code: '', is_active: 'Sim', external_key: 'CAT-D02' },
  ],
  instructions: [
    'Preencha o código da categoria (deve ser único)',
    'O tipo determina a classificação contábil',
    'Use parent_code para criar hierarquia (subcategorias)',
    'A chave externa evita duplicatas em importações futuras',
  ],
};

// Accounts Template (updated with category_code)
export const accountsTemplate: DefaultTemplate = {
  entity: 'accounts',
  name: 'Plano de Contas',
  description: 'Importação de contas contábeis analíticas',
  columns: [
    { name: 'category_code', label: 'Código Categoria', type: 'text', required: true, description: 'Código da categoria a que pertence' },
    { name: 'code', label: 'Código Conta', type: 'text', required: true, description: 'Código único da conta (ex: 3.1.01)' },
    { name: 'name', label: 'Nome', type: 'text', required: true, description: 'Nome da conta' },
    { name: 'category_type', label: 'Tipo', type: 'enum', required: true, options: ['receita', 'despesa', 'custo', 'ativo', 'passivo', 'patrimonio_liquido'], description: 'Tipo da conta' },
    { name: 'parent_code', label: 'Código Conta Pai', type: 'text', required: false, description: 'Código da conta pai (para hierarquia)' },
    { name: 'is_managerial', label: 'Gerencial', type: 'boolean', required: false, default: false },
    { name: 'is_active', label: 'Ativo', type: 'boolean', required: false, default: true },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false, description: 'ID único para evitar duplicatas' },
  ],
  sampleData: [
    { category_code: 'R01', code: '3.1.01', name: 'Consultoria', category_type: 'receita', parent_code: '', is_managerial: 'Não', is_active: 'Sim', external_key: 'ACC-3101' },
    { category_code: 'R01', code: '3.1.02', name: 'Desenvolvimento', category_type: 'receita', parent_code: '', is_managerial: 'Não', is_active: 'Sim', external_key: 'ACC-3102' },
    { category_code: 'D01', code: '4.1.01', name: 'Aluguel', category_type: 'despesa', parent_code: '', is_managerial: 'Não', is_active: 'Sim', external_key: 'ACC-4101' },
  ],
  instructions: [
    'Importe as categorias primeiro, depois as contas',
    'O código da categoria deve existir na base',
    'Cada conta pertence a uma única categoria',
    'Use parent_code para criar subcontas',
  ],
};

// Transactions Template (updated with category_code, account_code, document fields)
export const transactionsTemplate: DefaultTemplate = {
  entity: 'transactions',
  name: 'Lançamentos',
  description: 'Importação de lançamentos financeiros (receitas e despesas)',
  columns: [
    { name: 'direction', label: 'Tipo', type: 'enum', required: true, options: ['entrada', 'saida'], description: 'Entrada (receita) ou Saída (despesa)' },
    { name: 'description', label: 'Descrição', type: 'text', required: true },
    { name: 'category_code', label: 'Código Categoria', type: 'text', required: true, description: 'Código da categoria' },
    { name: 'account_code', label: 'Código Conta', type: 'text', required: true, description: 'Código da conta contábil' },
    { name: 'total_amount', label: 'Valor Total', type: 'currency', required: true },
    { name: 'transaction_date', label: 'Data Emissão', type: 'date', required: true },
    { name: 'due_date', label: 'Data Vencimento', type: 'date', required: true },
    { name: 'paid_date', label: 'Data Pagamento', type: 'date', required: false },
    { name: 'status', label: 'Status', type: 'enum', required: false, options: ['rascunho', 'lancado', 'pago', 'cancelado'], default: 'lancado' },
    { name: 'counterparty_name', label: 'Cliente/Fornecedor', type: 'text', required: false },
    { name: 'wallet_name', label: 'Carteira', type: 'text', required: false },
    { name: 'cost_center_code', label: 'Centro de Custo', type: 'text', required: false },
    { name: 'document_type', label: 'Tipo Documento', type: 'enum', required: false, options: ['nf', 'nfe', 'fatura', 'recibo', 'boleto', 'outro'], description: 'NF, NFe, Fatura, Recibo, Boleto' },
    { name: 'document_number', label: 'Nº Documento', type: 'text', required: false, description: 'Número da NF/Fatura/Recibo' },
    { name: 'document_series', label: 'Série', type: 'text', required: false },
    { name: 'notes', label: 'Observações', type: 'text', required: false },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { direction: 'entrada', description: 'Consultoria projeto X', category_code: 'R01', account_code: '3.1.01', total_amount: '5000,00', transaction_date: '01/01/2026', due_date: '15/01/2026', status: 'lancado', counterparty_name: 'Cliente ABC', document_type: 'nf', document_number: 'NF 1234' },
    { direction: 'saida', description: 'Aluguel escritório', category_code: 'D01', account_code: '4.1.01', total_amount: '3500,00', transaction_date: '05/01/2026', due_date: '10/01/2026', paid_date: '10/01/2026', status: 'pago', counterparty_name: 'Imobiliária XYZ', document_type: 'boleto', document_number: 'BOL 5678' },
  ],
  instructions: [
    'Certifique-se que categorias e contas já estão cadastradas',
    'O código da conta deve pertencer à categoria informada',
    'Use entrada para receitas e saída para despesas',
    'O número do documento ajuda na conciliação',
    'A chave externa evita duplicatas em importações futuras',
  ],
};

// Transactions AR Template (Contas a Receber)
export const transactionsArTemplate: DefaultTemplate = {
  entity: 'transactions_ar',
  name: 'Contas a Receber',
  description: 'Importação de contas a receber',
  columns: [
    { name: 'description', label: 'Descrição', type: 'text', required: true },
    { name: 'category_code', label: 'Código Categoria', type: 'text', required: true, description: 'Código da categoria de receita' },
    { name: 'account_code', label: 'Código Conta', type: 'text', required: true, description: 'Código da conta contábil' },
    { name: 'total_amount', label: 'Valor', type: 'currency', required: true },
    { name: 'transaction_date', label: 'Data Emissão', type: 'date', required: true },
    { name: 'due_date', label: 'Data Vencimento', type: 'date', required: true },
    { name: 'paid_date', label: 'Data Recebimento', type: 'date', required: false },
    { name: 'status', label: 'Status', type: 'enum', required: false, options: ['rascunho', 'lancado', 'pago', 'cancelado'], default: 'lancado' },
    { name: 'counterparty_name', label: 'Cliente', type: 'text', required: false },
    { name: 'wallet_name', label: 'Carteira', type: 'text', required: false },
    { name: 'cost_center_code', label: 'Centro de Custo', type: 'text', required: false },
    { name: 'document_type', label: 'Tipo Documento', type: 'enum', required: false, options: ['nf', 'nfe', 'fatura', 'recibo', 'boleto', 'outro'] },
    { name: 'document_number', label: 'Nº Documento', type: 'text', required: false },
    { name: 'notes', label: 'Observações', type: 'text', required: false },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { description: 'Venda consultoria', category_code: 'R01', account_code: '3.1.01', total_amount: '10000,00', transaction_date: '01/01/2026', due_date: '31/01/2026', status: 'lancado', counterparty_name: 'Empresa XYZ', document_type: 'nf', document_number: 'NF 999' },
  ],
  instructions: [
    'Todos os lançamentos serão criados como "entrada" (receita)',
    'Informe data de recebimento para títulos já pagos',
    'O número da NF/Fatura facilita a conciliação bancária',
  ],
};

// Transactions AP Template (Contas a Pagar)
export const transactionsApTemplate: DefaultTemplate = {
  entity: 'transactions_ap',
  name: 'Contas a Pagar',
  description: 'Importação de contas a pagar',
  columns: [
    { name: 'description', label: 'Descrição', type: 'text', required: true },
    { name: 'category_code', label: 'Código Categoria', type: 'text', required: true, description: 'Código da categoria de despesa/custo' },
    { name: 'account_code', label: 'Código Conta', type: 'text', required: true, description: 'Código da conta contábil' },
    { name: 'total_amount', label: 'Valor', type: 'currency', required: true },
    { name: 'transaction_date', label: 'Data Emissão', type: 'date', required: true },
    { name: 'due_date', label: 'Data Vencimento', type: 'date', required: true },
    { name: 'paid_date', label: 'Data Pagamento', type: 'date', required: false },
    { name: 'status', label: 'Status', type: 'enum', required: false, options: ['rascunho', 'lancado', 'pago', 'cancelado'], default: 'lancado' },
    { name: 'counterparty_name', label: 'Fornecedor', type: 'text', required: false },
    { name: 'wallet_name', label: 'Carteira', type: 'text', required: false },
    { name: 'cost_center_code', label: 'Centro de Custo', type: 'text', required: false },
    { name: 'document_type', label: 'Tipo Documento', type: 'enum', required: false, options: ['nf', 'nfe', 'fatura', 'recibo', 'boleto', 'outro'] },
    { name: 'document_number', label: 'Nº Documento', type: 'text', required: false },
    { name: 'notes', label: 'Observações', type: 'text', required: false },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { description: 'Conta de luz', category_code: 'D01', account_code: '4.1.05', total_amount: '850,00', transaction_date: '10/01/2026', due_date: '20/01/2026', status: 'lancado', counterparty_name: 'Enel', document_type: 'fatura', document_number: 'FAT 2026/01' },
  ],
  instructions: [
    'Todos os lançamentos serão criados como "saída" (despesa)',
    'Informe data de pagamento para títulos já pagos',
    'O número do boleto/fatura facilita a conciliação',
  ],
};

// Counterparties Template (unchanged but included for completeness)
export const counterpartiesTemplate: DefaultTemplate = {
  entity: 'counterparties',
  name: 'Clientes e Fornecedores',
  description: 'Importação de clientes e fornecedores',
  columns: [
    { name: 'name', label: 'Nome/Razão Social', type: 'text', required: true },
    { name: 'type', label: 'Tipo', type: 'enum', required: false, options: ['cliente', 'fornecedor', 'ambos'], default: 'ambos' },
    { name: 'document', label: 'CPF/CNPJ', type: 'text', required: false },
    { name: 'email', label: 'E-mail', type: 'text', required: false },
    { name: 'phone', label: 'Telefone', type: 'text', required: false },
    { name: 'address', label: 'Endereço', type: 'text', required: false },
    { name: 'is_active', label: 'Ativo', type: 'boolean', required: false, default: true },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { name: 'Empresa ABC Ltda', type: 'cliente', document: '12.345.678/0001-90', email: 'contato@abc.com', phone: '(11) 99999-9999', is_active: 'Sim' },
    { name: 'Fornecedor XYZ', type: 'fornecedor', document: '98.765.432/0001-10', email: 'financeiro@xyz.com', is_active: 'Sim' },
  ],
  instructions: [
    'O CPF/CNPJ pode ser informado com ou sem formatação',
    'Use "ambos" se o cadastro for cliente e fornecedor',
  ],
};

// Wallets Template
export const walletsTemplate: DefaultTemplate = {
  entity: 'wallets',
  name: 'Carteiras',
  description: 'Importação de carteiras (caixas, bancos, cartões)',
  columns: [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'type', label: 'Tipo', type: 'enum', required: true, options: ['caixa', 'banco', 'cartao'] },
    { name: 'opening_balance', label: 'Saldo Inicial', type: 'currency', required: false, default: 0 },
    { name: 'closing_day', label: 'Dia Fechamento', type: 'integer', required: false, description: 'Para cartões: dia do fechamento' },
    { name: 'due_day', label: 'Dia Vencimento', type: 'integer', required: false, description: 'Para cartões: dia do vencimento' },
    { name: 'is_active', label: 'Ativo', type: 'boolean', required: false, default: true },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { name: 'Caixa Pequeno', type: 'caixa', opening_balance: '500,00', is_active: 'Sim' },
    { name: 'Banco Itaú', type: 'banco', opening_balance: '15000,00', is_active: 'Sim' },
    { name: 'Cartão Nubank', type: 'cartao', closing_day: '15', due_day: '22', is_active: 'Sim' },
  ],
  instructions: [
    'Informe dia de fechamento e vencimento apenas para cartões de crédito',
    'O saldo inicial é usado para cálculo do fluxo de caixa',
  ],
};

// Cost Centers Template
export const costCentersTemplate: DefaultTemplate = {
  entity: 'cost_centers',
  name: 'Centros de Custo',
  description: 'Importação de centros de custo',
  columns: [
    { name: 'code', label: 'Código', type: 'text', required: true },
    { name: 'name', label: 'Nome', type: 'text', required: true },
    { name: 'is_active', label: 'Ativo', type: 'boolean', required: false, default: true },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { code: 'CC01', name: 'Administrativo', is_active: 'Sim' },
    { code: 'CC02', name: 'Comercial', is_active: 'Sim' },
    { code: 'CC03', name: 'Operacional', is_active: 'Sim' },
  ],
  instructions: [
    'O código deve ser único',
    'Centros de custo são usados para análise gerencial',
  ],
};

// Budgets Template
export const budgetsTemplate: DefaultTemplate = {
  entity: 'budgets',
  name: 'Metas/Orçamento',
  description: 'Importação de metas e orçamentos mensais',
  columns: [
    { name: 'year', label: 'Ano', type: 'integer', required: true },
    { name: 'month', label: 'Mês', type: 'integer', required: true, description: '1-12' },
    { name: 'target_revenue', label: 'Meta Receita', type: 'currency', required: false },
    { name: 'target_expense', label: 'Meta Despesa', type: 'currency', required: false },
    { name: 'target_profit', label: 'Meta Lucro', type: 'currency', required: false },
    { name: 'target_margin', label: 'Meta Margem (%)', type: 'decimal', required: false },
    { name: 'external_key', label: 'Chave Externa', type: 'text', required: false },
  ],
  sampleData: [
    { year: '2026', month: '1', target_revenue: '100000,00', target_expense: '70000,00', target_profit: '30000,00', target_margin: '30' },
    { year: '2026', month: '2', target_revenue: '120000,00', target_expense: '80000,00', target_profit: '40000,00', target_margin: '33.33' },
  ],
  instructions: [
    'Defina metas mensais para receitas, despesas e lucro',
    'A margem é expressa em percentual (ex: 30 para 30%)',
    'Importar metas existentes atualizará os valores',
  ],
};

// Export all templates
export const defaultTemplates: Record<ImportEntityType, DefaultTemplate> = {
  account_categories: accountCategoriesTemplate,
  accounts: accountsTemplate,
  counterparties: counterpartiesTemplate,
  wallets: walletsTemplate,
  cost_centers: costCentersTemplate,
  transactions: transactionsTemplate,
  transactions_ar: transactionsArTemplate,
  transactions_ap: transactionsApTemplate,
  budgets: budgetsTemplate,
};

/**
 * Get template for entity type
 */
export function getTemplateForEntity(entity: ImportEntityType): DefaultTemplate {
  return defaultTemplates[entity];
}
