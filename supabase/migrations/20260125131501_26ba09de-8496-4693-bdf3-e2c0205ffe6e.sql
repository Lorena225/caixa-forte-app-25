
-- =====================================================
-- DATABASE OPTIMIZATION & SECURITY HARDENING MIGRATION
-- =====================================================

-- 1. PERFORMANCE INDEXES: Add composite indexes for high-volume tables
-- These indexes optimize dashboard queries with multi-tenant filtering

-- products: company_id + created_at for catalog listings
CREATE INDEX IF NOT EXISTS idx_products_company_created 
ON public.products (company_id, created_at DESC);

-- products: company_id + is_active for active product queries
CREATE INDEX IF NOT EXISTS idx_products_company_active 
ON public.products (company_id, is_active) WHERE is_active = true;

-- stock_movements: company_id + created_at for movement history
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_created 
ON public.stock_movements (company_id, created_at DESC);

-- stock_movements: company_id + product_id for product-specific queries
CREATE INDEX IF NOT EXISTS idx_stock_movements_company_product 
ON public.stock_movements (company_id, product_id);

-- bank_transactions: company_id + created_at for transaction listings
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_created 
ON public.bank_transactions (company_id, created_at DESC);

-- bank_transactions: company_id + reconciliation_status for pending transaction queries
CREATE INDEX IF NOT EXISTS idx_bank_transactions_company_recon_status 
ON public.bank_transactions (company_id, reconciliation_status);

-- ai_logs: Add index for company + agent_type queries
CREATE INDEX IF NOT EXISTS idx_ai_logs_company_agent 
ON public.ai_logs (company_id, agent_type);

-- ai_monitor_alerts: company_id + is_dismissed for active alerts
CREATE INDEX IF NOT EXISTS idx_ai_alerts_company_active 
ON public.ai_monitor_alerts (company_id, is_dismissed) WHERE is_dismissed = false;

-- dimension_values: company_id + dimension_id for dimension filtering
CREATE INDEX IF NOT EXISTS idx_dimension_values_company_dim 
ON public.dimension_values (company_id, dimension_id);

-- inventory_items: product_id for product lookups
CREATE INDEX IF NOT EXISTS idx_inventory_items_product 
ON public.inventory_items (product_id);

-- 2. RLS POLICY REVIEW: Ensure proper multi-tenant isolation
-- Tables with has_company_id=false need policies via FK relationships

-- inventory_items: Secure via inventory_id FK (inventories table has company_id)
DROP POLICY IF EXISTS "inventory_items_company_isolation" ON public.inventory_items;
CREATE POLICY "inventory_items_company_isolation" ON public.inventory_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.inventories inv
      WHERE inv.id = inventory_items.inventory_id
        AND inv.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- transaction_dimensions: Secure via transaction_id FK
DROP POLICY IF EXISTS "transaction_dimensions_company_isolation" ON public.transaction_dimensions;
CREATE POLICY "transaction_dimensions_company_isolation" ON public.transaction_dimensions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = transaction_dimensions.transaction_id
        AND t.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- allocation_rule_items: Secure via rule_id FK
DROP POLICY IF EXISTS "allocation_rule_items_company_isolation" ON public.allocation_rule_items;
CREATE POLICY "allocation_rule_items_company_isolation" ON public.allocation_rule_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.allocation_rules ar
      WHERE ar.id = allocation_rule_items.rule_id
        AND ar.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- bank_statement_lines: Secure via statement_id FK
DROP POLICY IF EXISTS "bank_statement_lines_company_isolation" ON public.bank_statement_lines;
CREATE POLICY "bank_statement_lines_company_isolation" ON public.bank_statement_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bank_statements bs
      WHERE bs.id = bank_statement_lines.statement_id
        AND bs.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- bank_matches: Secure via reconciliation_id FK
DROP POLICY IF EXISTS "bank_matches_company_isolation" ON public.bank_matches;
CREATE POLICY "bank_matches_company_isolation" ON public.bank_matches
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.bank_reconciliations br
      WHERE br.id = bank_matches.reconciliation_id
        AND br.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- ai_analyst_messages: Secure via conversation_id FK
DROP POLICY IF EXISTS "ai_analyst_messages_company_isolation" ON public.ai_analyst_messages;
CREATE POLICY "ai_analyst_messages_company_isolation" ON public.ai_analyst_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.ai_analyst_conversations ac
      WHERE ac.id = ai_analyst_messages.conversation_id
        AND ac.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- approval_steps: Secure via workflow_id FK
DROP POLICY IF EXISTS "approval_steps_company_isolation" ON public.approval_steps;
CREATE POLICY "approval_steps_company_isolation" ON public.approval_steps
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.approval_workflows aw
      WHERE aw.id = approval_steps.workflow_id
        AND aw.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- approval_actions: Secure via request_id FK
DROP POLICY IF EXISTS "approval_actions_company_isolation" ON public.approval_actions;
CREATE POLICY "approval_actions_company_isolation" ON public.approval_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.approval_requests ar
      WHERE ar.id = approval_actions.request_id
        AND ar.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- budget_lines: Secure via budget_id FK
DROP POLICY IF EXISTS "budget_lines_company_isolation" ON public.budget_lines;
CREATE POLICY "budget_lines_company_isolation" ON public.budget_lines
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.budget_master bm
      WHERE bm.id = budget_lines.budget_id
        AND bm.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- automation_logs: Secure via automation_id FK
DROP POLICY IF EXISTS "automation_logs_company_isolation" ON public.automation_logs;
CREATE POLICY "automation_logs_company_isolation" ON public.automation_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automations a
      WHERE a.id = automation_logs.automation_id
        AND a.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- 3. REFERENCE TABLES: Public read access for system data
-- banks_reference is a system reference table, allow read for authenticated
DROP POLICY IF EXISTS "banks_reference_read" ON public.banks_reference;
CREATE POLICY "banks_reference_read" ON public.banks_reference
  FOR SELECT TO authenticated USING (true);

-- api_rate_limits: Secure via api_key_id FK
DROP POLICY IF EXISTS "api_rate_limits_company_isolation" ON public.api_rate_limits;
CREATE POLICY "api_rate_limits_company_isolation" ON public.api_rate_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.api_keys ak
      WHERE ak.id = api_rate_limits.api_key_id
        AND ak.company_id IN (
          SELECT company_id FROM public.company_users WHERE user_id = auth.uid()
        )
    )
  );

-- 4. ANALYZE for query planner optimization
ANALYZE public.products;
ANALYZE public.stock_movements;
ANALYZE public.bank_transactions;
ANALYZE public.transactions;
ANALYZE public.ai_logs;
ANALYZE public.audit_logs;
