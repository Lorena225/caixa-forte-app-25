import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { testOpenAIKey } from "../_shared/resolveOpenAIKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { api_key } = await req.json();
    
    if (!api_key) {
      return new Response(
        JSON.stringify({ error: 'api_key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate key format
    if (!api_key.startsWith('sk-') || api_key.length < 20) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Invalid API key format. Key should start with sk-' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Test the key with OpenAI
    const testResult = await testOpenAIKey(api_key);
    
    return new Response(
      JSON.stringify(testResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in ai-key-test:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
