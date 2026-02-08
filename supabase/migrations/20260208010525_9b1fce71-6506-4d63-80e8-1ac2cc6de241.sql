-- =====================================================
-- CRM MODULE: Schema com função corrigida para enum user_role
-- =====================================================

-- 1. NEW ENUMS (if not exist)
DO $$ BEGIN
    CREATE TYPE public.quote_status AS ENUM ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE public.territory_type AS ENUM ('geographic', 'industry', 'product', 'account_size');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. SALES HIERARCHY & TERRITORIES
CREATE TABLE IF NOT EXISTS public.sales_territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    territory_type territory_type DEFAULT 'geographic',
    parent_id UUID REFERENCES public.sales_territories(id),
    states TEXT[],
    cities TEXT[],
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    territory_id UUID REFERENCES public.sales_territories(id),
    manager_id UUID REFERENCES public.user_profiles(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sales_team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.sales_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(team_id, user_id)
);

-- 3. CRM PIPELINES & STAGES
CREATE TABLE IF NOT EXISTS public.crm_pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    pipeline_type TEXT DEFAULT 'sales',
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    won_action_type TEXT DEFAULT 'manual',
    won_create_order BOOLEAN DEFAULT true,
    won_create_cashflow BOOLEAN DEFAULT true,
    won_create_stock_order BOOLEAN DEFAULT false,
    won_create_project BOOLEAN DEFAULT false,
    won_project_template_id UUID,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES public.crm_pipelines(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    stage_type TEXT DEFAULT 'open',
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),
    rotting_days INTEGER,
    color TEXT DEFAULT '#3B82F6',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. EXPAND OPPORTUNITIES TABLE
ALTER TABLE public.opportunities 
    ADD COLUMN IF NOT EXISTS pipeline_id UUID REFERENCES public.crm_pipelines(id),
    ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.sales_teams(id),
    ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.sales_territories(id),
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.user_profiles(id),
    ADD COLUMN IF NOT EXISTS contact_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS source_campaign TEXT,
    ADD COLUMN IF NOT EXISTS source_referral TEXT,
    ADD COLUMN IF NOT EXISTS loss_competitor TEXT,
    ADD COLUMN IF NOT EXISTS is_rotting BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS converted_quote_id UUID,
    ADD COLUMN IF NOT EXISTS converted_order_id UUID,
    ADD COLUMN IF NOT EXISTS converted_project_id UUID REFERENCES public.projects(id),
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

-- 5. EXPAND ACTIVITIES TABLE
ALTER TABLE public.crm_activities
    ADD COLUMN IF NOT EXISTS direction TEXT,
    ADD COLUMN IF NOT EXISTS from_address TEXT,
    ADD COLUMN IF NOT EXISTS to_address TEXT,
    ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS message_id TEXT,
    ADD COLUMN IF NOT EXISTS channel_id TEXT,
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.user_profiles(id),
    ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES public.user_profiles(id);

-- 6. CPQ - PRICE BOOKS
CREATE TABLE IF NOT EXISTS public.price_books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    book_type TEXT DEFAULT 'standard',
    currency TEXT DEFAULT 'BRL',
    is_default BOOLEAN DEFAULT false,
    valid_from DATE,
    valid_until DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS public.price_book_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    price_book_id UUID NOT NULL REFERENCES public.price_books(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    unit_price NUMERIC(15,2) NOT NULL,
    min_quantity NUMERIC(15,4) DEFAULT 1,
    max_discount_percent NUMERIC(5,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(price_book_id, product_id)
);

-- 7. CPQ - DISCOUNT APPROVAL RULES
CREATE TABLE IF NOT EXISTS public.discount_approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    min_discount_percent NUMERIC(5,2) NOT NULL,
    max_discount_percent NUMERIC(5,2),
    approver_role TEXT NOT NULL,
    approver_user_id UUID REFERENCES public.user_profiles(id),
    requires_justification BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 8. CPQ - QUOTES (Propostas Comerciais)
CREATE TABLE IF NOT EXISTS public.quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    opportunity_id UUID REFERENCES public.opportunities(id),
    counterparty_id UUID REFERENCES public.counterparties(id),
    quote_number TEXT NOT NULL,
    revision INTEGER DEFAULT 1,
    title TEXT,
    price_book_id UUID REFERENCES public.price_books(id),
    subtotal NUMERIC(15,2) DEFAULT 0,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    tax_icms NUMERIC(15,2) DEFAULT 0,
    tax_icms_st NUMERIC(15,2) DEFAULT 0,
    tax_ipi NUMERIC(15,2) DEFAULT 0,
    tax_pis NUMERIC(15,2) DEFAULT 0,
    tax_cofins NUMERIC(15,2) DEFAULT 0,
    tax_iss NUMERIC(15,2) DEFAULT 0,
    total_taxes NUMERIC(15,2) DEFAULT 0,
    shipping_cost NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    net_amount NUMERIC(15,2) DEFAULT 0,
    payment_terms TEXT,
    payment_condition_id UUID,
    delivery_terms TEXT,
    validity_days INTEGER DEFAULT 30,
    valid_until DATE,
    status quote_status DEFAULT 'draft',
    requires_approval BOOLEAN DEFAULT false,
    approval_status TEXT,
    approved_by UUID REFERENCES public.user_profiles(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    customer_notes TEXT,
    converted_to_order_id UUID,
    converted_at TIMESTAMPTZ,
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    owner_id UUID REFERENCES public.user_profiles(id),
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id),
    description TEXT NOT NULL,
    quantity NUMERIC(15,4) NOT NULL DEFAULT 1,
    unit TEXT DEFAULT 'UN',
    unit_price NUMERIC(15,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    discount_amount NUMERIC(15,2) DEFAULT 0,
    ncm_code TEXT,
    cfop TEXT,
    tax_icms_rate NUMERIC(5,2) DEFAULT 0,
    tax_icms_amount NUMERIC(15,2) DEFAULT 0,
    tax_icms_st_amount NUMERIC(15,2) DEFAULT 0,
    tax_ipi_rate NUMERIC(5,2) DEFAULT 0,
    tax_ipi_amount NUMERIC(15,2) DEFAULT 0,
    tax_pis_rate NUMERIC(5,4) DEFAULT 0,
    tax_pis_amount NUMERIC(15,2) DEFAULT 0,
    tax_cofins_rate NUMERIC(5,4) DEFAULT 0,
    tax_cofins_amount NUMERIC(15,2) DEFAULT 0,
    total_amount NUMERIC(15,2) DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 9. EXPAND SALES_GOALS
ALTER TABLE public.sales_goals
    ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES public.sales_territories(id),
    ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES public.products(id),
    ADD COLUMN IF NOT EXISTS product_category TEXT,
    ADD COLUMN IF NOT EXISTS target_revenue NUMERIC(15,2),
    ADD COLUMN IF NOT EXISTS target_deals INTEGER,
    ADD COLUMN IF NOT EXISTS target_new_customers INTEGER,
    ADD COLUMN IF NOT EXISTS target_activities INTEGER,
    ADD COLUMN IF NOT EXISTS actual_revenue NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_deals INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_new_customers INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS actual_activities INTEGER DEFAULT 0;

-- 10. LEAD DISTRIBUTION (Round Robin)
CREATE TABLE IF NOT EXISTS public.lead_distribution_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES public.crm_pipelines(id),
    team_id UUID REFERENCES public.sales_teams(id),
    distribution_method TEXT DEFAULT 'round_robin',
    enabled BOOLEAN DEFAULT true,
    max_open_leads_per_user INTEGER DEFAULT 50,
    respect_working_hours BOOLEAN DEFAULT true,
    working_hours_start TIME DEFAULT '08:00',
    working_hours_end TIME DEFAULT '18:00',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(company_id, pipeline_id)
);

CREATE TABLE IF NOT EXISTS public.lead_distribution_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id UUID NOT NULL REFERENCES public.lead_distribution_config(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id),
    is_available BOOLEAN DEFAULT true,
    last_assigned_at TIMESTAMPTZ,
    total_assigned INTEGER DEFAULT 0,
    current_open_leads INTEGER DEFAULT 0,
    weight INTEGER DEFAULT 1,
    sort_order INTEGER DEFAULT 0
);

-- 11. OMNICHANNEL INBOX
CREATE TABLE IF NOT EXISTS public.crm_inbox_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    channel_type TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_inbox_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES public.crm_inbox_channels(id),
    opportunity_id UUID REFERENCES public.opportunities(id),
    counterparty_id UUID REFERENCES public.counterparties(id),
    contact_identifier TEXT NOT NULL,
    contact_name TEXT,
    status TEXT DEFAULT 'open',
    priority TEXT DEFAULT 'normal',
    assigned_to UUID REFERENCES public.user_profiles(id),
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.crm_inbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.crm_inbox_conversations(id) ON DELETE CASCADE,
    direction TEXT NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text',
    attachments JSONB DEFAULT '[]',
    external_id TEXT,
    sent_at TIMESTAMPTZ DEFAULT now(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    sender_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline ON public.opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_team ON public.opportunities(team_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner ON public.opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_stages_pipeline ON public.crm_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity ON public.quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_inbox_conversations_company ON public.crm_inbox_conversations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_conversation ON public.crm_inbox_messages(conversation_id, sent_at DESC);

-- =====================================================
-- RLS POLICIES
-- =====================================================
ALTER TABLE public.sales_territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_book_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_approval_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_distribution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_distribution_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_inbox_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_inbox_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_inbox_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is sales director (using correct enum values: admin, gestor, visualizador)
CREATE OR REPLACE FUNCTION public.is_sales_director(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM company_users cu
        WHERE cu.user_id = p_user_id
        AND cu.company_id = p_company_id
        AND cu.role::text IN ('admin', 'gestor')
    );
$$;

-- Helper function: Check if user is team manager
CREATE OR REPLACE FUNCTION public.is_team_manager(p_user_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM sales_teams st
        WHERE st.id = p_team_id
        AND st.manager_id = p_user_id
    ) OR EXISTS (
        SELECT 1 FROM sales_team_members stm
        WHERE stm.team_id = p_team_id
        AND stm.user_id = p_user_id
        AND stm.role IN ('leader', 'manager')
    );
$$;

-- Company-level policies
DROP POLICY IF EXISTS "Pipelines: Company access" ON public.crm_pipelines;
CREATE POLICY "Pipelines: Company access" ON public.crm_pipelines FOR ALL USING (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Stages: Pipeline access" ON public.crm_stages;
CREATE POLICY "Stages: Pipeline access" ON public.crm_stages FOR ALL USING (EXISTS (SELECT 1 FROM crm_pipelines p WHERE p.id = pipeline_id AND user_belongs_to_company(p.company_id)));

DROP POLICY IF EXISTS "Territories: Company access" ON public.sales_territories;
CREATE POLICY "Territories: Company access" ON public.sales_territories FOR ALL USING (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Teams: Company access" ON public.sales_teams;
CREATE POLICY "Teams: Company access" ON public.sales_teams FOR ALL USING (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Team Members: Team access" ON public.sales_team_members;
CREATE POLICY "Team Members: Team access" ON public.sales_team_members FOR ALL USING (EXISTS (SELECT 1 FROM sales_teams t WHERE t.id = team_id AND user_belongs_to_company(t.company_id)));

DROP POLICY IF EXISTS "Price Books: Company access" ON public.price_books;
CREATE POLICY "Price Books: Company access" ON public.price_books FOR ALL USING (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Price Book Items: Book access" ON public.price_book_items;
CREATE POLICY "Price Book Items: Book access" ON public.price_book_items FOR ALL USING (EXISTS (SELECT 1 FROM price_books pb WHERE pb.id = price_book_id AND user_belongs_to_company(pb.company_id)));

DROP POLICY IF EXISTS "Discount Rules: Company access" ON public.discount_approval_rules;
CREATE POLICY "Discount Rules: Company access" ON public.discount_approval_rules FOR ALL USING (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Lead Config: Company access" ON public.lead_distribution_config;
CREATE POLICY "Lead Config: Company access" ON public.lead_distribution_config FOR ALL USING (user_belongs_to_company(company_id));

DROP POLICY IF EXISTS "Lead Queue: Config access" ON public.lead_distribution_queue;
CREATE POLICY "Lead Queue: Config access" ON public.lead_distribution_queue FOR ALL USING (EXISTS (SELECT 1 FROM lead_distribution_config c WHERE c.id = config_id AND user_belongs_to_company(c.company_id)));

DROP POLICY IF EXISTS "Inbox Channels: Company access" ON public.crm_inbox_channels;
CREATE POLICY "Inbox Channels: Company access" ON public.crm_inbox_channels FOR ALL USING (user_belongs_to_company(company_id));

-- Quotes RLS
DROP POLICY IF EXISTS "Quotes: Hierarchical access" ON public.quotes;
CREATE POLICY "Quotes: Hierarchical access" ON public.quotes
    FOR ALL USING (
        user_belongs_to_company(company_id)
        AND (
            owner_id IS NULL
            OR owner_id = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR is_sales_director(auth.uid(), company_id)
        )
    );

DROP POLICY IF EXISTS "Quote Items: Quote access" ON public.quote_items;
CREATE POLICY "Quote Items: Quote access" ON public.quote_items
    FOR ALL USING (EXISTS (SELECT 1 FROM quotes q WHERE q.id = quote_id AND user_belongs_to_company(q.company_id)));

-- Inbox RLS
DROP POLICY IF EXISTS "Inbox Conversations: Assigned or director" ON public.crm_inbox_conversations;
CREATE POLICY "Inbox Conversations: Assigned or director" ON public.crm_inbox_conversations
    FOR ALL USING (
        user_belongs_to_company(company_id)
        AND (
            assigned_to IS NULL
            OR assigned_to = (SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1)
            OR is_sales_director(auth.uid(), company_id)
        )
    );

DROP POLICY IF EXISTS "Inbox Messages: Conversation access" ON public.crm_inbox_messages;
CREATE POLICY "Inbox Messages: Conversation access" ON public.crm_inbox_messages
    FOR ALL USING (EXISTS (
        SELECT 1 FROM crm_inbox_conversations c
        WHERE c.id = conversation_id
        AND user_belongs_to_company(c.company_id)
    ));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_year TEXT;
    v_seq INTEGER;
BEGIN
    v_year := TO_CHAR(NOW(), 'YYYY');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM 'PROP-\d{4}-(\d+)') AS INTEGER)), 0) + 1
    INTO v_seq
    FROM quotes
    WHERE company_id = NEW.company_id
    AND quote_number LIKE 'PROP-' || v_year || '-%';
    
    NEW.quote_number := 'PROP-' || v_year || '-' || LPAD(v_seq::TEXT, 5, '0');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_quotes_generate_number ON public.quotes;
CREATE TRIGGER tr_quotes_generate_number
    BEFORE INSERT ON public.quotes
    FOR EACH ROW
    WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
    EXECUTE FUNCTION generate_quote_number();

-- Timestamp triggers
DROP TRIGGER IF EXISTS tr_sales_territories_updated ON public.sales_territories;
CREATE TRIGGER tr_sales_territories_updated BEFORE UPDATE ON public.sales_territories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_sales_teams_updated ON public.sales_teams;
CREATE TRIGGER tr_sales_teams_updated BEFORE UPDATE ON public.sales_teams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_crm_pipelines_updated ON public.crm_pipelines;
CREATE TRIGGER tr_crm_pipelines_updated BEFORE UPDATE ON public.crm_pipelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_crm_stages_updated ON public.crm_stages;
CREATE TRIGGER tr_crm_stages_updated BEFORE UPDATE ON public.crm_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_price_books_updated ON public.price_books;
CREATE TRIGGER tr_price_books_updated BEFORE UPDATE ON public.price_books FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_quotes_updated ON public.quotes;
CREATE TRIGGER tr_quotes_updated BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_inbox_conversations_updated ON public.crm_inbox_conversations;
CREATE TRIGGER tr_inbox_conversations_updated BEFORE UPDATE ON public.crm_inbox_conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();