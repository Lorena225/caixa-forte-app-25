// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const REQUIRED_SCOPES: Record<string, string[]> = {
  'GET': ['fiscal:read', 'fiscal:*', '*'],
  'POST': ['fiscal:write', 'fiscal:*', '*'],
  'PUT': ['fiscal:write', 'fiscal:*', '*'],
  'DELETE': ['fiscal:delete', 'fiscal:*', '*'],
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

interface NFeInput {
  numero?: string;
  serie?: string;
  natureza_operacao?: string;
  destinatario_id?: string;
  items?: Record<string, unknown>[];
  valor_total?: number;
  [key: string]: unknown;
}

interface ImpostoQuery {
  valor?: number;
  ncm?: string;
  cfop?: string;
  uf_origem?: string;
  uf_destino?: string;
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
  let requestBody: NFeInput | null = null;

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
      await logRequest(supabase, authResult, req.method, '/api/v1/fiscal', 429, requestBody, null, 'Rate limit exceeded', startTime, clientIp, userAgent);
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }

    // Check scopes
    const requiredScopes = REQUIRED_SCOPES[req.method] || [];
    const hasScope = requiredScopes.some(scope => authResult!.scopes.includes(scope));
    
    if (!hasScope) {
      await logRequest(supabase, authResult, req.method, '/api/v1/fiscal', 403, requestBody, null, 'Insufficient permissions', startTime, clientIp, userAgent);
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN', required_scopes: requiredScopes }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse URL for routing
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Expected: api/v1/fiscal/nfe or api/v1/fiscal/nfe/:id or api/v1/fiscal/impostos
    const resource = pathParts[3]; // 'nfe', 'impostos', 'relatorios', 'tributos'
    const resourceIdOrAction = pathParts.length > 4 ? pathParts[4] : null;
    const action = pathParts.length > 5 ? pathParts[5] : null;

    let response: Response;
    
    switch (resource) {
      case 'nfe':
        response = await handleNFe(supabase, authResult.company_id, req.method, resourceIdOrAction, action, url.searchParams, requestBody);
        break;
      case 'impostos':
        response = await handleImpostos(supabase, authResult.company_id, url.searchParams);
        break;
      case 'relatorios':
        response = await handleRelatorios(supabase, authResult.company_id, url.searchParams);
        break;
      case 'tributos':
        response = await handleTributos(supabase, authResult.company_id, url.searchParams);
        break;
      default:
        response = new Response(
          JSON.stringify({ error: 'Resource not found', code: 'NOT_FOUND', available_resources: ['nfe', 'impostos', 'relatorios', 'tributos'] }),
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
      await logRequest(supabase, authResult, req.method, '/api/v1/fiscal', 500, requestBody, null, errorMessage, startTime, clientIp, userAgent);
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Handle NFe CRUD
async function handleNFe(
  supabase: AnySupabaseClient,
  companyId: string,
  method: string,
  idOrAction: string | null,
  action: string | null,
  params: URLSearchParams,
  body: NFeInput | null
): Promise<Response> {
  // Handle special action: PUT /nfe/:id/cancelar
  if (method === 'PUT' && action === 'cancelar' && idOrAction) {
    return cancelarNFe(supabase, companyId, idOrAction, body);
  }

  switch (method) {
    case 'GET':
      return idOrAction ? getNFe(supabase, companyId, idOrAction) : listNFe(supabase, companyId, params);
    case 'POST':
      return emitirNFe(supabase, companyId, body);
    case 'PUT':
      if (!idOrAction) {
        return new Response(
          JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return updateNFe(supabase, companyId, idOrAction, body);
    case 'DELETE':
      if (!idOrAction) {
        return new Response(
          JSON.stringify({ error: 'Resource ID required', code: 'MISSING_ID' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return deleteNFe(supabase, companyId, idOrAction);
    default:
      return new Response(
        JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
  }
}

// Handle impostos calculation
async function handleImpostos(
  supabase: AnySupabaseClient,
  companyId: string,
  params: URLSearchParams
): Promise<Response> {
  console.log('Calculating impostos for company:', companyId);

  const valor = parseFloat(params.get('valor') || '0');
  const ncm = params.get('ncm');
  const cfop = params.get('cfop');
  const ufOrigem = params.get('uf_origem');
  const ufDestino = params.get('uf_destino');

  // Get company tax regime
  const { data: company } = await supabase
    .from('companies')
    .select('regime_tributario')
    .eq('id', companyId)
    .maybeSingle();

  const regime = company?.regime_tributario || 'simples_nacional';

  // Get tax rules
  let query = supabase
    .from('regras_tributacao')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (ncm) query = query.eq('ncm', ncm);
  if (cfop) query = query.eq('cfop', cfop);
  if (ufOrigem && ufDestino) {
    query = query.eq('uf_origem', ufOrigem).eq('uf_destino', ufDestino);
  }

  const { data: rules } = await query.limit(1);
  const rule = rules?.[0];

  // Calculate taxes based on regime
  let impostos: Record<string, number> = {};

  if (regime === 'simples_nacional') {
    const aliquota = rule?.aliquota_simples || 0.06;
    impostos = {
      simples_nacional: valor * aliquota,
      aliquota_efetiva: aliquota * 100,
      total: valor * aliquota
    };
  } else if (regime === 'lucro_presumido') {
    const icms = valor * (rule?.aliquota_icms || 0.18);
    const pis = valor * 0.0065;
    const cofins = valor * 0.03;
    const irpj = valor * 0.048;
    const csll = valor * 0.0288;
    impostos = { icms, pis, cofins, irpj, csll, total: icms + pis + cofins + irpj + csll };
  } else {
    // Lucro Real
    const icms = valor * (rule?.aliquota_icms || 0.18);
    const pis = valor * 0.0165;
    const cofins = valor * 0.076;
    impostos = { icms, pis, cofins, total: icms + pis + cofins };
  }

  return new Response(
    JSON.stringify({
      data: {
        valor_base: valor,
        regime_tributario: regime,
        ncm,
        cfop,
        uf_origem: ufOrigem,
        uf_destino: ufDestino,
        impostos,
        regra_aplicada: rule?.id || null
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle relatorios
async function handleRelatorios(
  supabase: AnySupabaseClient,
  companyId: string,
  params: URLSearchParams
): Promise<Response> {
  console.log('Generating fiscal report for company:', companyId);

  const tipo = params.get('tipo') || 'resumo';
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const periodo = params.get('periodo'); // mes, trimestre, ano

  let query = supabase
    .from('fiscal_documents')
    .select('*')
    .eq('company_id', companyId);

  if (startDate) query = query.gte('issue_date', startDate);
  if (endDate) query = query.lte('issue_date', endDate);

  const { data: documents, error } = await query;

  if (error) {
    console.error('Report error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate report', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Aggregate data
  const totalEmitidas = documents?.filter(d => d.direction === 'output').length || 0;
  const totalRecebidas = documents?.filter(d => d.direction === 'input').length || 0;
  const valorEmitidas = documents?.filter(d => d.direction === 'output').reduce((s, d) => s + (d.total_amount || 0), 0) || 0;
  const valorRecebidas = documents?.filter(d => d.direction === 'input').reduce((s, d) => s + (d.total_amount || 0), 0) || 0;
  const totalImpostos = documents?.reduce((s, d) => s + (d.tax_amount || 0), 0) || 0;

  const byStatus = documents?.reduce((acc: Record<string, number>, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const byType = documents?.reduce((acc: Record<string, number>, d) => {
    acc[d.document_type] = (acc[d.document_type] || 0) + 1;
    return acc;
  }, {});

  return new Response(
    JSON.stringify({
      data: {
        tipo,
        periodo: { start_date: startDate, end_date: endDate },
        resumo: {
          total_documentos: documents?.length || 0,
          notas_emitidas: totalEmitidas,
          notas_recebidas: totalRecebidas,
          valor_emitidas: valorEmitidas,
          valor_recebidas: valorRecebidas,
          total_impostos: totalImpostos
        },
        por_status: byStatus,
        por_tipo: byType
      }
    }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Handle tributos query
async function handleTributos(
  supabase: AnySupabaseClient,
  companyId: string,
  params: URLSearchParams
): Promise<Response> {
  console.log('Querying tributos for company:', companyId);

  const ncm = params.get('ncm');
  const cfop = params.get('cfop');
  const uf = params.get('uf');

  let query = supabase
    .from('regras_tributacao')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (ncm) query = query.ilike('ncm', `${ncm}%`);
  if (cfop) query = query.eq('cfop', cfop);
  if (uf) query = query.or(`uf_origem.eq.${uf},uf_destino.eq.${uf}`);

  const { data, error, count } = await query;

  if (error) {
    console.error('Tributos query error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to query tributos', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, total: count || 0 }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

// Log request helper
async function logRequest(
  supabase: AnySupabaseClient,
  auth: AuthResult,
  method: string,
  endpoint: string,
  statusCode: number,
  requestBody: NFeInput | null,
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

// ==================== NFE OPERATIONS ====================

async function listNFe(supabase: AnySupabaseClient, companyId: string, params: URLSearchParams): Promise<Response> {
  const page = parseInt(params.get('page') || '1');
  const limit = Math.min(parseInt(params.get('limit') || '50'), 100);
  const offset = (page - 1) * limit;
  const status = params.get('status');
  const tipo = params.get('tipo');
  const startDate = params.get('start_date');
  const endDate = params.get('end_date');
  const sortBy = params.get('sort_by') || 'issue_date';
  const sortOrder = params.get('sort_order') === 'asc';

  console.log('Listing NFe for company:', companyId);

  let query = supabase
    .from('fiscal_documents')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .in('document_type', ['nfe', 'nfce'])
    .order(sortBy, { ascending: sortOrder })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (tipo) query = query.eq('document_type', tipo);
  if (startDate) query = query.gte('issue_date', startDate);
  if (endDate) query = query.lte('issue_date', endDate);

  const { data, error, count } = await query;

  if (error) {
    console.error('List NFe error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to list NFe', code: 'DATABASE_ERROR', details: error.message }),
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

async function getNFe(supabase: AnySupabaseClient, companyId: string, id: string): Promise<Response> {
  console.log('Getting NFe:', id);

  const { data, error } = await supabase
    .from('fiscal_documents')
    .select('*')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Get NFe error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to get NFe', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!data) {
    return new Response(
      JSON.stringify({ error: 'NFe not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function emitirNFe(supabase: AnySupabaseClient, companyId: string, body: NFeInput | null): Promise<Response> {
  console.log('Emitting NFe for company:', companyId);

  if (!body) {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.destinatario_id) {
    return new Response(
      JSON.stringify({ error: 'destinatario_id is required', code: 'VALIDATION_ERROR' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
    return new Response(
      JSON.stringify({ error: 'items array is required', code: 'VALIDATION_ERROR' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const nfeData = {
    company_id: companyId,
    document_type: 'nfe',
    document_number: body.numero,
    series: body.serie || '1',
    counterparty_id: body.destinatario_id,
    direction: 'output',
    status: 'draft',
    issue_date: new Date().toISOString(),
    total_amount: body.valor_total || 0,
    items_json: body.items,
    nature_of_operation: body.natureza_operacao || 'Venda de mercadoria',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('fiscal_documents')
    .insert(nfeData)
    .select()
    .single();

  if (error) {
    console.error('Emit NFe error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to emit NFe', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'NFe created successfully (draft)' }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateNFe(supabase: AnySupabaseClient, companyId: string, id: string, body: NFeInput | null): Promise<Response> {
  console.log('Updating NFe:', id);

  if (!body) {
    return new Response(
      JSON.stringify({ error: 'Request body required', code: 'INVALID_BODY' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if NFe can be updated (only drafts)
  const { data: existing } = await supabase
    .from('fiscal_documents')
    .select('status')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'NFe not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (existing.status !== 'draft') {
    return new Response(
      JSON.stringify({ error: 'Only draft NFe can be updated', code: 'INVALID_STATUS' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { company_id: _c, id: _i, created_at: _ca, ...updateData } = body;
  
  const { data, error } = await supabase
    .from('fiscal_documents')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Update NFe error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update NFe', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'NFe updated successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function cancelarNFe(supabase: AnySupabaseClient, companyId: string, id: string, body: NFeInput | null): Promise<Response> {
  console.log('Canceling NFe:', id);

  const { data: existing } = await supabase
    .from('fiscal_documents')
    .select('status, access_key')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'NFe not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (existing.status === 'cancelled') {
    return new Response(
      JSON.stringify({ error: 'NFe already cancelled', code: 'ALREADY_CANCELLED' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (existing.status !== 'authorized') {
    return new Response(
      JSON.stringify({ error: 'Only authorized NFe can be cancelled', code: 'INVALID_STATUS' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const motivo = (body as Record<string, unknown>)?.motivo || 'Cancelamento solicitado via API';

  const { data, error } = await supabase
    .from('fiscal_documents')
    .update({ 
      status: 'cancelled',
      cancellation_date: new Date().toISOString(),
      cancellation_reason: motivo,
      updated_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Cancel NFe error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to cancel NFe', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ data, message: 'NFe cancelled successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteNFe(supabase: AnySupabaseClient, companyId: string, id: string): Promise<Response> {
  console.log('Deleting NFe:', id);

  const { data: existing } = await supabase
    .from('fiscal_documents')
    .select('status')
    .eq('company_id', companyId)
    .eq('id', id)
    .maybeSingle();

  if (!existing) {
    return new Response(
      JSON.stringify({ error: 'NFe not found', code: 'NOT_FOUND' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (existing.status !== 'draft') {
    return new Response(
      JSON.stringify({ error: 'Only draft NFe can be deleted', code: 'INVALID_STATUS' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { error } = await supabase
    .from('fiscal_documents')
    .delete()
    .eq('company_id', companyId)
    .eq('id', id);

  if (error) {
    console.error('Delete NFe error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete NFe', code: 'DATABASE_ERROR', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ message: 'NFe deleted successfully' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
