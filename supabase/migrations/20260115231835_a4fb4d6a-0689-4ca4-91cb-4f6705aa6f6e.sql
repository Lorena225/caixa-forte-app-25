-- Drop and recreate webhook_events with correct structure
DROP TABLE IF EXISTS public.webhook_events;

CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_events_select" ON public.webhook_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.webhooks w
    JOIN public.company_users cu ON w.company_id = cu.company_id
    WHERE w.id = webhook_events.webhook_id
    AND cu.user_id = auth.uid()
  )
);

CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_webhook ON public.webhook_events(webhook_id);
CREATE INDEX idx_webhook_events_created ON public.webhook_events(created_at);