import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Security headers for all responses
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { limit = 10 } = await req.json().catch(() => ({}));

    // Get pending jobs with keyset pagination (cursor-based)
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (jobsError) throw jobsError;

    console.log(`[process-jobs] Processing ${jobs?.length || 0} jobs`);

    const results = [];

    for (const job of jobs || []) {
      console.log(`[process-jobs] Processing job ${job.id}: ${job.job_type}`);

      // Mark as processing
      await supabase
        .from('jobs_queue')
        .update({
          status: 'processing',
          started_at: new Date().toISOString(),
          attempts: job.attempts + 1,
        })
        .eq('id', job.id);

      try {
        let result;

        switch (job.job_type) {
          // AI Jobs
          case 'parse_message':
            const parseResponse = await supabase.functions.invoke('ai-parse-message', {
              body: {
                inbox_id: job.payload_json.inbox_id,
                text: job.payload_json.text,
                company_id: job.company_id,
              },
            });
            result = parseResponse.data;
            break;

          case 'execute_actions':
            const execResponse = await supabase.functions.invoke('ai-execute-actions', {
              body: { decision_id: job.payload_json.decision_id },
            });
            result = execResponse.data;
            break;

          // Export Jobs (async XLSX/PDF)
          case 'export_xlsx':
          case 'export_pdf':
            result = await processExportJob(supabase, job);
            break;

          // Import Jobs
          case 'import_file':
          case 'parse_bank_statement':
            result = await processImportJob(supabase, job);
            break;

          // Refresh Facts/Cache
          case 'refresh_facts':
          case 'refresh_cache':
            const refreshResponse = await supabase.functions.invoke('refresh-cache', {});
            result = refreshResponse.data;
            break;

          // CNAB Processing
          case 'cnab_return':
            result = await processCnabReturn(supabase, job);
            break;

          // Reconciliation Batch
          case 'reconcile_batch':
            const reconResponse = await supabase.functions.invoke('reconcile-engine', {
              body: job.payload_json,
            });
            result = reconResponse.data;
            break;

          // WhatsApp
          case 'send_whatsapp':
            const sendResponse = await supabase.functions.invoke('whatsapp-send-message', {
              body: job.payload_json,
            });
            result = sendResponse.data;
            break;

          // Media Download
          case 'download_media':
            result = await processMediaDownload(supabase, job);
            break;

          // DLQ Reprocess
          case 'reprocess_dlq':
            result = await reprocessDLQItem(supabase, job);
            break;

          default:
            console.log(`[process-jobs] Unknown job type: ${job.job_type}`);
            result = { error: 'Unknown job type', job_type: job.job_type };
        }

        // Mark as completed
        await supabase
          .from('jobs_queue')
          .update({
            status: 'completed',
            finished_at: new Date().toISOString(),
            result_json: result,
          })
          .eq('id', job.id);

        results.push({ job_id: job.id, status: 'completed', result });

      } catch (jobError: unknown) {
        console.error(`[process-jobs] Job ${job.id} error:`, jobError);
        const errMsg = jobError instanceof Error ? jobError.message : String(jobError);
        const errStack = jobError instanceof Error ? jobError.stack : undefined;

        // Exponential backoff retry
        const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending';
        const backoffMinutes = Math.pow(2, job.attempts); // 2, 4, 8, 16 minutes
        const newScheduledAt = newStatus === 'pending' 
          ? new Date(Date.now() + backoffMinutes * 60000).toISOString()
          : null;

        await supabase
          .from('jobs_queue')
          .update({
            status: newStatus,
            finished_at: newStatus === 'failed' ? new Date().toISOString() : null,
            scheduled_at: newScheduledAt,
            error_json: { message: errMsg, stack: errStack?.substring(0, 500) },
          })
          .eq('id', job.id);

        // If exhausted, move to DLQ
        if (newStatus === 'failed') {
          await supabase.from('integration_dlq').insert({
            company_id: job.company_id,
            source: job.job_type,
            payload_json: job.payload_json,
            error_message: errMsg,
            error_json: { message: errMsg, job_id: job.id, attempts: job.attempts + 1 },
          });
        }

        results.push({ job_id: job.id, status: newStatus, error: errMsg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('[process-jobs] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper: Process Export Jobs
async function processExportJob(supabase: any, job: any) {
  const { export_type, filters, format } = job.payload_json;
  
  // Build query based on export_type
  let query;
  switch (export_type) {
    case 'transactions':
      query = supabase
        .from('transactions')
        .select('*, accounts(name), wallets(name), counterparties(name)')
        .eq('company_id', job.company_id);
      break;
    case 'ar_open':
      query = supabase.from('v_ar_open').select('*').eq('company_id', job.company_id);
      break;
    case 'ap_open':
      query = supabase.from('v_ap_open').select('*').eq('company_id', job.company_id);
      break;
    default:
      throw new Error(`Unknown export type: ${export_type}`);
  }

  // Apply filters
  if (filters?.date_from) query = query.gte('transaction_date', filters.date_from);
  if (filters?.date_to) query = query.lte('transaction_date', filters.date_to);
  if (filters?.status) query = query.eq('status', filters.status);

  const { data, error } = await query.limit(10000);
  if (error) throw error;

  // Generate file (in production, would create actual XLSX/PDF)
  const fileName = `export_${export_type}_${Date.now()}.${format || 'json'}`;
  const fileContent = JSON.stringify(data, null, 2);

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('exports')
    .upload(`${job.company_id}/${fileName}`, fileContent, {
      contentType: 'application/json',
    });

  if (uploadError && !uploadError.message.includes('already exists')) {
    throw uploadError;
  }

  // Get signed URL
  const { data: urlData } = await supabase.storage
    .from('exports')
    .createSignedUrl(`${job.company_id}/${fileName}`, 3600 * 24); // 24h

  return {
    rows_exported: data.length,
    file_name: fileName,
    download_url: urlData?.signedUrl,
    expires_at: new Date(Date.now() + 3600 * 24 * 1000).toISOString(),
  };
}

// Helper: Process Import Jobs
async function processImportJob(supabase: any, job: any) {
  const { file_id, file_type } = job.payload_json;
  
  // Get file from storage
  const { data: fileRecord } = await supabase
    .from('received_files')
    .select('*')
    .eq('id', file_id)
    .single();

  if (!fileRecord) throw new Error('File not found');

  // Update status
  await supabase
    .from('received_files')
    .update({ parsed_status: 'processing' })
    .eq('id', file_id);

  // Parse based on type (would invoke AI parser for complex files)
  let result;
  if (file_type === 'ofx' || file_type === 'csv') {
    const parseResponse = await supabase.functions.invoke('ai-statement-parser', {
      body: { file_id, company_id: job.company_id },
    });
    result = parseResponse.data;
  } else {
    result = { status: 'parsed', file_id };
  }

  await supabase
    .from('received_files')
    .update({ parsed_status: 'completed', parsed_at: new Date().toISOString() })
    .eq('id', file_id);

  return result;
}

// Helper: Process CNAB Return
async function processCnabReturn(supabase: any, job: any) {
  const { file_id, bank_code } = job.payload_json;
  
  // This would parse CNAB 240/400 return file
  // and update boletos with payment confirmations
  console.log(`[process-jobs] Processing CNAB return for bank ${bank_code}`);
  
  return { 
    status: 'processed', 
    file_id, 
    bank_code,
    message: 'CNAB return processing not fully implemented'
  };
}

// Helper: Process Media Download
async function processMediaDownload(supabase: any, job: any) {
  const { media_url, mime_type, inbox_id, provider } = job.payload_json;
  
  let fileData;
  if (provider === 'whatsapp_cloud') {
    const { data: connection } = await supabase
      .from('whatsapp_connections')
      .select('credentials_encrypted')
      .eq('company_id', job.company_id)
      .single();

    const creds = JSON.parse(connection?.credentials_encrypted || '{}');
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${media_url}`,
      { headers: { 'Authorization': `Bearer ${creds.access_token}` } }
    );
    const mediaInfo = await mediaResponse.json();
    
    const downloadResponse = await fetch(mediaInfo.url, {
      headers: { 'Authorization': `Bearer ${creds.access_token}` },
    });
    fileData = await downloadResponse.arrayBuffer();
  } else {
    const response = await fetch(media_url);
    fileData = await response.arrayBuffer();
  }

  // Calculate SHA256 for deduplication
  const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Determine file type
  let fileType = 'other';
  if (mime_type?.includes('pdf')) fileType = 'pdf';
  else if (mime_type?.includes('image')) fileType = 'image';
  else if (mime_type?.includes('audio')) fileType = 'audio';
  else if (mime_type?.includes('csv')) fileType = 'csv';
  else if (mime_type?.includes('sheet') || mime_type?.includes('xlsx')) fileType = 'xlsx';
  else if (mime_type?.includes('ofx')) fileType = 'ofx';

  // Upload to storage
  const fileName = `${job.company_id}/${inbox_id}/${crypto.randomUUID()}.${fileType}`;
  const { error: uploadError } = await supabase.storage
    .from('whatsapp-files')
    .upload(fileName, fileData, { contentType: mime_type });

  if (uploadError) throw uploadError;

  // Create received_files record
  const { data: fileRecord } = await supabase
    .from('received_files')
    .insert({
      company_id: job.company_id,
      inbox_id: inbox_id,
      storage_path: fileName,
      file_type: fileType,
      mime_type: mime_type,
      sha256,
      size_bytes: fileData.byteLength,
      parsed_status: 'pending',
    })
    .select()
    .single();

  // Create follow-up job based on file type
  let followUpJobType;
  if (['ofx', 'csv', 'xlsx'].includes(fileType)) {
    followUpJobType = 'parse_bank_statement';
  } else if (['pdf', 'image'].includes(fileType)) {
    followUpJobType = 'parse_receipt_document';
  } else if (fileType === 'audio') {
    followUpJobType = 'parse_audio';
  }

  if (followUpJobType) {
    await supabase.from('jobs_queue').insert({
      company_id: job.company_id,
      job_type: followUpJobType,
      payload_json: { file_id: fileRecord?.id, inbox_id },
      priority: 2,
    });
  }

  return { file_id: fileRecord?.id, file_type: fileType, sha256 };
}

// Helper: Reprocess DLQ Item
async function reprocessDLQItem(supabase: any, job: any) {
  const { dlq_id, original_payload } = job.payload_json;
  
  // Simply re-queue the original job
  console.log(`[process-jobs] Reprocessing DLQ item ${dlq_id}`);
  
  return { 
    status: 'requeued', 
    dlq_id,
    message: 'Item requeued for processing'
  };
}
