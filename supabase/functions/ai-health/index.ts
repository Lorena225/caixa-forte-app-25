import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOpenAIKey } from "../_shared/resolveOpenAIKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id } = await req.json();
    
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check AI key availability
    const keyResult = await resolveOpenAIKey(company_id);
    
    // Get AI settings
    const { data: settings } = await supabase
      .from('ai_company_settings')
      .select('*')
      .eq('company_id', company_id)
      .maybeSingle();

    // Get key status (without exposing the key)
    const { data: keyStatus } = await supabase
      .from('company_ai_keys')
      .select('key_last4, updated_at, provider')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .maybeSingle();

    const globalKeyAvailable = Deno.env.get('OPENAI_API_KEY') && 
                               Deno.env.get('OPENAI_API_KEY') !== 'DISABLED' &&
                               Deno.env.get('OPENAI_API_KEY')?.startsWith('sk-');

    const response = {
      status: 'healthy',
      ai_available: keyResult.key !== null,
      ai_source: keyResult.source,
      ai_error: keyResult.error,
      company_key_configured: !!keyStatus,
      company_key_last4: keyStatus?.key_last4 || null,
      global_fallback_available: globalKeyAvailable,
      settings: settings ? {
        enabled: settings.enabled,
        autopilot_mode: settings.autopilot_mode,
        high_risk_amount_limit: settings.high_risk_amount_limit,
        allow_auto_settle: settings.allow_auto_settle,
        allow_auto_create_and_settle: settings.allow_auto_create_and_settle,
        allow_auto_create_counterparty: settings.allow_auto_create_counterparty,
        require_pin_for_high_risk: settings.require_pin_for_high_risk,
      } : null,
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Health check error:', error);
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
