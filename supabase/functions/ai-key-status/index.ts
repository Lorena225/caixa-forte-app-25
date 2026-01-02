import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const globalOpenAIKey = Deno.env.get('OPENAI_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { company_id } = await req.json();
    
    if (!company_id) {
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Get company's key status (not the actual key)
    const { data: companyKey, error } = await supabase
      .from('company_ai_keys')
      .select('key_last4, is_active, updated_at, provider')
      .eq('company_id', company_id)
      .eq('provider', 'openai')
      .eq('is_active', true)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching key status:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch key status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const hasGlobalFallback = globalOpenAIKey && 
                              globalOpenAIKey !== 'DISABLED' && 
                              globalOpenAIKey.startsWith('sk-');
    
    const response = {
      configured: !!companyKey,
      key_last4: companyKey?.key_last4 || null,
      provider: 'openai',
      updated_at: companyKey?.updated_at || null,
      using_global_fallback: !companyKey && hasGlobalFallback,
      ai_available: !!companyKey || hasGlobalFallback
    };
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-key-status:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
