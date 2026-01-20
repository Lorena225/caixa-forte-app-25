import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

interface BackupExecution {
  id: string;
  backup_job_id: string;
  status: string;
  iniciado_em: string;
  finalizado_em?: string;
  detalhes?: Record<string, unknown>;
  local_armazenamento?: string;
  tamanho_bytes?: number;
  arquivos_processados?: number;
  erro_mensagem?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace('/backup-api', '');

  // Initialize Supabase client with service role for internal operations
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate API key from header (simple auth for external scripts)
  const apiKey = req.headers.get('x-api-key');
  const authHeader = req.headers.get('authorization');
  
  // Allow either x-api-key header or Bearer token
  if (!apiKey && !authHeader) {
    console.error('[backup-api] No authentication provided');
    return new Response(
      JSON.stringify({ error: 'Authentication required' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // If using Bearer token, validate it
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[backup-api] Invalid token:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[backup-api] Authenticated user: ${user.id}`);
  }

  // If using API key, validate against api_keys table
  if (apiKey) {
    // Simple hash comparison (in production, use proper hashing)
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('id, company_id, scopes')
      .eq('key_prefix', apiKey.substring(0, 8))
      .eq('is_active', true)
      .maybeSingle();

    if (keyError || !keyData) {
      console.error('[backup-api] Invalid API key');
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    console.log(`[backup-api] API key validated for company: ${keyData.company_id}`);
  }

  try {
    // GET /pending - List pending backup executions
    if (req.method === 'GET' && path === '/pending') {
      const companyId = url.searchParams.get('company_id');
      console.log(`[backup-api] Fetching pending executions for company: ${companyId || 'all'}`);

      let query = supabase
        .from('backup_executions')
        .select(`
          id,
          backup_job_id,
          company_id,
          status,
          iniciado_em,
          trigger_type,
          detalhes,
          backup_jobs (
            nome_job,
            tipo,
            alvo,
            configuracao_json
          )
        `)
        .in('status', ['pendente', 'em_andamento'])
        .order('iniciado_em', { ascending: true });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[backup-api] Error fetching pending:', error);
        throw error;
      }

      console.log(`[backup-api] Found ${data?.length || 0} pending executions`);
      return new Response(
        JSON.stringify({ executions: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /start - Start a backup execution (set status to em_andamento)
    if (req.method === 'POST' && path === '/start') {
      const { execution_id } = await req.json();
      console.log(`[backup-api] Starting execution: ${execution_id}`);

      const { data, error } = await supabase
        .from('backup_executions')
        .update({
          status: 'em_andamento',
          iniciado_em: new Date().toISOString(),
          detalhes: { started_by: 'external_script', started_at: new Date().toISOString() },
        })
        .eq('id', execution_id)
        .eq('status', 'pendente')
        .select()
        .single();

      if (error) {
        console.error('[backup-api] Error starting execution:', error);
        throw error;
      }

      console.log(`[backup-api] Execution started: ${execution_id}`);
      return new Response(
        JSON.stringify({ success: true, execution: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /complete - Mark backup as completed
    if (req.method === 'POST' && path === '/complete') {
      const body: Partial<BackupExecution> & { execution_id: string; success: boolean } = await req.json();
      const { execution_id, success, tamanho_bytes, arquivos_processados, erro_mensagem, local_armazenamento, detalhes } = body;
      
      console.log(`[backup-api] Completing execution: ${execution_id}, success: ${success}`);

      const updateData: Record<string, unknown> = {
        status: success ? 'sucesso' : 'falha',
        finalizado_em: new Date().toISOString(),
      };

      if (tamanho_bytes !== undefined) updateData.tamanho_bytes = tamanho_bytes;
      if (arquivos_processados !== undefined) updateData.arquivos_processados = arquivos_processados;
      if (erro_mensagem) updateData.erro_mensagem = erro_mensagem;
      if (local_armazenamento) updateData.local_armazenamento = local_armazenamento;
      if (detalhes) updateData.detalhes = detalhes;

      const { data, error } = await supabase
        .from('backup_executions')
        .update(updateData)
        .eq('id', execution_id)
        .select()
        .single();

      if (error) {
        console.error('[backup-api] Error completing execution:', error);
        throw error;
      }

      console.log(`[backup-api] Execution completed: ${execution_id} -> ${success ? 'sucesso' : 'falha'}`);
      return new Response(
        JSON.stringify({ success: true, execution: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /jobs - List active backup jobs
    if (req.method === 'GET' && path === '/jobs') {
      const companyId = url.searchParams.get('company_id');
      console.log(`[backup-api] Fetching jobs for company: ${companyId || 'all'}`);

      let query = supabase
        .from('backup_jobs')
        .select('*')
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[backup-api] Error fetching jobs:', error);
        throw error;
      }

      console.log(`[backup-api] Found ${data?.length || 0} active jobs`);
      return new Response(
        JSON.stringify({ jobs: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /schedule - Create a new execution for a job (for cron/scheduler)
    if (req.method === 'POST' && path === '/schedule') {
      const { job_id } = await req.json();
      console.log(`[backup-api] Scheduling execution for job: ${job_id}`);

      // Get job details
      const { data: job, error: jobError } = await supabase
        .from('backup_jobs')
        .select('*')
        .eq('id', job_id)
        .eq('ativo', true)
        .single();

      if (jobError || !job) {
        console.error('[backup-api] Job not found or inactive:', jobError);
        return new Response(
          JSON.stringify({ error: 'Job not found or inactive' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create execution
      const { data: execution, error: execError } = await supabase
        .from('backup_executions')
        .insert({
          backup_job_id: job_id,
          company_id: job.company_id,
          status: 'pendente',
          trigger_type: 'agendado',
          detalhes: { scheduled_at: new Date().toISOString() },
        })
        .select()
        .single();

      if (execError) {
        console.error('[backup-api] Error creating execution:', execError);
        throw execError;
      }

      console.log(`[backup-api] Execution scheduled: ${execution.id}`);
      return new Response(
        JSON.stringify({ success: true, execution }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /policy - Get backup policy for a company
    if (req.method === 'GET' && path === '/policy') {
      const companyId = url.searchParams.get('company_id');
      if (!companyId) {
        return new Response(
          JSON.stringify({ error: 'company_id is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[backup-api] Fetching policy for company: ${companyId}`);

      const { data, error } = await supabase
        .from('backup_policy_settings')
        .select('*')
        .eq('company_id', companyId)
        .maybeSingle();

      if (error) {
        console.error('[backup-api] Error fetching policy:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ policy: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default: endpoint not found
    console.warn(`[backup-api] Unknown endpoint: ${req.method} ${path}`);
    return new Response(
      JSON.stringify({ 
        error: 'Endpoint not found',
        available_endpoints: [
          'GET /pending - List pending backup executions',
          'POST /start - Start a backup execution',
          'POST /complete - Mark backup as completed',
          'GET /jobs - List active backup jobs',
          'POST /schedule - Create a new execution for a job',
          'GET /policy - Get backup policy for a company',
        ]
      }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Internal server error';
    console.error('[backup-api] Internal error:', err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
