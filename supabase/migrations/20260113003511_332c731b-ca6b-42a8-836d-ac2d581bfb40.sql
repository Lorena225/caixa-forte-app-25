
-- Navigation Items (menu structure)
CREATE TABLE public.navigation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  label_default text NOT NULL,
  route text,
  icon text NOT NULL,
  parent_key text REFERENCES public.navigation_items(key) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  permission_key text,
  feature_flag_key text,
  hidden_by_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Navigation Profiles (role-based menu configurations)
CREATE TABLE public.navigation_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text UNIQUE NOT NULL,
  name text NOT NULL,
  default_route_key text NOT NULL,
  visible_keys_ordered text[] NOT NULL DEFAULT '{}',
  label_overrides jsonb NOT NULL DEFAULT '{}',
  quick_actions jsonb NOT NULL DEFAULT '[]',
  dashboard_layout jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- User Navigation Preferences (favorites, recents, collapsed state)
CREATE TABLE public.user_nav_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sidebar_collapsed boolean DEFAULT false,
  collapsed_groups text[] DEFAULT '{}',
  favorite_keys text[] DEFAULT '{}',
  recent_keys text[] DEFAULT '{}',
  active_profile_key text DEFAULT 'PROFILE_ADMIN',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Navigation Audit Log
CREATE TABLE public.navigation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_nav_items_parent ON public.navigation_items(parent_key);
CREATE INDEX idx_nav_items_sort ON public.navigation_items(sort_order);
CREATE INDEX idx_user_nav_prefs_user ON public.user_nav_preferences(user_id);
CREATE INDEX idx_user_nav_prefs_company ON public.user_nav_preferences(company_id);
CREATE INDEX idx_nav_audit_user ON public.navigation_audit_log(user_id);
CREATE INDEX idx_nav_audit_company ON public.navigation_audit_log(company_id);

-- Enable RLS
ALTER TABLE public.navigation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_nav_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for navigation_items (read-only for authenticated users)
CREATE POLICY "Navigation items are viewable by authenticated users"
ON public.navigation_items FOR SELECT TO authenticated USING (true);

-- RLS Policies for navigation_profiles (read-only for authenticated users)
CREATE POLICY "Navigation profiles are viewable by authenticated users"
ON public.navigation_profiles FOR SELECT TO authenticated USING (true);

-- RLS Policies for user_nav_preferences
CREATE POLICY "Users can view own nav preferences"
ON public.user_nav_preferences FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own nav preferences"
ON public.user_nav_preferences FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own nav preferences"
ON public.user_nav_preferences FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- RLS Policies for navigation_audit_log (company-scoped read)
CREATE POLICY "Users can view audit logs for their companies"
ON public.navigation_audit_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_users cu
    WHERE cu.company_id = navigation_audit_log.company_id
    AND cu.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert audit logs"
ON public.navigation_audit_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_navigation_items_updated_at
  BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_navigation_profiles_updated_at
  BEFORE UPDATE ON public.navigation_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_nav_preferences_updated_at
  BEFORE UPDATE ON public.user_nav_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed Navigation Items
INSERT INTO public.navigation_items (key, label_default, route, icon, parent_key, sort_order, permission_key, feature_flag_key, hidden_by_default) VALUES
-- Groups
('group.home', 'Visão Geral', NULL, 'LayoutDashboard', NULL, 10, 'dashboards.view.branch', NULL, false),
('group.operation', 'Operação Financeira', NULL, 'ReceiptText', NULL, 20, 'finance.view.branch', NULL, false),
('group.erp', 'Módulos ERP', NULL, 'Blocks', NULL, 30, 'erp.view.company', NULL, false),
('group.analytics', 'Análises', NULL, 'BarChart3', NULL, 40, 'reports.view.branch', NULL, false),
('group.planning', 'Planejamento', NULL, 'CalendarClock', NULL, 50, 'planning.view.company', NULL, false),
('group.ai', 'Automação & IA', NULL, 'Sparkles', NULL, 60, 'ai.view.company', 'feature_ai', false),
('group.masterdata', 'Cadastros', NULL, 'Database', NULL, 70, 'masterdata.view.company', NULL, false),
('group.integrations', 'Integrações', NULL, 'Plug', NULL, 80, 'integrations.view.company', NULL, false),
('group.admin', 'Administração', NULL, 'Settings', NULL, 90, 'settings.view.company', NULL, false),

-- Home items
('home.overview', 'Visão Geral', '/dashboards/executivo', 'LayoutDashboard', 'group.home', 11, 'dashboards.view.branch', NULL, false),

-- Operation items
('op.transactions', 'Lançamentos', '/lancamentos', 'ReceiptText', 'group.operation', 21, 'transactions.view.branch', NULL, false),
('op.ar', 'Contas a Receber', '/contas-receber', 'ArrowDownToLine', 'group.operation', 22, 'ar.view.branch', NULL, false),
('op.ap', 'Contas a Pagar', '/contas-pagar', 'ArrowUpFromLine', 'group.operation', 23, 'ap.view.branch', NULL, false),
('op.cashflow', 'Fluxo de Caixa', '/fluxo-caixa', 'Wallet', 'group.operation', 24, 'cashflow.view.branch', NULL, false),
('op.dre', 'Resultado (DRE)', '/dre', 'TrendingUp', 'group.operation', 25, 'dre.view.branch', NULL, false),
('op.goals', 'Metas', '/metas', 'Target', 'group.operation', 26, 'goals.view.company', 'feature_goals', false),
('op.cards', 'Cartões', '/cartoes', 'CreditCard', 'group.operation', 27, 'cards.view.branch', 'feature_cards', false),

-- ERP items
('erp.accounting', 'Contabilidade', '/contabilidade', 'BookOpen', 'group.erp', 31, 'gl.view.company', 'feature_gl', false),
('erp.treasury', 'Tesouraria', '/tesouraria', 'Landmark', 'group.erp', 32, 'treasury.view.branch', 'feature_treasury', false),
('erp.fiscal', 'Fiscal', '/fiscal', 'FileCheck2', 'group.erp', 33, 'fiscal.view.company', 'feature_fiscal', false),

-- Analytics items
('analytics.panels', 'Painéis', NULL, 'BarChart3', 'group.analytics', 41, 'dashboards.view.branch', NULL, false),
('analytics.panels.executive', 'Executivo', '/dashboards/executivo', 'Gauge', 'analytics.panels', 411, 'dashboards.view.branch', NULL, false),
('analytics.panels.cashflow', 'Caixa', '/dashboards/fluxo-caixa', 'LineChart', 'analytics.panels', 412, 'dashboards.view.branch', NULL, false),
('analytics.panels.ar', 'Receber (AR)', '/dashboards/ar', 'ChartColumn', 'analytics.panels', 413, 'dashboards.view.branch', NULL, false),
('analytics.panels.ap', 'Pagar (AP)', '/dashboards/ap', 'ChartColumn', 'analytics.panels', 414, 'dashboards.view.branch', NULL, false),
('analytics.panels.budget', 'Orçamento', '/dashboards/budget', 'PieChart', 'analytics.panels', 415, 'budget.view.branch', 'feature_budget', false),
('analytics.reports', 'Relatórios', '/reports', 'FileBarChart', 'group.analytics', 42, 'reports.view.branch', NULL, false),

-- Planning items
('planning.goals', 'Metas', '/metas', 'Target', 'group.planning', 51, 'goals.view.company', 'feature_goals', false),
('planning.budget', 'Orçamento', '/dashboards/budget-accounts', 'Calculator', 'group.planning', 52, 'budget.view.branch', 'feature_budget', false),

-- AI items
('ai.inbox', 'Inbox (Pendências)', '/autopilot/inbox', 'Inbox', 'group.ai', 61, 'ai.inbox.view.branch', 'feature_ai', false),
('ai.whatsapp', 'WhatsApp', '/autopilot/whatsapp-config', 'MessageCircle', 'group.ai', 62, 'ai.whatsapp.view.branch', 'feature_ai', false),
('ai.autopilot', 'Autopilot (IA)', '/autopilot/pending', 'Bot', 'group.ai', 63, 'ai.execute.branch', 'feature_ai', false),
('ai.rules', 'Regras', '/autopilot/rules', 'Wand2', 'group.ai', 64, 'ai.configure.company', 'feature_ai', false),

-- Master Data items
('md.accounts', 'Plano de Contas', '/cadastros/plano-contas', 'ListTree', 'group.masterdata', 71, 'masterdata.accounts.view.company', NULL, false),
('md.costcenters', 'Centros de Custo', '/cadastros/centros-custo', 'Network', 'group.masterdata', 72, 'masterdata.cost_centers.view.company', NULL, false),
('md.counterparties', 'Clientes & Fornecedores', '/cadastros/clientes-fornecedores', 'Users', 'group.masterdata', 73, 'masterdata.counterparties.view.company', NULL, false),
('md.wallets', 'Contas & Cartões', '/cadastros/carteiras', 'Landmark', 'group.masterdata', 74, 'masterdata.wallets.view.company', NULL, false),
('md.dimensions', 'Dimensões', '/cadastros/dimensoes', 'Layers', 'group.masterdata', 75, 'masterdata.dimensions.view.company', NULL, false),

-- Integrations items
('int.hub', 'Integrações (Hub)', '/integracoes', 'Plug', 'group.integrations', 81, 'integrations.view.company', NULL, false),
('int.chatgpt', 'IA (ChatGPT)', '/integracoes/ia-config', 'Sparkles', 'group.integrations', 82, 'ai.configure.company', 'feature_ai', false),
('int.importexport', 'Importar / Exportar', '/importar-exportar', 'ArrowLeftRight', 'group.integrations', 83, 'import_export.view.company', NULL, false),

-- Admin items
('admin.settings', 'Configurações', '/admin', 'Settings', 'group.admin', 91, 'settings.view.company', NULL, false),
('admin.navigation', 'Navegação', '/admin/navigation', 'PanelLeft', 'group.admin', 92, 'settings.configure.company', NULL, false),

-- System (hidden)
('system.drilldown', 'Drill-down (interno)', '/reports/drilldown', 'Search', NULL, 999, 'reports.view.branch', NULL, true);

-- Seed Navigation Profiles
INSERT INTO public.navigation_profiles (profile_key, name, default_route_key, visible_keys_ordered, label_overrides, quick_actions, dashboard_layout) VALUES
('PROFILE_AP_OPERATOR', 'Operação — AP', 'op.ap', 
  ARRAY['home.overview','op.ap','op.transactions','op.cashflow','ai.inbox','analytics.reports','md.counterparties','md.wallets'],
  '{"op.ap":"Pagamentos","md.counterparties":"Fornecedores","op.cashflow":"Caixa"}',
  '[{"key":"qa.new_ap","label":"Novo título a pagar","route":"/contas-pagar?action=new","permission_key":"ap.create.branch","icon":"Plus"},{"key":"qa.pay_ap","label":"Baixar pagamento","route":"/contas-pagar?action=settle","permission_key":"ap.pay.branch","icon":"CheckCircle2"},{"key":"qa.export_ap","label":"Exportar contas a pagar","route":"/reports/drilldown?source=ap","permission_key":"reports.export.branch","icon":"Download"}]',
  '{"default_filters":{"date_preset":"MTD","scope":"branch"},"widgets_order":["kpi.ap_total","kpi.ap_next_7_days","chart.ap_aging","kpi.cash_balance","chart.cashflow_monthly","panel.reports_shortcuts"]}'
),
('PROFILE_AR_OPERATOR', 'Operação — AR', 'op.ar',
  ARRAY['home.overview','op.ar','op.transactions','op.cashflow','ai.inbox','analytics.reports','md.counterparties'],
  '{"op.ar":"Cobranças","md.counterparties":"Clientes","op.cashflow":"Caixa"}',
  '[{"key":"qa.new_ar","label":"Novo título a receber","route":"/contas-receber?action=new","permission_key":"ar.create.branch","icon":"Plus"},{"key":"qa.collect_whatsapp","label":"Enviar cobrança (WhatsApp)","route":"/autopilot/whatsapp-config","permission_key":"ai.whatsapp.execute.branch","icon":"MessageCircle"},{"key":"qa.export_ar","label":"Exportar contas a receber","route":"/reports/drilldown?source=ar","permission_key":"reports.export.branch","icon":"Download"}]',
  '{"default_filters":{"date_preset":"MTD","scope":"branch"},"widgets_order":["kpi.ar_total","kpi.ar_overdue","chart.ar_aging","kpi.cash_balance","chart.cashflow_monthly","panel.reports_shortcuts"]}'
),
('PROFILE_TREASURY', 'Tesouraria', 'erp.treasury',
  ARRAY['home.overview','erp.treasury','op.cashflow','op.cards','op.ap','op.ar','op.transactions','analytics.panels.cashflow','analytics.reports','ai.inbox'],
  '{"op.cashflow":"Caixa & Bancos","op.cards":"Recebíveis (Cartões)","op.ap":"A Pagar","op.ar":"A Receber"}',
  '[{"key":"qa.import_statement","label":"Importar extrato","route":"/importar-exportar?tab=extrato","permission_key":"bank.import.branch","icon":"Upload"},{"key":"qa.reconcile","label":"Conciliar pendências","route":"/tesouraria/conciliacao","permission_key":"bank.reconcile.branch","icon":"Link2"},{"key":"qa.payment_run","label":"Gerar pagamentos (CNAB)","route":"/tesouraria/cnab","permission_key":"cnab.generate.branch","icon":"FileUp"}]',
  '{"default_filters":{"date_preset":"LAST_30_DAYS","scope":"branch"},"widgets_order":["kpi.cash_balance","chart.cashflow_monthly","chart.projection_13w","kpi.ap_next_7_days","kpi.ar_total","panel.reports_shortcuts"]}'
),
('PROFILE_MANAGEMENT', 'Gestão (CFO/CEO)', 'home.overview',
  ARRAY['home.overview','analytics.panels.executive','analytics.panels.cashflow','analytics.panels.ar','analytics.panels.ap','analytics.panels.budget','analytics.reports','planning.budget','planning.goals','ai.inbox'],
  '{"analytics.reports":"Relatórios (CFO)","analytics.panels.cashflow":"Caixa","ai.inbox":"Alertas & Pendências"}',
  '[{"key":"qa.export_exec_pdf","label":"Exportar PDF executivo","route":"/reports/drilldown?dashboard=executivo&format=pdf","permission_key":"dashboards.export.branch","icon":"FileDown"},{"key":"qa.budget_variance","label":"Ver desvios do orçamento","route":"/dashboards/budget?view=variance","permission_key":"budget.view.branch","icon":"Activity"},{"key":"qa.ar_overdue","label":"Ver inadimplência","route":"/contas-receber?status=overdue","permission_key":"ar.view.branch","icon":"AlertTriangle"}]',
  '{"default_filters":{"date_preset":"MTD","scope":"company"},"widgets_order":["kpi.cash_balance","kpi.net_result","kpi.revenue_period","kpi.expenses_period","kpi.ar_overdue","kpi.ap_total","kpi.budget_vs_actual","chart.cashflow_monthly","chart.projection_13w","chart.ar_aging","chart.ap_aging","panel.reports_shortcuts"]}'
),
('PROFILE_ACCOUNTING', 'Contábil', 'erp.accounting',
  ARRAY['erp.accounting','analytics.reports','op.transactions','md.accounts','md.costcenters','md.dimensions','ai.inbox'],
  '{"analytics.reports":"Relatórios Contábeis","op.transactions":"Lançamentos (consulta)"}',
  '[{"key":"qa.trial_balance","label":"Gerar balancete","route":"/contabilidade/balancete","permission_key":"reports.view.company","icon":"FileBarChart"},{"key":"qa.ledger","label":"Exportar razão","route":"/contabilidade/razao","permission_key":"reports.export.company","icon":"Download"},{"key":"qa.close_period","label":"Fechar período","route":"/contabilidade/fechamento","permission_key":"gl.close.company","icon":"Lock"}]',
  '{"default_filters":{"date_preset":"MTD","scope":"company"},"widgets_order":["kpi.net_result","kpi.revenue_period","kpi.expenses_period","panel.reports_shortcuts"]}'
),
('PROFILE_ADMIN', 'Admin', 'admin.settings',
  ARRAY['home.overview','op.transactions','op.ar','op.ap','op.cashflow','op.dre','op.goals','op.cards','erp.accounting','erp.treasury','erp.fiscal','analytics.panels.executive','analytics.panels.cashflow','analytics.panels.ar','analytics.panels.ap','analytics.panels.budget','analytics.reports','planning.goals','planning.budget','ai.inbox','ai.whatsapp','ai.autopilot','ai.rules','md.accounts','md.costcenters','md.counterparties','md.wallets','md.dimensions','int.hub','int.chatgpt','int.importexport','admin.settings','admin.navigation'],
  '{}',
  '[{"key":"qa.users_roles","label":"Usuários & Permissões","route":"/admin/users","permission_key":"settings.configure.company","icon":"Shield"},{"key":"qa.nav_config","label":"Configurar navegação","route":"/admin/navigation","permission_key":"settings.configure.company","icon":"PanelLeft"},{"key":"qa.integrations","label":"Configurar integrações","route":"/integracoes","permission_key":"integrations.configure.company","icon":"Plug"}]',
  '{"default_filters":{"date_preset":"MTD","scope":"company"},"widgets_order":["kpi.cash_balance","kpi.net_result","kpi.ar_overdue","kpi.ap_total","chart.cashflow_monthly","panel.reports_shortcuts"]}'
);
