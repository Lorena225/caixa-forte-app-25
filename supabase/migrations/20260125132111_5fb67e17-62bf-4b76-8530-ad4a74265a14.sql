
-- =====================================================
-- SECURITY HARDENING: ROLE-BASED ACCESS CONTROL (RBAC)
-- =====================================================

-- 1. CHEQUES: Restrict to finance/treasury roles only
DROP POLICY IF EXISTS "cheques_select" ON public.cheques;
DROP POLICY IF EXISTS "cheques_insert" ON public.cheques;
DROP POLICY IF EXISTS "cheques_update" ON public.cheques;
DROP POLICY IF EXISTS "cheques_delete" ON public.cheques;

CREATE POLICY "cheques_select_rbac" ON public.cheques
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury')
  ));

CREATE POLICY "cheques_insert_rbac" ON public.cheques
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury')
  ));

CREATE POLICY "cheques_update_rbac" ON public.cheques
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury')
  ));

CREATE POLICY "cheques_delete_rbac" ON public.cheques
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 2. BANK_TRANSACTIONS: Restrict to finance/treasury roles
DROP POLICY IF EXISTS "bank_transactions_select" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_insert" ON public.bank_transactions;
DROP POLICY IF EXISTS "bank_transactions_update" ON public.bank_transactions;

CREATE POLICY "bank_transactions_select_rbac" ON public.bank_transactions
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury') OR
    has_role(auth.uid(), 'accountant')
  ));

CREATE POLICY "bank_transactions_insert_rbac" ON public.bank_transactions
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury')
  ));

CREATE POLICY "bank_transactions_update_rbac" ON public.bank_transactions
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury')
  ));

CREATE POLICY "bank_transactions_delete_rbac" ON public.bank_transactions
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 3. BUDGET_MASTER: Restrict to finance/management roles
DROP POLICY IF EXISTS "Users can view budgets from their company" ON public.budget_master;
DROP POLICY IF EXISTS "Users can insert budgets to their company" ON public.budget_master;
DROP POLICY IF EXISTS "Users can update budgets from their company" ON public.budget_master;
DROP POLICY IF EXISTS "Users can delete budgets from their company" ON public.budget_master;

CREATE POLICY "budget_master_select_rbac" ON public.budget_master
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'manager')
  ));

CREATE POLICY "budget_master_insert_rbac" ON public.budget_master
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance')
  ));

CREATE POLICY "budget_master_update_rbac" ON public.budget_master
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance')
  ));

CREATE POLICY "budget_master_delete_rbac" ON public.budget_master
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 4. LOAN_CONTRACTS: Restrict to finance/executive roles
DROP POLICY IF EXISTS "Users can view loan contracts for their company" ON public.loan_contracts;
DROP POLICY IF EXISTS "Users can manage loan contracts for their company" ON public.loan_contracts;

CREATE POLICY "loan_contracts_select_rbac" ON public.loan_contracts
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'treasury')
  ));

CREATE POLICY "loan_contracts_insert_rbac" ON public.loan_contracts
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance')
  ));

CREATE POLICY "loan_contracts_update_rbac" ON public.loan_contracts
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance')
  ));

CREATE POLICY "loan_contracts_delete_rbac" ON public.loan_contracts
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 5. SALES_COMMISSIONS: Restrict to HR/finance or own seller only
DROP POLICY IF EXISTS "sales_commissions_all" ON public.sales_commissions;

CREATE POLICY "sales_commissions_select_rbac" ON public.sales_commissions
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'hr') OR
    seller_id = auth.uid()
  ));

CREATE POLICY "sales_commissions_insert_rbac" ON public.sales_commissions
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance')
  ));

CREATE POLICY "sales_commissions_update_rbac" ON public.sales_commissions
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance')
  ));

CREATE POLICY "sales_commissions_delete_rbac" ON public.sales_commissions
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 6. FOLHAS_PAGAMENTO: Restrict to HR/admin roles only
DROP POLICY IF EXISTS "folhas_company_isolation" ON public.folhas_pagamento;

CREATE POLICY "folhas_pagamento_select_rbac" ON public.folhas_pagamento
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hr')
  ));

CREATE POLICY "folhas_pagamento_insert_rbac" ON public.folhas_pagamento
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hr')
  ));

CREATE POLICY "folhas_pagamento_update_rbac" ON public.folhas_pagamento
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'hr')
  ));

CREATE POLICY "folhas_pagamento_delete_rbac" ON public.folhas_pagamento
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 7. WHATSAPP_CONTACTS: Restrict to admin/support roles
DROP POLICY IF EXISTS "whatsapp_contacts_company_access" ON public.whatsapp_contacts;

CREATE POLICY "whatsapp_contacts_select_rbac" ON public.whatsapp_contacts
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'support')
  ));

CREATE POLICY "whatsapp_contacts_insert_rbac" ON public.whatsapp_contacts
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'support')
  ));

CREATE POLICY "whatsapp_contacts_update_rbac" ON public.whatsapp_contacts
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'support')
  ));

CREATE POLICY "whatsapp_contacts_delete_rbac" ON public.whatsapp_contacts
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 8. VENDOR_BILLS: Restrict to finance roles
DROP POLICY IF EXISTS "Usuários podem ver documentos AP" ON public.vendor_bills;
DROP POLICY IF EXISTS "Gestores podem criar documentos AP" ON public.vendor_bills;
DROP POLICY IF EXISTS "Gestores podem atualizar documentos AP" ON public.vendor_bills;
DROP POLICY IF EXISTS "Admins podem deletar documentos AP" ON public.vendor_bills;

CREATE POLICY "vendor_bills_select_rbac" ON public.vendor_bills
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'accountant')
  ));

CREATE POLICY "vendor_bills_insert_rbac" ON public.vendor_bills
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'accountant')
  ));

CREATE POLICY "vendor_bills_update_rbac" ON public.vendor_bills
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'accountant')
  ));

CREATE POLICY "vendor_bills_delete_rbac" ON public.vendor_bills
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 9. CUSTOMER_INVOICES: Restrict to finance/sales roles
DROP POLICY IF EXISTS "Usuários podem ver faturas AR" ON public.customer_invoices;
DROP POLICY IF EXISTS "Gestores podem criar faturas AR" ON public.customer_invoices;
DROP POLICY IF EXISTS "Gestores podem atualizar faturas AR" ON public.customer_invoices;
DROP POLICY IF EXISTS "Admins podem deletar faturas AR" ON public.customer_invoices;

CREATE POLICY "customer_invoices_select_rbac" ON public.customer_invoices
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'sales') OR
    has_role(auth.uid(), 'accountant')
  ));

CREATE POLICY "customer_invoices_insert_rbac" ON public.customer_invoices
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'sales')
  ));

CREATE POLICY "customer_invoices_update_rbac" ON public.customer_invoices
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'sales')
  ));

CREATE POLICY "customer_invoices_delete_rbac" ON public.customer_invoices
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 10. COUNTERPARTIES: Restrict sensitive data to relevant roles
DROP POLICY IF EXISTS "Usuários podem ver clientes/fornecedores" ON public.counterparties;
DROP POLICY IF EXISTS "Gestores podem criar clientes/fornecedores" ON public.counterparties;
DROP POLICY IF EXISTS "Gestores podem atualizar clientes/fornecedores" ON public.counterparties;
DROP POLICY IF EXISTS "Admins podem deletar clientes/fornecedores" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can view counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can insert counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can update counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can delete counterparties" ON public.counterparties;

CREATE POLICY "counterparties_select_rbac" ON public.counterparties
  FOR SELECT TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'sales') OR
    has_role(auth.uid(), 'accountant') OR
    has_role(auth.uid(), 'purchasing')
  ));

CREATE POLICY "counterparties_insert_rbac" ON public.counterparties
  FOR INSERT TO authenticated
  WITH CHECK (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'sales') OR
    has_role(auth.uid(), 'purchasing')
  ));

CREATE POLICY "counterparties_update_rbac" ON public.counterparties
  FOR UPDATE TO authenticated
  USING (user_belongs_to_company(company_id) AND (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'finance') OR 
    has_role(auth.uid(), 'sales') OR
    has_role(auth.uid(), 'purchasing')
  ));

CREATE POLICY "counterparties_delete_rbac" ON public.counterparties
  FOR DELETE TO authenticated
  USING (user_belongs_to_company(company_id) AND has_role(auth.uid(), 'admin'));

-- 11. AUDIT_LOGS: Remove permissive insert policy, restrict to service role
DROP POLICY IF EXISTS "Sistema pode inserir logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Audit logs are append-only insert" ON public.audit_logs;

-- Create a secure insert policy that validates the user can only log for their own actions
CREATE POLICY "audit_logs_insert_secure" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_belongs_to_company(company_id) AND 
    (user_id = auth.uid() OR user_id IS NULL)
  );

-- 12. API_KEYS: Remove duplicate policies and enforce admin-only
DROP POLICY IF EXISTS "Users can view their company api keys" ON public.api_keys;
DROP POLICY IF EXISTS "Users can manage their company api keys" ON public.api_keys;

-- Keep the existing admin-only policies (api_keys_select_admin, etc.)
