-- ============================================
-- GESTÃO BANCÁRIA COMPLETA: Tabelas Faltantes
-- ============================================

-- Criar função set_updated_at se não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ENUM para status de transferência
DO $$ BEGIN
    CREATE TYPE transfer_status AS ENUM ('rascunho', 'pendente', 'concluido', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ENUM para status de cheque
DO $$ BEGIN
    CREATE TYPE cheque_status AS ENUM ('em_carteira', 'depositado', 'compensado', 'devolvido', 'sustado', 'cancelado');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ENUM para tipo de cheque
DO $$ BEGIN
    CREATE TYPE cheque_type AS ENUM ('emitido', 'recebido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 1. TRANSFERÊNCIAS BANCÁRIAS
-- ============================================
CREATE TABLE IF NOT EXISTS public.bank_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    origin_bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    destination_bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE RESTRICT,
    transfer_date DATE NOT NULL DEFAULT CURRENT_DATE,
    scheduled_date DATE,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    description TEXT,
    reference_number TEXT,
    status transfer_status NOT NULL DEFAULT 'rascunho',
    executed_at TIMESTAMPTZ,
    executed_by UUID,
    transaction_origin_id UUID REFERENCES public.transactions(id),
    transaction_destination_id UUID REFERENCES public.transactions(id),
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT different_accounts CHECK (origin_bank_account_id <> destination_bank_account_id)
);

-- Índices para transferências
CREATE INDEX IF NOT EXISTS idx_bank_transfers_company ON public.bank_transfers(company_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_origin ON public.bank_transfers(origin_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_destination ON public.bank_transfers(destination_bank_account_id);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_status ON public.bank_transfers(status);
CREATE INDEX IF NOT EXISTS idx_bank_transfers_date ON public.bank_transfers(transfer_date);

-- RLS para transferências
ALTER TABLE public.bank_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_transfers_select" ON public.bank_transfers;
CREATE POLICY "bank_transfers_select" ON public.bank_transfers
    FOR SELECT USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "bank_transfers_insert" ON public.bank_transfers;
CREATE POLICY "bank_transfers_insert" ON public.bank_transfers
    FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "bank_transfers_update" ON public.bank_transfers;
CREATE POLICY "bank_transfers_update" ON public.bank_transfers
    FOR UPDATE USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "bank_transfers_delete" ON public.bank_transfers;
CREATE POLICY "bank_transfers_delete" ON public.bank_transfers
    FOR DELETE USING (public.user_belongs_to_company(company_id));

-- ============================================
-- 2. CHEQUES
-- ============================================
CREATE TABLE IF NOT EXISTS public.cheques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES public.bank_accounts(id),
    cheque_number TEXT NOT NULL,
    bank_code TEXT NOT NULL,
    agency TEXT,
    account TEXT,
    issue_date DATE NOT NULL,
    due_date DATE,
    amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    beneficiary_name TEXT,
    beneficiary_document TEXT,
    cheque_type cheque_type NOT NULL,
    status cheque_status NOT NULL DEFAULT 'em_carteira',
    deposit_date DATE,
    compensation_date DATE,
    return_reason TEXT,
    transaction_id UUID REFERENCES public.transactions(id),
    notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para cheques
CREATE INDEX IF NOT EXISTS idx_cheques_company ON public.cheques(company_id);
CREATE INDEX IF NOT EXISTS idx_cheques_bank_account ON public.cheques(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_cheques_type ON public.cheques(cheque_type);
CREATE INDEX IF NOT EXISTS idx_cheques_status ON public.cheques(status);
CREATE INDEX IF NOT EXISTS idx_cheques_due_date ON public.cheques(due_date);
CREATE INDEX IF NOT EXISTS idx_cheques_number ON public.cheques(cheque_number);

-- RLS para cheques
ALTER TABLE public.cheques ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cheques_select" ON public.cheques;
CREATE POLICY "cheques_select" ON public.cheques
    FOR SELECT USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cheques_insert" ON public.cheques;
CREATE POLICY "cheques_insert" ON public.cheques
    FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cheques_update" ON public.cheques;
CREATE POLICY "cheques_update" ON public.cheques
    FOR UPDATE USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cheques_delete" ON public.cheques;
CREATE POLICY "cheques_delete" ON public.cheques
    FOR DELETE USING (public.user_belongs_to_company(company_id));

-- ============================================
-- 3. CAIXAS FÍSICOS
-- ============================================
CREATE TABLE IF NOT EXISTS public.cash_registers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    responsible_id UUID,
    opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    current_balance NUMERIC(18,2) NOT NULL DEFAULT 0,
    opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
    location TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    wallet_id UUID REFERENCES public.wallets(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    CONSTRAINT unique_cash_register_code UNIQUE (company_id, code)
);

-- Índices para caixas
CREATE INDEX IF NOT EXISTS idx_cash_registers_company ON public.cash_registers(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_active ON public.cash_registers(is_active);

-- RLS para caixas
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_registers_select" ON public.cash_registers;
CREATE POLICY "cash_registers_select" ON public.cash_registers
    FOR SELECT USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cash_registers_insert" ON public.cash_registers;
CREATE POLICY "cash_registers_insert" ON public.cash_registers
    FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cash_registers_update" ON public.cash_registers;
CREATE POLICY "cash_registers_update" ON public.cash_registers
    FOR UPDATE USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cash_registers_delete" ON public.cash_registers;
CREATE POLICY "cash_registers_delete" ON public.cash_registers
    FOR DELETE USING (public.user_belongs_to_company(company_id));

-- ============================================
-- 4. MOVIMENTOS DE CAIXA FÍSICO
-- ============================================
CREATE TABLE IF NOT EXISTS public.cash_register_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    cash_register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    movement_time TIME NOT NULL DEFAULT CURRENT_TIME,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('abertura', 'entrada', 'saida', 'sangria', 'suprimento', 'fechamento')),
    amount NUMERIC(18,2) NOT NULL,
    balance_before NUMERIC(18,2),
    balance_after NUMERIC(18,2),
    description TEXT,
    payment_method TEXT,
    reference_document TEXT,
    transaction_id UUID REFERENCES public.transactions(id),
    performed_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para movimentos
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_company ON public.cash_register_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_register ON public.cash_register_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_date ON public.cash_register_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_cash_register_movements_type ON public.cash_register_movements(movement_type);

-- RLS para movimentos
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cash_register_movements_select" ON public.cash_register_movements;
CREATE POLICY "cash_register_movements_select" ON public.cash_register_movements
    FOR SELECT USING (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cash_register_movements_insert" ON public.cash_register_movements;
CREATE POLICY "cash_register_movements_insert" ON public.cash_register_movements
    FOR INSERT WITH CHECK (public.user_belongs_to_company(company_id));
    
DROP POLICY IF EXISTS "cash_register_movements_update" ON public.cash_register_movements;
CREATE POLICY "cash_register_movements_update" ON public.cash_register_movements
    FOR UPDATE USING (public.user_belongs_to_company(company_id));

-- ============================================
-- 5. TRIGGERS DE ATUALIZAÇÃO
-- ============================================

-- Trigger para updated_at em bank_transfers
DROP TRIGGER IF EXISTS set_bank_transfers_updated_at ON public.bank_transfers;
CREATE TRIGGER set_bank_transfers_updated_at
    BEFORE UPDATE ON public.bank_transfers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger para updated_at em cheques
DROP TRIGGER IF EXISTS set_cheques_updated_at ON public.cheques;
CREATE TRIGGER set_cheques_updated_at
    BEFORE UPDATE ON public.cheques
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Trigger para updated_at em cash_registers
DROP TRIGGER IF EXISTS set_cash_registers_updated_at ON public.cash_registers;
CREATE TRIGGER set_cash_registers_updated_at
    BEFORE UPDATE ON public.cash_registers
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- ============================================
-- 6. FUNÇÃO PARA ATUALIZAR SALDO DO CAIXA
-- ============================================
CREATE OR REPLACE FUNCTION public.update_cash_register_balance()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.cash_registers
    SET current_balance = current_balance + 
        CASE 
            WHEN NEW.movement_type IN ('entrada', 'suprimento', 'abertura') THEN NEW.amount
            WHEN NEW.movement_type IN ('saida', 'sangria') THEN -NEW.amount
            ELSE 0
        END,
        updated_at = now()
    WHERE id = NEW.cash_register_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS update_cash_register_balance_trigger ON public.cash_register_movements;
CREATE TRIGGER update_cash_register_balance_trigger
    AFTER INSERT ON public.cash_register_movements
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cash_register_balance();