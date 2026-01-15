import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Scopes required for each operation
const REQUIRED_SCOPES: Record<string, string[]> = {
  'GET': ['faturamento:read', 'faturamento:*', '*'],
  'POST': ['faturamento:write', 'faturamento:*', '*'],
  'PUT': ['faturamento:write', 'faturamento:*', '*'],
  'DELETE': ['faturamento:delete', 'faturamento:*', '*'],
};

interface AuthResult {
  api_key_id: string;
  company_id: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

serve(async (req) => {
  const startTime = Date.now();
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase: AnySupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  // Get client info for logging
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  const userAgent = req.headers.get('user-agent') || null;

  // Extract API key from header
  const apiKey = req.headers.get('x-api-key');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required', code: 'MISSING_API_KEY' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let authResult: AuthResult | null = null;
  let requestBody: Record<string, unknown> | null = null;

  try {
    // Parse request body for POST/PUT
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        requestBody = await req.json();
      } catch {
        return new Response(
          JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_BODY' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Authenticate API key
    console.log('Authenticating API key...');
    const { data: authData, error: authError } = await supabase.rpc('authenticate_api_key', {
      p_api_key: apiKey
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Authentication failed', code: 'AUTH_ERROR' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData || authData.length === 0) {
      console.log('Invalid or expired API key');
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    authResult = authData[0] as AuthResult;
    console.log('Authenticated for company:', authResult.company_id);

    // Check rate limit
    console.log('Checking rate limit...');
    const { data: rateLimitOk, error: rateLimitError } = await supabase.rpc('check_rate_limit', {
      p_api_key_id: authResult.api_key_id,
      p_limit_per_minute: authResult.rate_limit_per_minute,
      p_limit_per_day: authResult.rate_limit_per_day
    });

    if (rateLimitError) {
      console.error('Rate limit check error:', rateLimitError);
    }

    if (!rateLimitOk) {
      console.log('Rate limit exceeded');
      await logRequest(supabase, authResult, req.method, '/api/v1/faturamento', 429, requestBody, null, 'Rate limit exceeded', startTime, clientIp, userAgent);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // Check scopes
    const requiredScopes = REQUIRED_SCOPES[req.method] || [];
    const hasScope = requiredScopes.some(scope => authResult!.scopes.includes(scope));
    
    if (!hasScope) {
      console.log('Insufficient permissions. Required:', requiredScopes, 'Has:', authResult.scopes);
      await logRequest(supabase, authResult, req.method, '/api/v1/faturamento', 403, requestBody, null, 'Insufficient permissions', startTime, clientIp, userAgent);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN', required_scopes: requiredScopes }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL for resource ID
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const resourceId = pathParts.length > 3 ? pathParts[3] : null;

    // Route to appropriate handler
    let response: Response;
    
    switch (req.method) {
      case 'GET':
        response = resourceId 
          ? await getFatura(supabase, authResult.company_id, resourceId)
          : await listFaturas(supabase, authResult.company_id, url.searchParams);
        break;
      case 'POST':
        response = await createFatura(supabase, authResult.company_id, requestBody);
        break;
      case 'PUT':
        if (!resourceId) {
          response = new Response(
            JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = await updateFatura(supabase, authResult.company_id, resourceId, requestBody);
        }
        break;
      case 'DELETE':
        if (!resourceId) {
          response = new Response(
            JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          response = await deleteFatura(supabase, authResult.company_id, resourceId);
        }
        break;
      default:
        response = new Response(
          JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
          { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Log the request
    const responseBody = await response.clone().json().catch(() => null);
    await logRequest(supabase, authResult, req.method, url.pathname, response.status, requestBody, responseBody, null, startTime, clientIp, userAgent);

    return response;

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (authResult) {
      await logRequest(supabase, authResult, req.method, '/api/v1/faturamento', 500, requestBody, null, errorMessage, startTime, clientIp, userAgent);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper function to log requests
async function logRequest(
  supabase: AnySupabaseClient,
  auth: AuthResult,
  method: string,
  endpoint: string,
  statusCode: number,
  requestBody: Record<string, unknown> | null,
  responseBody: unknown,
  errorMessage: string | null,
  startTime: number,
  clientIp: string,
  userAgent: string | null
) {
  const latencyMs = Date.now() - startTime;
  
  try {
    await supabase.rpc('log_api_request', {
      p_api_key_id: auth.api_key_id,
      p_company_id: auth.company_id,
      p_method: method,
      p_endpoint: endpoint,
      p_status_code: statusCode,
      p_request_body: requestBody ? JSON.stringify(requestBody) : null,
      p_response_body: responseBody ? JSON.stringify(responseBody) : null,
      p_error_message: errorMessage,
      p_latency_ms: latencyMs,
      p_ip_address: clientIp,
      p_user_agent: userAgent
    });
  } catch (logError) {
    console.error('Failed to log request:', logError);
  }
}

// GET /api/v1/faturamento - List invoices
async function listFaturas(
  supabase: AnySupabaseClient,
  companyId: string,
  params: URLSearchParams
) {
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  const status = params.get('status');
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const counterpartyId = params.get('counterparty_id');

  console.log('Listing faturas for company:', companyId);

  let query = supabase
    .from('invoices')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }
  if (startDate) {
    query = query.gte('issue_date', startDate);
  }
  if (endDate) {
    query = query.lte('issue_date', endDate);
  }
  if (counterpartyId) {
    query = query.eq('counterparty_id', counterpartyId);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('List error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list invoices', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      data,
      pagination: {
        page,
        limit,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit)
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// GET /api/v1/faturamento/:id - Get single invoice
async function getFatura(
  supabase: AnySupabaseClient,
  companyId: string,
  id: string
) {
  console.log('Getting fatura:', id);

  const { data, error } = await supabase
    .from('invoices')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Invoice not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('Get error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get invoice', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// POST /api/v1/faturamento - Create invoice
async function createFatura(
  supabase: AnySupabaseClient,
  companyId: string,
  body: Record<string, unknown> | null
) {
  console.log('Creating fatura for company:', companyId);

  if (!body || typeof body !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Basic validation
  if (!body.counterparty_id) {
    return new Response(
      JSON.stringify({ error: 'counterparty_id is required', code: 'VALIDATION_ERROR' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const invoiceData = {
    ...body,
    company_id: companyId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('invoices')
    .insert(invoiceData)
    .select()
    .single();

  if (error) {
    console.error('Create error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create invoice', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'Invoice created successfully' }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// PUT /api/v1/faturamento/:id - Update invoice
async function updateFatura(
  supabase: AnySupabaseClient,
  companyId: string,
  id: string,
  body: Record<string, unknown> | null
) {
  console.log('Updating fatura:', id);

  if (!body || typeof body !== 'object') {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Remove fields that shouldn't be updated
  const { company_id: _companyId, id: _id, created_at: _createdAt, ...updateData } = body;
  
  const { data, error } = await supabase
    .from('invoices')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return new Response(
        JSON.stringify({ error: 'Invoice not found', code: 'NOT_FOUND' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.error('Update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update invoice', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'Invoice updated successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// DELETE /api/v1/faturamento/:id - Delete invoice
async function deleteFatura(
  supabase: AnySupabaseClient,
  companyId: string,
  id: string
) {
  console.log('Deleting fatura:', id);

  // Check if invoice exists first
  const { data: existing } = await supabase
    .from('invoices')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', id)
    .single();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'Invoice not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);

  if (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete invoice', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ message: 'Invoice deleted successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
