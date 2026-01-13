-- FIX RLS POLICIES FOR NEW TABLES

-- Enable RLS on login_attempts (global table, no company access needed for insert via service role)
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy for login_attempts - only service role can insert/read
CREATE POLICY "Service role only for login_attempts" ON public.login_attempts
  FOR ALL USING (false);

-- Add proper INSERT policy for webhook_ingress (via edge functions with service role)
CREATE POLICY "Service role can insert webhooks" ON public.webhook_ingress
  FOR INSERT WITH CHECK (true);

-- Add proper INSERT policy for rate_limit_events  
CREATE POLICY "Service role can insert rate limits" ON public.rate_limit_events
  FOR INSERT WITH CHECK (true);