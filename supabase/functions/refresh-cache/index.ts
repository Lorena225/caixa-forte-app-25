import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    console.log("[refresh-cache] Starting materialized view refresh...");
    const startTime = Date.now();

    // Chamar a função de refresh das views
    const { error } = await supabase.rpc("refresh_dashboard_cache");
    
    if (error) {
      console.error("[refresh-cache] Error refreshing cache:", error);
      throw error;
    }

    const duration = Date.now() - startTime;
    console.log(`[refresh-cache] Cache refreshed successfully in ${duration}ms`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Dashboard cache refreshed",
        duration_ms: duration,
        refreshed_at: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[refresh-cache] Error:", errorMessage);
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
