-- =====================================================
-- FIX ALL RLS POLICIES - PART 1
-- =====================================================

-- =====================================================
-- 1. COMPANIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Users can view their companies" ON public.companies;
DROP POLICY IF EXISTS "Users can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can insert companies" ON public.companies;
DROP POLICY IF EXISTS "Admins can update their companies" ON public.companies;

CREATE POLICY "Users can view their companies"
ON public.companies FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(id));

CREATE POLICY "Admins can update their companies"
ON public.companies FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users
    WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND role = 'admin'
  )
);

-- =====================================================
-- 2. CARD_SALES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view card sales" ON public.card_sales;
DROP POLICY IF EXISTS "Company users can insert card sales" ON public.card_sales;
DROP POLICY IF EXISTS "Company users can update card sales" ON public.card_sales;

CREATE POLICY "Company users can view card sales"
ON public.card_sales FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert card sales"
ON public.card_sales FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update card sales"
ON public.card_sales FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 3. CARD_RECEIVABLES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view card receivables" ON public.card_receivables;
DROP POLICY IF EXISTS "Company users can insert card receivables" ON public.card_receivables;
DROP POLICY IF EXISTS "Company users can update card receivables" ON public.card_receivables;

CREATE POLICY "Company users can view card receivables"
ON public.card_receivables FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert card receivables"
ON public.card_receivables FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update card receivables"
ON public.card_receivables FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 4. CARD_SETTLEMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view card settlements" ON public.card_settlements;
DROP POLICY IF EXISTS "Company users can insert card settlements" ON public.card_settlements;
DROP POLICY IF EXISTS "Company users can update card settlements" ON public.card_settlements;

CREATE POLICY "Company users can view card settlements"
ON public.card_settlements FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert card settlements"
ON public.card_settlements FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update card settlements"
ON public.card_settlements FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 5. BOLETOS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view boletos" ON public.boletos;
DROP POLICY IF EXISTS "Company users can insert boletos" ON public.boletos;
DROP POLICY IF EXISTS "Company users can update boletos" ON public.boletos;
DROP POLICY IF EXISTS "Company users can delete boletos" ON public.boletos;

CREATE POLICY "Company users can view boletos"
ON public.boletos FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert boletos"
ON public.boletos FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update boletos"
ON public.boletos FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can delete boletos"
ON public.boletos FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 6. BOLETO_EVENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view boleto events" ON public.boleto_events;
DROP POLICY IF EXISTS "Company users can insert boleto events" ON public.boleto_events;

CREATE POLICY "Company users can view boleto events"
ON public.boleto_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.boletos b
    WHERE b.id = boleto_events.boleto_id
      AND public.user_belongs_to_company(b.company_id)
  )
);

CREATE POLICY "Company users can insert boleto events"
ON public.boleto_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.boletos b
    WHERE b.id = boleto_events.boleto_id
      AND public.user_belongs_to_company(b.company_id)
  )
);

-- =====================================================
-- 7. TRANSACTIONS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Company users can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Company users can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Company users can delete transactions" ON public.transactions;

CREATE POLICY "Company users can view transactions"
ON public.transactions FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert transactions"
ON public.transactions FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update transactions"
ON public.transactions FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can delete transactions"
ON public.transactions FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 8. FUNCIONARIOS TABLE (Employee PII)
-- =====================================================
DROP POLICY IF EXISTS "Company users can view funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can insert funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can update funcionarios" ON public.funcionarios;
DROP POLICY IF EXISTS "Company users can delete funcionarios" ON public.funcionarios;

CREATE POLICY "Company users can view funcionarios"
ON public.funcionarios FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert funcionarios"
ON public.funcionarios FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update funcionarios"
ON public.funcionarios FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can delete funcionarios"
ON public.funcionarios FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 9. BANK_STATEMENTS TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view bank statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Company users can insert bank statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Company users can update bank statements" ON public.bank_statements;
DROP POLICY IF EXISTS "Company users can delete bank statements" ON public.bank_statements;

CREATE POLICY "Company users can view bank statements"
ON public.bank_statements FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert bank statements"
ON public.bank_statements FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update bank statements"
ON public.bank_statements FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can delete bank statements"
ON public.bank_statements FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 10. BANK_STATEMENT_LINES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view bank statement lines" ON public.bank_statement_lines;
DROP POLICY IF EXISTS "Company users can insert bank statement lines" ON public.bank_statement_lines;
DROP POLICY IF EXISTS "Company users can update bank statement lines" ON public.bank_statement_lines;

CREATE POLICY "Company users can view bank statement lines"
ON public.bank_statement_lines FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_statements bs
    WHERE bs.id = bank_statement_lines.statement_id
      AND public.user_belongs_to_company(bs.company_id)
  )
);

CREATE POLICY "Company users can insert bank statement lines"
ON public.bank_statement_lines FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.bank_statements bs
    WHERE bs.id = bank_statement_lines.statement_id
      AND public.user_belongs_to_company(bs.company_id)
  )
);

CREATE POLICY "Company users can update bank statement lines"
ON public.bank_statement_lines FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.bank_statements bs
    WHERE bs.id = bank_statement_lines.statement_id
      AND public.user_belongs_to_company(bs.company_id)
  )
);

-- =====================================================
-- 11. COUNTERPARTIES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can insert counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can update counterparties" ON public.counterparties;
DROP POLICY IF EXISTS "Company users can delete counterparties" ON public.counterparties;

CREATE POLICY "Company users can view counterparties"
ON public.counterparties FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert counterparties"
ON public.counterparties FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update counterparties"
ON public.counterparties FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can delete counterparties"
ON public.counterparties FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 12. CUSTOMER_INVOICES TABLE
-- =====================================================
DROP POLICY IF EXISTS "Company users can view customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Company users can insert customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Company users can update customer invoices" ON public.customer_invoices;
DROP POLICY IF EXISTS "Company users can delete customer invoices" ON public.customer_invoices;

CREATE POLICY "Company users can view customer invoices"
ON public.customer_invoices FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can insert customer invoices"
ON public.customer_invoices FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can update customer invoices"
ON public.customer_invoices FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Company users can delete customer invoices"
ON public.customer_invoices FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- 13. CUSTOMER_INVOICE_LINES TABLE (correct column name)
-- =====================================================
DROP POLICY IF EXISTS "Company users can view invoice lines" ON public.customer_invoice_lines;
DROP POLICY IF EXISTS "Company users can insert invoice lines" ON public.customer_invoice_lines;
DROP POLICY IF EXISTS "Company users can update invoice lines" ON public.customer_invoice_lines;
DROP POLICY IF EXISTS "Company users can delete invoice lines" ON public.customer_invoice_lines;

CREATE POLICY "Company users can view invoice lines"
ON public.customer_invoice_lines FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_lines.customer_invoice_id
      AND public.user_belongs_to_company(ci.company_id)
  )
);

CREATE POLICY "Company users can insert invoice lines"
ON public.customer_invoice_lines FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_lines.customer_invoice_id
      AND public.user_belongs_to_company(ci.company_id)
  )
);

CREATE POLICY "Company users can update invoice lines"
ON public.customer_invoice_lines FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_lines.customer_invoice_id
      AND public.user_belongs_to_company(ci.company_id)
  )
);

CREATE POLICY "Company users can delete invoice lines"
ON public.customer_invoice_lines FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.customer_invoices ci
    WHERE ci.id = customer_invoice_lines.customer_invoice_id
      AND public.user_belongs_to_company(ci.company_id)
  )
);