// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

// Scopes required for each operation
const REQUIRED_SCOPES: Record<string, string[]> = {
  'GET': ['crm:read', 'crm:*', '*'],
  'POST': ['crm:write', 'crm:*', '*'],
  'PUT': ['crm:write', 'crm:*', '*'],
  'DELETE': ['crm:delete', 'crm:*', '*'],
};

interface AuthResult {
  api_key_id: string;
  company_id: string;
  scopes: string[];
  rate_limit_per_minute: number;
  rate_limit_per_day: number;
}

interface ApiResponse {
  data?: unknown;
  error?: string;
  code?: string;
  message?: string;
  details?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

interface ClienteInput {
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  segment?: string;
  status?: string;
  address?: Record<string, unknown>;
  notes?: string;
  [key: string]: unknown;
}

interface LeadInput {
  name?: string;
  email?: string;
  phone?: string;
  source?: string;
  status?: string;
  score?: number;
  notes?: string;
  [key: string]: unknown;
}

type AnySupabaseClient = SupabaseClient<any, any, any>;

serve(async (req) => {
  const startTime = Date.now();
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase: AnySupabaseClient = createClient(supabaseUrl, supabaseServiceKey);

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '0.0.0.0';
  const userAgent = req.headers.get('user-agent') || null;
  const apiKey = req.headers.get('x-api-key');
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key required', code: 'MISSING_API_KEY' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  let authResult: AuthResult | null = null;
  let requestBody: ClienteInput | LeadInput | null = null;

  try {
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

    if (authError || !authData || authData.length === 0) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired API key', code: 'INVALID_API_KEY' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    authResult = authData[0] as AuthResult;
    console.log('Authenticated for company:', authResult.company_id);

    // Check rate limit
    const { data: rateLimitOk } = await supabase.rpc('check_rate_limit', {
      p_api_key_id: authResult.api_key_id,
      p_limit_per_minute: authResult.rate_limit_per_minute,
      p_limit_per_day: authResult.rate_limit_per_day
    });

    if (!rateLimitOk) {
      await logRequest(supabase, authResult, req.method, '/api/v1/crm', 429, requestBody, null, 'Rate limit exceeded', startTime, clientIp, userAgent);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // Check scopes
    const requiredScopes = REQUIRED_SCOPES[req.method] || [];
    const hasScope = requiredScopes.some(scope => authResult!.scopes.includes(scope));
    
    if (!hasScope) {
      await logRequest(supabase, authResult, req.method, '/api/v1/crm', 403, requestBody, null, 'Insufficient permissions', startTime, clientIp, userAgent);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN', required_scopes: requiredScopes }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL for routing
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expected: api/v1/crm/clientes or api/v1/crm/clientes/:id or api/v1/crm/leads
    const resource = pathParts[3]; // 'clientes' or 'leads'
    const resourceId = pathParts.length > 4 ? pathParts[4] : null;

    let response: Response;
    
    if (resource === 'clientes') {
      response = await handleClientes(supabase, authResult.company_id, req.method, resourceId, url.searchParams, requestBody as ClienteInput);
    } else if (resource === 'leads') {
      response = await handleLeads(supabase, authResult.company_id, req.method, resourceId, url.searchParams, requestBody as LeadInput);
    } else {
      response = new Response(
        JSON.stringify({ error: 'Resource not found', code: 'NOT_FOUND', available_resources: ['clientes', 'leads'] }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseBody = await response.clone().json().catch(() => null);
    await logRequest(supabase, authResult, req.method, url.pathname, response.status, requestBody, responseBody, null, startTime, clientIp, userAgent);

    return response;

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (authResult) {
      await logRequest(supabase, authResult, req.method, '/api/v1/crm', 500, requestBody, null, errorMessage, startTime, clientIp, userAgent);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handle Clientes CRUD
async function handleClientes(
  supabase: AnySupabaseClient,
  companyId: string,
  method: string,
  id: string | null,
  params: URLSearchParams,
  body: ClienteInput | null
): Promise<Response> {
  switch (method) {
    case 'GET':
      return id ? getCliente(supabase, companyId, id) : listClientes(supabase, companyId, params);
    case 'POST':
      return createCliente(supabase, companyId, body);
    case 'PUT':
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return updateCliente(supabase, companyId, id, body);
    case 'DELETE':
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return deleteCliente(supabase, companyId, id);
    default:
      return new Response(
        JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

// Handle Leads
async function handleLeads(
  supabase: AnySupabaseClient,
  companyId: string,
  method: string,
  id: string | null,
  params: URLSearchParams,
  body: LeadInput | null
): Promise<Response> {
  switch (method) {
    case 'GET':
      return id ? getLead(supabase, companyId, id) : listLeads(supabase, companyId, params);
    case 'POST':
      return createLead(supabase, companyId, body);
    case 'PUT':
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return updateLead(supabase, companyId, id, body);
    case 'DELETE':
      if (!id) {
        return new Response(
          JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return deleteLead(supabase, companyId, id);
    default:
      return new Response(
        JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

// Log request helper
async function logRequest(
  supabase: AnySupabaseClient,
  auth: AuthResult,
  method: string,
  endpoint: string,
  statusCode: number,
  requestBody: ClienteInput | LeadInput | null,
  responseBody: ApiResponse | null,
  errorMessage: string | null,
  startTime: number,
  clientIp: string,
  userAgent: string | null
): Promise<void> {
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

// ==================== CLIENTES ====================

async function listClientes(supabase: AnySupabaseClient, companyId: string, params: URLSearchParams): Promise<Response> {
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  const status = params.get('status');
  const segment = params.get('segment');
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const sortBy = params.get('sort_by') || 'created_at';
  const sortOrder = params.get('sort_order') === 'asc';
  const search = params.get('search');

  console.log('Listing clientes for company:', companyId);

  let query = supabase
    .from('counterparties')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('type', 'customer')
    .order(sortBy, { ascending: sortOrder })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (segment) query = query.eq('segment', segment);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,document.ilike.%${search}%`);

  const { data, error, count } = await query;

  if (error) {
    console.error('List clientes error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list clients', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      data,
      pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getCliente(supabase: AnySupabaseClient, companyId: string, id: string): Promise<Response> {
  console.log('Getting cliente:', id);

  const { data, error } = await supabase
    .from('counterparties')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .eq('type', 'customer')
    .maybeSingle();

  if (error) {
    console.error('Get cliente error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get client', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Client not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createCliente(supabase: AnySupabaseClient, companyId: string, body: ClienteInput | null): Promise<Response> {
  console.log('Creating cliente for company:', companyId);

  if (!body) {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.name) {
    return new Response(
      JSON.stringify({ error: 'name is required', code: 'VALIDATION_ERROR' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const clienteData = {
    ...body,
    company_id: companyId,
    type: 'customer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('counterparties')
    .insert(clienteData)
    .select()
    .single();

  if (error) {
    console.error('Create cliente error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create client', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'Client created successfully' }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateCliente(supabase: AnySupabaseClient, companyId: string, id: string, body: ClienteInput | null): Promise<Response> {
  console.log('Updating cliente:', id);

  if (!body) {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { company_id: _c, id: _i, created_at: _ca, type: _t, ...updateData } = body;
  
  const { data, error } = await supabase
    .from('counterparties')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', id)
    .eq('type', 'customer')
    .select()
    .maybeSingle();

  if (error) {
    console.error('Update cliente error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update client', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Client not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'Client updated successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteCliente(supabase: AnySupabaseClient, companyId: string, id: string): Promise<Response> {
  console.log('Deleting cliente:', id);

  const { data: existing } = await supabase
    .from('counterparties')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', id)
    .eq('type', 'customer')
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'Client not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('counterparties')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);

  if (error) {
    console.error('Delete cliente error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete client', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ message: 'Client deleted successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// ==================== LEADS ====================

async function listLeads(supabase: AnySupabaseClient, companyId: string, params: URLSearchParams): Promise<Response> {
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  const status = params.get('status');
  const source = params.get('source');
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const sortBy = params.get('sort_by') || 'created_at';
  const sortOrder = params.get('sort_order') === 'asc';

  console.log('Listing leads for company:', companyId);

  let query = supabase
    .from('crm_leads')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order(sortBy, { ascending: sortOrder })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (source) query = query.eq('source', source);
  if (startDate) query = query.gte('created_at', startDate);
  if (endDate) query = query.lte('created_at', endDate);

  const { data, error, count } = await query;

  if (error) {
    console.error('List leads error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list leads', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({
      data,
      pagination: { page, limit, total: count || 0, total_pages: Math.ceil((count || 0) / limit) }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getLead(supabase: AnySupabaseClient, companyId: string, id: string): Promise<Response> {
  console.log('Getting lead:', id);

  const { data, error } = await supabase
    .from('crm_leads')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Get lead error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get lead', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Lead not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function createLead(supabase: AnySupabaseClient, companyId: string, body: LeadInput | null): Promise<Response> {
  console.log('Creating lead for company:', companyId);

  if (!body) {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.name) {
    return new Response(
      JSON.stringify({ error: 'name is required', code: 'VALIDATION_ERROR' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const leadData = {
    ...body,
    company_id: companyId,
    status: body.status || 'new',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('crm_leads')
    .insert(leadData)
    .select()
    .single();

  if (error) {
    console.error('Create lead error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create lead', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'Lead created successfully' }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateLead(supabase: AnySupabaseClient, companyId: string, id: string, body: LeadInput | null): Promise<Response> {
  console.log('Updating lead:', id);

  if (!body) {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { company_id: _c, id: _i, created_at: _ca, ...updateData } = body;
  
  const { data, error } = await supabase
    .from('crm_leads')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Update lead error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update lead', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Lead not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'Lead updated successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteLead(supabase: AnySupabaseClient, companyId: string, id: string): Promise<Response> {
  console.log('Deleting lead:', id);

  const { data: existing } = await supabase
    .from('crm_leads')
    .select('id')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'Lead not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('crm_leads')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);

  if (error) {
    console.error('Delete lead error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete lead', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ message: 'Lead deleted successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
