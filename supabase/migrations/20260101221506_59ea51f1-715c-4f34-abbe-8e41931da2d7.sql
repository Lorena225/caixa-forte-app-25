-- =============================================
-- RLS POLICIES PARA TODAS AS NOVAS TABELAS
-- =============================================

-- BRANCHES
CREATE POLICY "Usuários podem ver filiais" ON public.branches
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar filiais" ON public.branches
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar filiais" ON public.branches
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar filiais" ON public.branches
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- ROLES
CREATE POLICY "Usuários podem ver papéis" ON public.roles
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Admins podem gerenciar papéis" ON public.roles
  FOR ALL USING (get_user_role(company_id) = 'admin');

-- PERMISSIONS (público para leitura)
CREATE POLICY "Todos podem ver permissões" ON public.permissions
  FOR SELECT USING (true);

-- ROLE_PERMISSIONS
CREATE POLICY "Usuários podem ver role_permissions" ON public.role_permissions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_id AND user_has_company_access(r.company_id)
  ));
CREATE POLICY "Admins podem gerenciar role_permissions" ON public.role_permissions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.roles r WHERE r.id = role_id AND get_user_role(r.company_id) = 'admin'
  ));

-- PERIODS
CREATE POLICY "Usuários podem ver períodos" ON public.periods
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar períodos" ON public.periods
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar períodos" ON public.periods
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar períodos" ON public.periods
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- PERIOD_LOCKS
CREATE POLICY "Usuários podem ver travas" ON public.period_locks
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Admins podem gerenciar travas" ON public.period_locks
  FOR ALL USING (get_user_role(company_id) = 'admin');

-- DIMENSIONS
CREATE POLICY "Usuários podem ver dimensões" ON public.dimensions
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar dimensões" ON public.dimensions
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar dimensões" ON public.dimensions
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar dimensões" ON public.dimensions
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- DIMENSION_VALUES
CREATE POLICY "Usuários podem ver valores de dimensão" ON public.dimension_values
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar valores de dimensão" ON public.dimension_values
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar valores de dimensão" ON public.dimension_values
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar valores de dimensão" ON public.dimension_values
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- TRANSACTION_DIMENSIONS
CREATE POLICY "Usuários podem ver dimensões de transação" ON public.transaction_dimensions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND user_has_company_access(t.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar dimensões de transação" ON public.transaction_dimensions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.transactions t WHERE t.id = transaction_id AND user_can_write(t.company_id)
  ));

-- ALLOCATION_RULES
CREATE POLICY "Usuários podem ver regras de rateio" ON public.allocation_rules
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar regras de rateio" ON public.allocation_rules
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar regras de rateio" ON public.allocation_rules
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar regras de rateio" ON public.allocation_rules
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- ALLOCATION_RULE_ITEMS
CREATE POLICY "Usuários podem ver itens de rateio" ON public.allocation_rule_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.allocation_rules ar WHERE ar.id = rule_id AND user_has_company_access(ar.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar itens de rateio" ON public.allocation_rule_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.allocation_rules ar WHERE ar.id = rule_id AND user_can_write(ar.company_id)
  ));

-- COUNTERPARTY_BANK_ACCOUNTS
CREATE POLICY "Usuários podem ver contas bancárias" ON public.counterparty_bank_accounts
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar contas bancárias" ON public.counterparty_bank_accounts
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar contas bancárias" ON public.counterparty_bank_accounts
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar contas bancárias" ON public.counterparty_bank_accounts
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- VENDOR_BILLS
CREATE POLICY "Usuários podem ver documentos AP" ON public.vendor_bills
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar documentos AP" ON public.vendor_bills
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar documentos AP" ON public.vendor_bills
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar documentos AP" ON public.vendor_bills
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- VENDOR_BILL_LINES
CREATE POLICY "Usuários podem ver linhas AP" ON public.vendor_bill_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vendor_bills vb WHERE vb.id = vendor_bill_id AND user_has_company_access(vb.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar linhas AP" ON public.vendor_bill_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.vendor_bills vb WHERE vb.id = vendor_bill_id AND user_can_write(vb.company_id)
  ));

-- VENDOR_BILL_WITHHOLDINGS
CREATE POLICY "Usuários podem ver retenções AP" ON public.vendor_bill_withholdings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.vendor_bills vb WHERE vb.id = vendor_bill_id AND user_has_company_access(vb.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar retenções AP" ON public.vendor_bill_withholdings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.vendor_bills vb WHERE vb.id = vendor_bill_id AND user_can_write(vb.company_id)
  ));

-- CUSTOMER_INVOICES
CREATE POLICY "Usuários podem ver faturas AR" ON public.customer_invoices
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar faturas AR" ON public.customer_invoices
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar faturas AR" ON public.customer_invoices
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar faturas AR" ON public.customer_invoices
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- CUSTOMER_INVOICE_LINES
CREATE POLICY "Usuários podem ver linhas AR" ON public.customer_invoice_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.customer_invoices ci WHERE ci.id = customer_invoice_id AND user_has_company_access(ci.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar linhas AR" ON public.customer_invoice_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.customer_invoices ci WHERE ci.id = customer_invoice_id AND user_can_write(ci.company_id)
  ));

-- CUSTOMER_INVOICE_WITHHOLDINGS
CREATE POLICY "Usuários podem ver retenções AR" ON public.customer_invoice_withholdings
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.customer_invoices ci WHERE ci.id = customer_invoice_id AND user_has_company_access(ci.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar retenções AR" ON public.customer_invoice_withholdings
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.customer_invoices ci WHERE ci.id = customer_invoice_id AND user_can_write(ci.company_id)
  ));

-- PAYMENTS
CREATE POLICY "Usuários podem ver pagamentos" ON public.payments
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar pagamentos" ON public.payments
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar pagamentos" ON public.payments
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar pagamentos" ON public.payments
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- RECEIPTS
CREATE POLICY "Usuários podem ver recebimentos" ON public.receipts
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar recebimentos" ON public.receipts
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar recebimentos" ON public.receipts
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar recebimentos" ON public.receipts
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- BANK_STATEMENTS
CREATE POLICY "Usuários podem ver extratos" ON public.bank_statements
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar extratos" ON public.bank_statements
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar extratos" ON public.bank_statements
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar extratos" ON public.bank_statements
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- BANK_STATEMENT_LINES
CREATE POLICY "Usuários podem ver linhas de extrato" ON public.bank_statement_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.bank_statements bs WHERE bs.id = statement_id AND user_has_company_access(bs.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar linhas de extrato" ON public.bank_statement_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.bank_statements bs WHERE bs.id = statement_id AND user_can_write(bs.company_id)
  ));

-- CNAB_FILES
CREATE POLICY "Usuários podem ver arquivos CNAB" ON public.cnab_files
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar arquivos CNAB" ON public.cnab_files
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar arquivos CNAB" ON public.cnab_files
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar arquivos CNAB" ON public.cnab_files
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- CNAB_OCCURRENCES
CREATE POLICY "Usuários podem ver ocorrências CNAB" ON public.cnab_occurrences
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.cnab_files cf WHERE cf.id = cnab_file_id AND user_has_company_access(cf.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar ocorrências CNAB" ON public.cnab_occurrences
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.cnab_files cf WHERE cf.id = cnab_file_id AND user_can_write(cf.company_id)
  ));

-- PAYMENT_RUNS
CREATE POLICY "Usuários podem ver lotes de pagamento" ON public.payment_runs
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar lotes de pagamento" ON public.payment_runs
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar lotes de pagamento" ON public.payment_runs
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar lotes de pagamento" ON public.payment_runs
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- PAYMENT_RUN_ITEMS
CREATE POLICY "Usuários podem ver itens de lote" ON public.payment_run_items
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.payment_runs pr WHERE pr.id = payment_run_id AND user_has_company_access(pr.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar itens de lote" ON public.payment_run_items
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.payment_runs pr WHERE pr.id = payment_run_id AND user_can_write(pr.company_id)
  ));

-- JOURNAL_ENTRIES
CREATE POLICY "Usuários podem ver lançamentos GL" ON public.journal_entries
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar lançamentos GL" ON public.journal_entries
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar lançamentos GL" ON public.journal_entries
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar lançamentos GL" ON public.journal_entries
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- JOURNAL_LINES
CREATE POLICY "Usuários podem ver partidas GL" ON public.journal_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND user_has_company_access(je.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar partidas GL" ON public.journal_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND user_can_write(je.company_id)
  ));

-- POSTING_RULES
CREATE POLICY "Usuários podem ver regras de contabilização" ON public.posting_rules
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar regras de contabilização" ON public.posting_rules
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar regras de contabilização" ON public.posting_rules
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar regras de contabilização" ON public.posting_rules
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- SUBLEDGER_LINKS
CREATE POLICY "Usuários podem ver links subledger" ON public.subledger_links
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND user_has_company_access(je.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar links subledger" ON public.subledger_links
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.journal_entries je WHERE je.id = journal_entry_id AND user_can_write(je.company_id)
  ));

-- FISCAL_DOCUMENTS
CREATE POLICY "Usuários podem ver documentos fiscais" ON public.fiscal_documents
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar documentos fiscais" ON public.fiscal_documents
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar documentos fiscais" ON public.fiscal_documents
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar documentos fiscais" ON public.fiscal_documents
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- FISCAL_DOCUMENT_LINES
CREATE POLICY "Usuários podem ver linhas fiscais" ON public.fiscal_document_lines
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.fiscal_documents fd WHERE fd.id = fiscal_document_id AND user_has_company_access(fd.company_id)
  ));
CREATE POLICY "Gestores podem gerenciar linhas fiscais" ON public.fiscal_document_lines
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.fiscal_documents fd WHERE fd.id = fiscal_document_id AND user_can_write(fd.company_id)
  ));

-- TAX_CODES
CREATE POLICY "Usuários podem ver códigos de imposto" ON public.tax_codes
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar códigos de imposto" ON public.tax_codes
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar códigos de imposto" ON public.tax_codes
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar códigos de imposto" ON public.tax_codes
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- TAX_RULES
CREATE POLICY "Usuários podem ver regras de imposto" ON public.tax_rules
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar regras de imposto" ON public.tax_rules
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar regras de imposto" ON public.tax_rules
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar regras de imposto" ON public.tax_rules
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- WITHHOLDING_RULES
CREATE POLICY "Usuários podem ver regras de retenção" ON public.withholding_rules
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar regras de retenção" ON public.withholding_rules
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar regras de retenção" ON public.withholding_rules
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar regras de retenção" ON public.withholding_rules
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- TAX_CALCULATIONS
CREATE POLICY "Usuários podem ver cálculos de imposto" ON public.tax_calculations
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar cálculos de imposto" ON public.tax_calculations
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar cálculos de imposto" ON public.tax_calculations
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar cálculos de imposto" ON public.tax_calculations
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- TAX_REPORTS
CREATE POLICY "Usuários podem ver relatórios fiscais" ON public.tax_reports
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar relatórios fiscais" ON public.tax_reports
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar relatórios fiscais" ON public.tax_reports
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar relatórios fiscais" ON public.tax_reports
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- APPROVAL_WORKFLOWS
CREATE POLICY "Usuários podem ver workflows" ON public.approval_workflows
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Admins podem gerenciar workflows" ON public.approval_workflows
  FOR ALL USING (get_user_role(company_id) = 'admin');

-- APPROVAL_STEPS
CREATE POLICY "Usuários podem ver etapas" ON public.approval_steps
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.approval_workflows aw WHERE aw.id = workflow_id AND user_has_company_access(aw.company_id)
  ));
CREATE POLICY "Admins podem gerenciar etapas" ON public.approval_steps
  FOR ALL USING (EXISTS (
    SELECT 1 FROM public.approval_workflows aw WHERE aw.id = workflow_id AND get_user_role(aw.company_id) = 'admin'
  ));

-- APPROVAL_REQUESTS
CREATE POLICY "Usuários podem ver solicitações" ON public.approval_requests
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar solicitações" ON public.approval_requests
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar solicitações" ON public.approval_requests
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar solicitações" ON public.approval_requests
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- APPROVAL_ACTIONS
CREATE POLICY "Usuários podem ver ações de aprovação" ON public.approval_actions
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.approval_requests ar WHERE ar.id = request_id AND user_has_company_access(ar.company_id)
  ));
CREATE POLICY "Gestores podem criar ações de aprovação" ON public.approval_actions
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM public.approval_requests ar WHERE ar.id = request_id AND user_can_write(ar.company_id)
  ));

-- COLLECTION_RULES
CREATE POLICY "Usuários podem ver regras de cobrança" ON public.collection_rules
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar regras de cobrança" ON public.collection_rules
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar regras de cobrança" ON public.collection_rules
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar regras de cobrança" ON public.collection_rules
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- COLLECTION_ACTIONS
CREATE POLICY "Usuários podem ver ações de cobrança" ON public.collection_actions
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar ações de cobrança" ON public.collection_actions
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar ações de cobrança" ON public.collection_actions
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar ações de cobrança" ON public.collection_actions
  FOR DELETE USING (get_user_role(company_id) = 'admin');

-- CASH_POSITIONS
CREATE POLICY "Usuários podem ver posição de caixa" ON public.cash_positions
  FOR SELECT USING (user_has_company_access(company_id));
CREATE POLICY "Gestores podem criar posição de caixa" ON public.cash_positions
  FOR INSERT WITH CHECK (user_can_write(company_id));
CREATE POLICY "Gestores podem atualizar posição de caixa" ON public.cash_positions
  FOR UPDATE USING (user_can_write(company_id));
CREATE POLICY "Admins podem deletar posição de caixa" ON public.cash_positions
  FOR DELETE USING (get_user_role(company_id) = 'admin');