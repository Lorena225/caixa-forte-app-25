import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HealthCheckRequest {
  company_id: string;
  integration_key: string;
}

interface HealthCheckResult {
  status: "online" | "offline" | "auth_error" | "timeout" | "unknown";
  response_time_ms: number;
  message: string;
  details?: Record<string, unknown>;
}

// Integration endpoints for health checks
const INTEGRATION_ENDPOINTS: Record<string, { url: string; method: string; timeout: number }> = {
  openai: { url: "https://api.openai.com/v1/models", method: "GET", timeout: 10000 },
  whatsapp_cloud: { url: "https://graph.facebook.com/v18.0/me", method: "GET", timeout: 10000 },
  stripe: { url: "https://api.stripe.com/v1/balance", method: "GET", timeout: 10000 },
  asaas: { url: "https://sandbox.asaas.com/api/v3/customers?limit=1", method: "GET", timeout: 10000 },
  pix_bb: { url: "https://api.bb.com.br/pix/v2/health", method: "GET", timeout: 15000 },
  nfse: { url: "https://api.focusnfe.com.br/v2/nfse", method: "HEAD", timeout: 10000 },
  sefaz: { url: "https://nfe.fazenda.gov.br/portal/principal.aspx", method: "HEAD", timeout: 15000 },
  lovable_ai: { url: "https://ai.gateway.lovable.dev/v1/models", method: "GET", timeout: 10000 },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: HealthCheckRequest = await req.json();
    const { company_id, integration_key } = body;

    if (!company_id || !integration_key) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id, integration_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Health Check] Testing ${integration_key} for company ${company_id}`);

    // Get credentials for this integration
    const { data: credentials } = await supabase
      .from("integration_credentials")
      .select("encrypted_payload, encryption_meta, status")
      .eq("company_id", company_id)
      .eq("integration_key", integration_key)
      .single();

    let result: HealthCheckResult;
    const startTime = Date.now();

    try {
      // Perform the health check based on integration type
      result = await performHealthCheck(integration_key, credentials);
    } catch (error) {
      result = {
        status: "offline",
        response_time_ms: Date.now() - startTime,
        message: error instanceof Error ? error.message : "Unknown error",
      };
    }

    // Log the health check result
    await supabase.rpc("log_integration_health_check", {
      p_company_id: company_id,
      p_integration_key: integration_key,
      p_status: result.status,
      p_response_time_ms: result.response_time_ms,
      p_error_message: result.status !== "online" ? result.message : null,
    });

    console.log(`[Health Check] ${integration_key}: ${result.status} (${result.response_time_ms}ms)`);

    return new Response(
      JSON.stringify({
        success: true,
        integration_key,
        ...result,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Health Check] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function performHealthCheck(
  integrationKey: string,
  credentials: any
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  // Check if we have endpoint config
  const endpoint = INTEGRATION_ENDPOINTS[integrationKey];
  
  if (!endpoint) {
    // For unknown integrations, just check if credentials exist
    if (credentials?.status === "active") {
      return {
        status: "online",
        response_time_ms: Date.now() - startTime,
        message: "Credenciais configuradas",
        details: { configured: true },
      };
    }
    return {
      status: "unknown",
      response_time_ms: Date.now() - startTime,
      message: "Integração não configurada",
    };
  }

  // Special handling for Lovable AI
  if (integrationKey === "lovable_ai") {
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return {
        status: "offline",
        response_time_ms: Date.now() - startTime,
        message: "LOVABLE_API_KEY não configurada",
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

      const response = await fetch(endpoint.url, {
        method: endpoint.method,
        headers: {
          Authorization: `Bearer ${lovableKey}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return {
          status: "online",
          response_time_ms: Date.now() - startTime,
          message: "Lovable AI Gateway operacional",
        };
      } else if (response.status === 401 || response.status === 403) {
        return {
          status: "auth_error",
          response_time_ms: Date.now() - startTime,
          message: "Erro de autenticação com Lovable AI",
        };
      } else {
        return {
          status: "offline",
          response_time_ms: Date.now() - startTime,
          message: `HTTP ${response.status}`,
        };
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return {
          status: "timeout",
          response_time_ms: endpoint.timeout,
          message: "Timeout ao conectar com Lovable AI",
        };
      }
      throw error;
    }
  }

  // For integrations requiring credentials
  if (!credentials) {
    return {
      status: "offline",
      response_time_ms: Date.now() - startTime,
      message: "Credenciais não configuradas",
    };
  }

  // Generic endpoint check with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), endpoint.timeout);

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers: {
        "User-Agent": "Vitrio-ERP/1.0",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok || response.status < 400) {
      return {
        status: "online",
        response_time_ms: Date.now() - startTime,
        message: "Serviço operacional",
      };
    } else if (response.status === 401 || response.status === 403) {
      return {
        status: "auth_error",
        response_time_ms: Date.now() - startTime,
        message: "Erro de autenticação - verifique as credenciais",
      };
    } else {
      return {
        status: "offline",
        response_time_ms: Date.now() - startTime,
        message: `Serviço retornou HTTP ${response.status}`,
      };
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "timeout",
        response_time_ms: endpoint.timeout,
        message: `Timeout após ${endpoint.timeout / 1000}s`,
      };
    }
    return {
      status: "offline",
      response_time_ms: Date.now() - startTime,
      message: error instanceof Error ? error.message : "Erro de conexão",
    };
  }
}
