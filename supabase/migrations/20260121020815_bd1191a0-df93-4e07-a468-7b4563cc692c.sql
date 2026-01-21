-- ============================================================
-- BLOCK 4.3: Recovery Logs Table
-- ============================================================

-- Create recovery logs table for tracking restore operations
CREATE TABLE IF NOT EXISTS public.recovery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  backup_execution_id UUID REFERENCES public.backup_executions(id) ON DELETE SET NULL,
  initiated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'cancelled')),
  error_message TEXT,
  recovered_tables TEXT[],
  recovered_records INTEGER DEFAULT 0,
  recovery_duration_seconds INTEGER,
  dry_run BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for recovery_logs
CREATE INDEX IF NOT EXISTS idx_recovery_logs_company ON public.recovery_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_status ON public.recovery_logs(status);
CREATE INDEX IF NOT EXISTS idx_recovery_logs_started_at ON public.recovery_logs(started_at DESC);

-- Enable RLS
ALTER TABLE public.recovery_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recovery_logs
CREATE POLICY "recovery_logs_select" ON public.recovery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.company_id = recovery_logs.company_id
    )
  );

CREATE POLICY "recovery_logs_insert" ON public.recovery_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.company_id = recovery_logs.company_id
    )
  );

CREATE POLICY "recovery_logs_update" ON public.recovery_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.company_id = recovery_logs.company_id
    )
  );

-- Add storage_url column to backup_executions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'backup_executions' 
    AND column_name = 'storage_url'
  ) THEN
    ALTER TABLE public.backup_executions ADD COLUMN storage_url TEXT;
  END IF;
END$$;

-- Add checksum column to backup_executions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'backup_executions' 
    AND column_name = 'checksum'
  ) THEN
    ALTER TABLE public.backup_executions ADD COLUMN checksum TEXT;
  END IF;
END$$;

-- Add is_verified column to backup_executions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'backup_executions' 
    AND column_name = 'is_verified'
  ) THEN
    ALTER TABLE public.backup_executions ADD COLUMN is_verified BOOLEAN DEFAULT false;
  END IF;
END$$;