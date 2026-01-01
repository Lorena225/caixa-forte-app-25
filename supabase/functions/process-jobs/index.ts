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

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { limit = 10 } = await req.json().catch(() => ({}));

    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (jobsError) throw jobsError;

    console.log(`Processing ${jobs?.length || 0} jobs`);

    const results = [];

    for (const job of jobs || []) {
      console.log(`Processing job ${job.id}: ${job.job_type}`);

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
              body: {
                decision_id: job.payload_json.decision_id,
              },
            });
            result = execResponse.data;
            break;

          case 'download_media':
            // Download and store media file
            const mediaUrl = job.payload_json.media_url;
            const mimeType = job.payload_json.mime_type;
            const inboxId = job.payload_json.inbox_id;

            // For Twilio, we can fetch directly
            // For WhatsApp Cloud, we need to use the Media API
            let fileData;
            if (job.payload_json.provider === 'whatsapp_cloud') {
              // Get download URL from WhatsApp
              const { data: connection } = await supabase
                .from('whatsapp_connections')
                .select('credentials_encrypted')
                .eq('company_id', job.company_id)
                .single();

              const creds = JSON.parse(connection?.credentials_encrypted || '{}');
              const mediaResponse = await fetch(
                `https://graph.facebook.com/v18.0/${mediaUrl}`,
                { headers: { 'Authorization': `Bearer ${creds.access_token}` } }
              );
              const mediaInfo = await mediaResponse.json();
              
              const downloadResponse = await fetch(mediaInfo.url, {
                headers: { 'Authorization': `Bearer ${creds.access_token}` },
              });
              fileData = await downloadResponse.arrayBuffer();
            } else {
              const response = await fetch(mediaUrl);
              fileData = await response.arrayBuffer();
            }

            // Calculate SHA256
            const hashBuffer = await crypto.subtle.digest('SHA-256', fileData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            // Determine file type
            let fileType = 'other';
            if (mimeType?.includes('pdf')) fileType = 'pdf';
            else if (mimeType?.includes('image')) fileType = 'image';
            else if (mimeType?.includes('audio')) fileType = 'audio';
            else if (mimeType?.includes('csv')) fileType = 'csv';
            else if (mimeType?.includes('sheet') || mimeType?.includes('xlsx')) fileType = 'xlsx';
            else if (mimeType?.includes('ofx')) fileType = 'ofx';

            // Upload to storage
            const fileName = `${job.company_id}/${inboxId}/${crypto.randomUUID()}.${fileType}`;
            const { error: uploadError } = await supabase.storage
              .from('whatsapp-files')
              .upload(fileName, fileData, { contentType: mimeType });

            if (uploadError) throw uploadError;

            // Create received_files record
            const { data: fileRecord } = await supabase
              .from('received_files')
              .insert({
                company_id: job.company_id,
                inbox_id: inboxId,
                storage_path: fileName,
                file_type: fileType,
                mime_type: mimeType,
                sha256,
                size_bytes: fileData.byteLength,
                parsed_status: 'pending',
              })
              .select()
              .single();

            // Create follow-up job based on file type
            let followUpJobType;
            if (fileType === 'ofx' || fileType === 'csv' || fileType === 'xlsx') {
              followUpJobType = 'parse_bank_statement';
            } else if (fileType === 'pdf' || fileType === 'image') {
              followUpJobType = 'parse_receipt_document';
            } else if (fileType === 'audio') {
              followUpJobType = 'parse_audio';
            }

            if (followUpJobType) {
              await supabase.from('jobs_queue').insert({
                company_id: job.company_id,
                job_type: followUpJobType,
                payload_json: { file_id: fileRecord?.id, inbox_id: inboxId },
                priority: 2,
              });
            }

            result = { file_id: fileRecord?.id, file_type: fileType };
            break;

          case 'send_whatsapp':
            const sendResponse = await supabase.functions.invoke('whatsapp-send-message', {
              body: job.payload_json,
            });
            result = sendResponse.data;
            break;

          default:
            console.log(`Unknown job type: ${job.job_type}`);
            result = { error: 'Unknown job type' };
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
        console.error(`Job ${job.id} error:`, jobError);
        const errMsg = jobError instanceof Error ? jobError.message : String(jobError);
        const errStack = jobError instanceof Error ? jobError.stack : undefined;

        const newStatus = job.attempts + 1 >= job.max_attempts ? 'failed' : 'pending';
        const newScheduledAt = newStatus === 'pending' 
          ? new Date(Date.now() + Math.pow(2, job.attempts) * 60000).toISOString()
          : null;

        await supabase
          .from('jobs_queue')
          .update({
            status: newStatus,
            finished_at: newStatus === 'failed' ? new Date().toISOString() : null,
            scheduled_at: newScheduledAt,
            error_json: { message: errMsg, stack: errStack },
          })
          .eq('id', job.id);

        results.push({ job_id: job.id, status: newStatus, error: errMsg });
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Process jobs error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
