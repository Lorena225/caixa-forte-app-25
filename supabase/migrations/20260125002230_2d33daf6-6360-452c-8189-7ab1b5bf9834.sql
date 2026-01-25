-- Add missing column to webhook_events for retry scheduling
ALTER TABLE public.webhook_events ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Add missing column to transactions for payment tracking
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_retry 
  ON webhook_events(status, next_retry_at) 
  WHERE status = 'pending';

-- Update existing records to set next_retry_at based on created_at for pending events
UPDATE public.webhook_events 
SET next_retry_at = created_at 
WHERE status = 'pending' AND next_retry_at IS NULL;