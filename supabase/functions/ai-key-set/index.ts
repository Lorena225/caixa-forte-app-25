import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encryptKey, testOpenAIKey } from "../_shared/resolveOpenAIKey.ts";

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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const appEncryptionKey = Deno.env.get('APP_ENCRYPTION_KEY');
    
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!appEncryptionKey) {
      return new Response(
        JSON.stringify({ error: 'APP_ENCRYPTION_KEY not configured. Contact administrator.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { company_id, api_key } = await req.json();
    const user_id = user.id;
    
    if (!company_id || !api_key) {
      return new Response(
        JSON.stringify({ error: 'company_id and api_key are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate key format
    if (!api_key.startsWith('sk-') || api_key.length < 20) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Test the key with OpenAI
    const testResult = await testOpenAIKey(api_key);
    if (!testResult.valid) {
      return new Response(
        JSON.stringify({ error: `Invalid API key: ${testResult.error}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Encrypt the key
    const { encryptedKey, encryptionMeta } = await encryptKey(api_key, appEncryptionKey);
    const keyLast4 = api_key.slice(-4);
    
    // Deactivate any existing active keys for this company
    await supabase
      .from('company_ai_keys')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('company_id', company_id)
      .eq('provider', 'openai')
      .eq('is_active', true);
    
    // Insert new key
    const { data: newKey, error: insertError } = await supabase
      .from('company_ai_keys')
      .insert({
        company_id,
        provider: 'openai',
        encrypted_key: encryptedKey,
        encryption_meta: encryptionMeta,
        key_last4: keyLast4,
        is_active: true,
        created_by: user_id || null
      })
      .select('id, key_last4, updated_at')
      .single();
    
    if (insertError) {
      console.error('Error inserting key:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save API key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Enable AI in company settings (upsert)
    await supabase
      .from('ai_company_settings')
      .upsert({
        company_id,
        enabled: true,
        updated_by: user_id || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'company_id' });
    
    return new Response(
      JSON.stringify({
        configured: true,
        key_last4: newKey.key_last4,
        updated_at: newKey.updated_at
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-key-set:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
