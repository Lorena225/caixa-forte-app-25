
-- =====================================================
-- HCM (Human Capital Management) & Departamento Pessoal
-- Complete Database Schema - Final Version
-- =====================================================

-- 1. ENUMS (if not exist)
DO $$ BEGIN
    CREATE TYPE public.contract_type AS ENUM ('clt', 'pj', 'estagio', 'temporario', 'intermitente');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.journey_type AS ENUM ('44h', '36h', '12x36', 'flexivel', 'parcial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.employee_status AS ENUM ('ativo', 'ferias', 'afastado', 'desligado', 'experiencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.time_entry_type AS ENUM ('entrada', 'saida_almoco', 'retorno_almoco', 'saida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.payroll_status AS ENUM ('rascunho', 'calculando', 'preview', 'aprovado', 'pago', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.hcm_request_type AS ENUM ('ferias', 'reembolso', 'ajuste_ponto', 'documento', 'abono', 'licenca');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.hcm_request_status AS ENUM ('pendente', 'aprovado', 'rejeitado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE public.benefit_type AS ENUM ('vt', 'vr', 'va', 'plano_saude', 'plano_odonto', 'seguro_vida', 'gym', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. EMPLOYEES PROFILES
CREATE TABLE public.employees_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    counterparty_id UUID REFERENCES public.counterparties(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    registration_number VARCHAR(20),
    full_name VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    rg VARCHAR(20),
    birth_date DATE,
    gender VARCHAR(20),
    marital_status VARCHAR(30),
    education_level VARCHAR(50),
    
    personal_email VARCHAR(255),
    corporate_email VARCHAR(255),
    phone VARCHAR(20),
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(20),
    
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(2),
    address_zip VARCHAR(10),
    
    contract_type public.contract_type NOT NULL DEFAULT 'clt',
    journey_type public.journey_type NOT NULL DEFAULT '44h',
    weekly_hours NUMERIC(5,2) DEFAULT 44,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    termination_date DATE,
    experience_end_date DATE,
    status public.employee_status NOT NULL DEFAULT 'ativo',
    
    position_id UUID REFERENCES public.cargos(id),
    department_id UUID REFERENCES public.departamentos(id),
    cost_center_id UUID REFERENCES public.cost_centers(id),
    manager_id UUID,
    work_location VARCHAR(100),
    
    base_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
    salary_type VARCHAR(20) DEFAULT 'mensal',
    hourly_rate NUMERIC(10,2),
    pj_hourly_rate NUMERIC(10,2),
    
    has_vt BOOLEAN DEFAULT true,
    vt_daily_value NUMERIC(8,2) DEFAULT 0,
    has_vr BOOLEAN DEFAULT true,
    vr_daily_value NUMERIC(8,2) DEFAULT 0,
    has_health_plan BOOLEAN DEFAULT false,
    health_plan_value NUMERIC(10,2) DEFAULT 0,
    health_plan_dependents INTEGER DEFAULT 0,
    
    bank_code VARCHAR(10),
    bank_agency VARCHAR(10),
    bank_account VARCHAR(20),
    bank_account_type VARCHAR(20),
    pix_key VARCHAR(100),
    
    ctps_number VARCHAR(20),
    ctps_series VARCHAR(10),
    pis_pasep VARCHAR(20),
    voter_id VARCHAR(20),
    military_id VARCHAR(20),
    driver_license VARCHAR(20),
    driver_license_category VARCHAR(10),
    
    commission_rate NUMERIC(5,2) DEFAULT 0,
    commission_base VARCHAR(20) DEFAULT 'gross',
    bonus_eligible BOOLEAN DEFAULT true,
    
    photo_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    
    CONSTRAINT unique_employee_registration UNIQUE(company_id, registration_number)
);

-- Self-reference for manager
ALTER TABLE public.employees_profiles 
ADD CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES public.employees_profiles(id);

-- 3. TIME TRACKING INTEGRATIONS
CREATE TABLE public.time_tracking_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    provider VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    api_url TEXT,
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    company_code VARCHAR(50),
    
    sync_enabled BOOLEAN DEFAULT true,
    sync_frequency VARCHAR(20) DEFAULT 'daily',
    last_sync_at TIMESTAMPTZ,
    last_sync_status VARCHAR(20),
    last_sync_error TEXT,
    
    field_mappings JSONB DEFAULT '{}',
    employee_code_field VARCHAR(50) DEFAULT 'registration_number',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_provider_per_company UNIQUE(company_id, provider)
);

-- 4. TIME ENTRIES
CREATE TABLE public.time_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    integration_id UUID REFERENCES public.time_tracking_integrations(id),
    
    entry_date DATE NOT NULL,
    entry_time TIME NOT NULL,
    entry_type public.time_entry_type NOT NULL,
    
    source VARCHAR(20) DEFAULT 'integration',
    external_id VARCHAR(100),
    device_id VARCHAR(50),
    location_lat NUMERIC(10,7),
    location_lng NUMERIC(10,7),
    
    original_time TIME,
    adjusted_by UUID REFERENCES auth.users(id),
    adjustment_reason TEXT,
    
    is_valid BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. DAILY TIME SUMMARY
CREATE TABLE public.time_daily_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    
    work_date DATE NOT NULL,
    
    entry_1 TIME,
    exit_1 TIME,
    entry_2 TIME,
    exit_2 TIME,
    entry_3 TIME,
    exit_3 TIME,
    
    expected_hours NUMERIC(5,2) NOT NULL DEFAULT 8.8,
    worked_hours NUMERIC(5,2) DEFAULT 0,
    break_hours NUMERIC(5,2) DEFAULT 0,
    
    overtime_50 NUMERIC(5,2) DEFAULT 0,
    overtime_100 NUMERIC(5,2) DEFAULT 0,
    night_hours NUMERIC(5,2) DEFAULT 0,
    bank_hours NUMERIC(5,2) DEFAULT 0,
    
    is_holiday BOOLEAN DEFAULT false,
    is_weekend BOOLEAN DEFAULT false,
    absence_type VARCHAR(30),
    absence_justified BOOLEAN,
    
    project_id UUID,
    production_order_id UUID,
    
    calculated_at TIMESTAMPTZ DEFAULT now(),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    CONSTRAINT unique_daily_summary UNIQUE(employee_id, work_date)
);

-- 6. HOUR BANK
CREATE TABLE public.hour_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    
    reference_date DATE NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    hours NUMERIC(6,2) NOT NULL,
    balance_after NUMERIC(8,2) NOT NULL,
    
    source_type VARCHAR(30),
    source_id UUID,
    description TEXT,
    
    expires_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- 7. PAYROLL PERIODS
CREATE TABLE public.payroll_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    reference_month INTEGER NOT NULL,
    reference_year INTEGER NOT NULL,
    period_type VARCHAR(20) NOT NULL DEFAULT 'mensal',
    
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    payment_date DATE,
    
    status public.payroll_status NOT NULL DEFAULT 'rascunho',
    
    total_employees INTEGER DEFAULT 0,
    total_gross NUMERIC(14,2) DEFAULT 0,
    total_deductions NUMERIC(14,2) DEFAULT 0,
    total_net NUMERIC(14,2) DEFAULT 0,
    total_employer_cost NUMERIC(14,2) DEFAULT 0,
    
    calculated_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_payroll_period UNIQUE(company_id, reference_year, reference_month, period_type)
);

-- 8. PAYROLL ENTRIES
CREATE TABLE public.payroll_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    
    base_salary NUMERIC(12,2) NOT NULL,
    worked_days INTEGER DEFAULT 30,
    
    salary_amount NUMERIC(12,2) DEFAULT 0,
    overtime_50_hours NUMERIC(6,2) DEFAULT 0,
    overtime_50_amount NUMERIC(12,2) DEFAULT 0,
    overtime_100_hours NUMERIC(6,2) DEFAULT 0,
    overtime_100_amount NUMERIC(12,2) DEFAULT 0,
    night_hours NUMERIC(6,2) DEFAULT 0,
    night_amount NUMERIC(12,2) DEFAULT 0,
    commission_amount NUMERIC(12,2) DEFAULT 0,
    bonus_amount NUMERIC(12,2) DEFAULT 0,
    dsr_amount NUMERIC(12,2) DEFAULT 0,
    other_earnings NUMERIC(12,2) DEFAULT 0,
    earnings_details JSONB DEFAULT '[]',
    
    inss_amount NUMERIC(12,2) DEFAULT 0,
    inss_rate NUMERIC(5,2) DEFAULT 0,
    irrf_amount NUMERIC(12,2) DEFAULT 0,
    irrf_rate NUMERIC(5,2) DEFAULT 0,
    irrf_base NUMERIC(12,2) DEFAULT 0,
    vt_discount NUMERIC(12,2) DEFAULT 0,
    vr_discount NUMERIC(12,2) DEFAULT 0,
    health_plan_discount NUMERIC(12,2) DEFAULT 0,
    dental_plan_discount NUMERIC(12,2) DEFAULT 0,
    absence_discount NUMERIC(12,2) DEFAULT 0,
    advance_discount NUMERIC(12,2) DEFAULT 0,
    loan_discount NUMERIC(12,2) DEFAULT 0,
    other_deductions NUMERIC(12,2) DEFAULT 0,
    deductions_details JSONB DEFAULT '[]',
    
    total_earnings NUMERIC(12,2) DEFAULT 0,
    total_deductions NUMERIC(12,2) DEFAULT 0,
    net_salary NUMERIC(12,2) DEFAULT 0,
    
    inss_employer NUMERIC(12,2) DEFAULT 0,
    fgts_amount NUMERIC(12,2) DEFAULT 0,
    fgts_deposit_date DATE,
    
    status public.payroll_status DEFAULT 'rascunho',
    paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_payroll_entry UNIQUE(period_id, employee_id)
);

-- 9. HCM COMMISSION RULES (renamed to avoid conflict)
CREATE TABLE public.hcm_commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    applies_to VARCHAR(20) DEFAULT 'all',
    department_id UUID REFERENCES public.departamentos(id),
    position_id UUID REFERENCES public.cargos(id),
    employee_id UUID REFERENCES public.employees_profiles(id),
    
    calculation_type VARCHAR(20) NOT NULL,
    base_type VARCHAR(20) NOT NULL DEFAULT 'gross',
    percentage NUMERIC(5,2),
    fixed_amount NUMERIC(12,2),
    tiers JSONB,
    
    min_sales_value NUMERIC(12,2),
    product_categories JSONB,
    
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. COMMISSION CALCULATIONS
CREATE TABLE public.commission_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.payroll_periods(id),
    
    reference_month INTEGER NOT NULL,
    reference_year INTEGER NOT NULL,
    
    opportunity_id UUID,
    sale_id UUID,
    invoice_id UUID,
    
    sale_date DATE NOT NULL,
    sale_value NUMERIC(14,2) NOT NULL,
    margin_value NUMERIC(14,2),
    
    rule_id UUID REFERENCES public.hcm_commission_rules(id),
    base_value NUMERIC(14,2) NOT NULL,
    commission_rate NUMERIC(5,2) NOT NULL,
    commission_amount NUMERIC(12,2) NOT NULL,
    
    status VARCHAR(20) DEFAULT 'pending',
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. EMPLOYEE BENEFITS
CREATE TABLE public.employee_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    
    benefit_type public.benefit_type NOT NULL,
    benefit_name VARCHAR(100),
    provider VARCHAR(100),
    
    company_value NUMERIC(10,2) DEFAULT 0,
    employee_discount NUMERIC(10,2) DEFAULT 0,
    discount_percentage NUMERIC(5,2),
    
    daily_value NUMERIC(8,2),
    working_days INTEGER DEFAULT 22,
    
    plan_type VARCHAR(30),
    dependents_count INTEGER DEFAULT 0,
    
    card_number VARCHAR(50),
    
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 12. EMPLOYEE REQUESTS
CREATE TABLE public.employee_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    
    request_type public.hcm_request_type NOT NULL,
    request_number VARCHAR(20),
    
    title VARCHAR(200) NOT NULL,
    description TEXT,
    
    vacation_start_date DATE,
    vacation_end_date DATE,
    vacation_days INTEGER,
    vacation_sell_days INTEGER,
    vacation_advance BOOLEAN DEFAULT false,
    
    expense_date DATE,
    expense_category VARCHAR(50),
    expense_amount NUMERIC(12,2),
    receipt_url TEXT,
    
    adjustment_date DATE,
    original_time TIME,
    corrected_time TIME,
    adjustment_reason TEXT,
    
    status public.hcm_request_status NOT NULL DEFAULT 'pendente',
    current_approver_id UUID REFERENCES public.employees_profiles(id),
    
    submitted_at TIMESTAMPTZ DEFAULT now(),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 13. PAYSLIPS
CREATE TABLE public.payslips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES public.employees_profiles(id) ON DELETE CASCADE,
    period_id UUID REFERENCES public.payroll_periods(id),
    payroll_entry_id UUID REFERENCES public.payroll_entries(id),
    
    reference_month INTEGER NOT NULL,
    reference_year INTEGER NOT NULL,
    
    document_type VARCHAR(20) DEFAULT 'holerite',
    pdf_url TEXT,
    pdf_generated_at TIMESTAMPTZ,
    
    is_available BOOLEAN DEFAULT false,
    first_accessed_at TIMESTAMPTZ,
    access_count INTEGER DEFAULT 0,
    
    employee_signed BOOLEAN DEFAULT false,
    signed_at TIMESTAMPTZ,
    signature_ip VARCHAR(45),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 14. PEOPLE ANALYTICS SNAPSHOTS
CREATE TABLE public.people_analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    
    snapshot_date DATE NOT NULL,
    snapshot_type VARCHAR(20) DEFAULT 'daily',
    
    total_employees INTEGER DEFAULT 0,
    active_employees INTEGER DEFAULT 0,
    on_vacation INTEGER DEFAULT 0,
    on_leave INTEGER DEFAULT 0,
    terminated_mtd INTEGER DEFAULT 0,
    hired_mtd INTEGER DEFAULT 0,
    
    total_payroll_cost NUMERIC(14,2) DEFAULT 0,
    total_benefits_cost NUMERIC(14,2) DEFAULT 0,
    total_overtime_cost NUMERIC(14,2) DEFAULT 0,
    total_commission_cost NUMERIC(14,2) DEFAULT 0,
    avg_salary NUMERIC(12,2) DEFAULT 0,
    headcount_cost_ratio NUMERIC(6,4),
    
    turnover_rate NUMERIC(5,2) DEFAULT 0,
    voluntary_exits INTEGER DEFAULT 0,
    involuntary_exits INTEGER DEFAULT 0,
    avg_tenure_months NUMERIC(6,1) DEFAULT 0,
    
    absenteeism_rate NUMERIC(5,2) DEFAULT 0,
    total_absence_days INTEGER DEFAULT 0,
    medical_leave_days INTEGER DEFAULT 0,
    unjustified_absence_days INTEGER DEFAULT 0,
    
    total_overtime_hours NUMERIC(10,2) DEFAULT 0,
    avg_overtime_per_employee NUMERIC(6,2) DEFAULT 0,
    
    demographics JSONB DEFAULT '{}',
    department_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_analytics_snapshot UNIQUE(company_id, snapshot_date, snapshot_type)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_employees_profiles_company ON public.employees_profiles(company_id);
CREATE INDEX idx_employees_profiles_status ON public.employees_profiles(company_id, status);
CREATE INDEX idx_employees_profiles_department ON public.employees_profiles(department_id);
CREATE INDEX idx_employees_profiles_cost_center ON public.employees_profiles(cost_center_id);
CREATE INDEX idx_employees_profiles_manager ON public.employees_profiles(manager_id);
CREATE INDEX idx_employees_profiles_user ON public.employees_profiles(user_id);

CREATE INDEX idx_time_entries_employee_date ON public.time_entries(employee_id, entry_date);
CREATE INDEX idx_time_entries_company_date ON public.time_entries(company_id, entry_date);
CREATE INDEX idx_time_daily_summary_employee ON public.time_daily_summary(employee_id, work_date);
CREATE INDEX idx_time_daily_summary_company ON public.time_daily_summary(company_id, work_date);

CREATE INDEX idx_payroll_periods_company ON public.payroll_periods(company_id, reference_year, reference_month);
CREATE INDEX idx_payroll_entries_period ON public.payroll_entries(period_id);
CREATE INDEX idx_payroll_entries_employee ON public.payroll_entries(employee_id);

CREATE INDEX idx_commission_calculations_employee ON public.commission_calculations(employee_id, reference_year, reference_month);
CREATE INDEX idx_employee_benefits_employee ON public.employee_benefits(employee_id);
CREATE INDEX idx_employee_requests_employee ON public.employee_requests(employee_id, status);
CREATE INDEX idx_payslips_employee ON public.payslips(employee_id, reference_year, reference_month);
CREATE INDEX idx_hour_bank_employee ON public.hour_bank(employee_id, reference_date);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.employees_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_tracking_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hour_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hcm_commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people_analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "employees_profiles_company_isolation" ON public.employees_profiles
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "time_tracking_integrations_company_isolation" ON public.time_tracking_integrations
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "time_entries_company_isolation" ON public.time_entries
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "time_daily_summary_company_isolation" ON public.time_daily_summary
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "hour_bank_company_isolation" ON public.hour_bank
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "payroll_periods_company_isolation" ON public.payroll_periods
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "payroll_entries_company_isolation" ON public.payroll_entries
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "hcm_commission_rules_company_isolation" ON public.hcm_commission_rules
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "commission_calculations_company_isolation" ON public.commission_calculations
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "employee_benefits_company_isolation" ON public.employee_benefits
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "employee_requests_company_isolation" ON public.employee_requests
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "payslips_company_isolation" ON public.payslips
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

CREATE POLICY "people_analytics_snapshots_company_isolation" ON public.people_analytics_snapshots
    FOR ALL USING (company_id IN (SELECT company_id FROM public.company_users WHERE user_id = auth.uid()));

-- Employee self-access
CREATE POLICY "employees_self_view" ON public.employees_profiles
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "payslips_employee_access" ON public.payslips
    FOR SELECT USING (employee_id IN (SELECT id FROM public.employees_profiles WHERE user_id = auth.uid()));

CREATE POLICY "requests_employee_access" ON public.employee_requests
    FOR ALL USING (employee_id IN (SELECT id FROM public.employees_profiles WHERE user_id = auth.uid()));

-- =====================================================
-- TRIGGERS
-- =====================================================

CREATE TRIGGER update_employees_profiles_updated_at
    BEFORE UPDATE ON public.employees_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_periods_updated_at
    BEFORE UPDATE ON public.payroll_periods
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payroll_entries_updated_at
    BEFORE UPDATE ON public.payroll_entries
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_benefits_updated_at
    BEFORE UPDATE ON public.employee_benefits
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_employee_requests_updated_at
    BEFORE UPDATE ON public.employee_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTIONS FOR PAYROLL CALCULATIONS
-- =====================================================

-- Calculate INSS based on 2024 table
CREATE OR REPLACE FUNCTION public.calculate_inss(p_salary NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_inss NUMERIC := 0;
    v_remaining NUMERIC := p_salary;
BEGIN
    -- Faixa 1: até 1.412,00 - 7.5%
    IF v_remaining > 0 THEN
        v_inss := v_inss + LEAST(v_remaining, 1412.00) * 0.075;
        v_remaining := v_remaining - 1412.00;
    END IF;
    
    -- Faixa 2: 1.412,01 até 2.666,68 - 9%
    IF v_remaining > 0 THEN
        v_inss := v_inss + LEAST(v_remaining, 1254.68) * 0.09;
        v_remaining := v_remaining - 1254.68;
    END IF;
    
    -- Faixa 3: 2.666,69 até 4.000,03 - 12%
    IF v_remaining > 0 THEN
        v_inss := v_inss + LEAST(v_remaining, 1333.35) * 0.12;
        v_remaining := v_remaining - 1333.35;
    END IF;
    
    -- Faixa 4: 4.000,04 até 7.786,02 - 14%
    IF v_remaining > 0 THEN
        v_inss := v_inss + LEAST(v_remaining, 3785.99) * 0.14;
    END IF;
    
    -- Teto INSS
    RETURN LEAST(v_inss, 908.85);
END;
$$;

-- Calculate IRRF based on 2024 table
CREATE OR REPLACE FUNCTION public.calculate_irrf(p_base NUMERIC, p_dependents INTEGER DEFAULT 0)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_base_calc NUMERIC;
    v_irrf NUMERIC := 0;
    v_deduction_per_dependent NUMERIC := 189.59;
BEGIN
    v_base_calc := p_base - (p_dependents * v_deduction_per_dependent);
    
    IF v_base_calc <= 2259.20 THEN
        v_irrf := 0;
    ELSIF v_base_calc <= 2826.65 THEN
        v_irrf := (v_base_calc * 0.075) - 169.44;
    ELSIF v_base_calc <= 3751.05 THEN
        v_irrf := (v_base_calc * 0.15) - 381.44;
    ELSIF v_base_calc <= 4664.68 THEN
        v_irrf := (v_base_calc * 0.225) - 662.77;
    ELSE
        v_irrf := (v_base_calc * 0.275) - 896.00;
    END IF;
    
    RETURN GREATEST(v_irrf, 0);
END;
$$;

-- Calculate hourly rate including all costs
CREATE OR REPLACE FUNCTION public.calculate_employee_hourly_rate(p_employee_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_employee RECORD;
    v_monthly_cost NUMERIC;
    v_monthly_hours NUMERIC;
    v_benefits_cost NUMERIC := 0;
BEGIN
    SELECT * INTO v_employee FROM public.employees_profiles WHERE id = p_employee_id;
    
    IF v_employee IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Calculate monthly hours based on journey
    v_monthly_hours := v_employee.weekly_hours * 4.33;
    
    -- Base salary + employer costs (INSS 20% + FGTS 8% + others ~5%)
    v_monthly_cost := v_employee.base_salary * 1.33;
    
    -- Add benefits
    SELECT COALESCE(SUM(company_value), 0) INTO v_benefits_cost
    FROM public.employee_benefits
    WHERE employee_id = p_employee_id AND is_active = true;
    
    v_monthly_cost := v_monthly_cost + v_benefits_cost;
    
    -- Calculate hourly rate
    IF v_monthly_hours > 0 THEN
        RETURN ROUND(v_monthly_cost / v_monthly_hours, 2);
    ELSE
        RETURN NULL;
    END IF;
END;
$$;

-- Calculate commissions from CRM opportunities
CREATE OR REPLACE FUNCTION public.calculate_employee_commissions(
    p_employee_id UUID,
    p_month INTEGER,
    p_year INTEGER
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_employee RECORD;
    v_total_commission NUMERIC := 0;
    v_opp RECORD;
BEGIN
    SELECT * INTO v_employee FROM public.employees_profiles WHERE id = p_employee_id;
    
    IF v_employee IS NULL OR v_employee.commission_rate = 0 THEN
        RETURN 0;
    END IF;
    
    -- Get won opportunities for this employee in the period
    FOR v_opp IN
        SELECT o.value
        FROM public.crm_opportunities o
        WHERE o.owner_id = v_employee.counterparty_id
        AND o.status = 'won'
        AND EXTRACT(MONTH FROM o.closed_at) = p_month
        AND EXTRACT(YEAR FROM o.closed_at) = p_year
    LOOP
        IF v_employee.commission_base = 'gross' THEN
            v_total_commission := v_total_commission + (v_opp.value * v_employee.commission_rate / 100);
        END IF;
    END LOOP;
    
    -- Insert commission calculations
    INSERT INTO public.commission_calculations (
        company_id, employee_id, reference_month, reference_year,
        sale_date, sale_value, base_value, commission_rate, commission_amount
    )
    SELECT 
        v_employee.company_id,
        p_employee_id,
        p_month,
        p_year,
        o.closed_at::DATE,
        o.value,
        o.value,
        v_employee.commission_rate,
        o.value * v_employee.commission_rate / 100
    FROM public.crm_opportunities o
    WHERE o.owner_id = v_employee.counterparty_id
    AND o.status = 'won'
    AND EXTRACT(MONTH FROM o.closed_at) = p_month
    AND EXTRACT(YEAR FROM o.closed_at) = p_year
    ON CONFLICT DO NOTHING;
    
    RETURN v_total_commission;
END;
$$;
