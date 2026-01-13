import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature, x-timestamp, x-webhook-secret',
};

// HMAC verification using Web Crypto API
async function verifyHMAC(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const payloadBytes = encoder.encode(payload);
    const expectedSignature = await crypto.subtle.sign('HMAC', key, payloadBytes);
    const expectedHex = Array.from(new Uint8Array(expectedSignature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    const providedHex = signature.replace(/^sha256=|sha1=/, '').toLowerCase();
    return expectedHex === providedHex;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

// Generate SHA-256 hash of payload for idempotency
async function hashPayload(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Sanitize headers - remove sensitive info
function sanitizeHeaders(headers: Headers): Record<string, string> {
  const sanitized: Record<string, string> = {};
  const sensitiveKeys = ['authorization', 'cookie', 'x-api-key', 'x-auth-token', 'x-secret'];
  
  headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(k => lowerKey.includes(k))) {
      sanitized[key] = '[REDACTED]';
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

// Extract event ID based on provider
function extractEventId(payload: string, provider: string): string | null {
  try {
    const data = JSON.parse(payload);
    
    switch (provider) {
      case 'stripe':
        return data.id;
      case 'whatsapp_cloud':
        return data.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.id;
      case 'twilio':
        return data.MessageSid;
      case 'evolution':
        return data.data?.key?.id;
      default:
        return data.id || data.event_id || data.message_id || null;
    }
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const correlationId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'generic';
    const companyId = url.searchParams.get('company_id');

    if (!companyId) {
      console.log(`[${correlationId}] Missing company_id`);
      return new Response(
        JSON.stringify({ error: 'company_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company webhook configuration
    const { data: companyConfig } = await supabase
      .from('whatsapp_connections')
      .select('webhook_secret')
      .eq('company_id', companyId)
      .single();

    const webhookSecret = companyConfig?.webhook_secret;

    // Read payload
    const payload = await req.text();
    const payloadHash = await hashPayload(payload);
    
    // Get signature and timestamp from headers
    const signature = req.headers.get('x-signature') || 
                      req.headers.get('x-hub-signature-256') || 
                      req.headers.get('x-twilio-signature') || '';
    const timestamp = req.headers.get('x-timestamp') || '';
    
    // Sanitize headers for logging
    const sanitizedHeaders = sanitizeHeaders(req.headers);

    // 1. Check for replay (idempotency)
    const externalEventId = extractEventId(payload, provider);
    
    let replayDetected = false;
    if (externalEventId) {
      const { data: existing } = await supabase
        .from('webhook_ingress')
        .select('id')
        .eq('company_id', companyId)
        .eq('provider', provider)
        .eq('external_event_id', externalEventId)
        .single();
      
      if (existing) {
        replayDetected = true;
        console.log(`[${correlationId}] Replay detected for event ${externalEventId}`);
      }
    }

    // 2. Check payload hash for additional replay prevention
    if (!replayDetected) {
      const { data: existingHash } = await supabase
        .from('webhook_ingress')
        .select('id')
        .eq('company_id', companyId)
        .eq('provider', provider)
        .eq('payload_hash', payloadHash)
        .gte('received_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
        .single();
      
      if (existingHash) {
        replayDetected = true;
        console.log(`[${correlationId}] Duplicate payload hash detected`);
      }
    }

    // 3. Validate signature (HMAC)
    let signatureValid = false;
    if (webhookSecret && signature) {
      if (timestamp) {
        const timestampMs = parseInt(timestamp) * 1000;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        
        if (Math.abs(now - timestampMs) > fiveMinutes) {
          console.log(`[${correlationId}] Timestamp outside acceptable window`);
        } else {
          const signedPayload = `${timestamp}.${payload}`;
          signatureValid = await verifyHMAC(signedPayload, signature, webhookSecret);
        }
      } else {
        signatureValid = await verifyHMAC(payload, signature, webhookSecret);
      }
    } else if (!webhookSecret) {
      console.log(`[${correlationId}] No webhook secret configured for company ${companyId}`);
      signatureValid = true;
    }

    // 4. Record the webhook ingress
    const { data: ingressRecord, error: ingressError } = await supabase
      .from('webhook_ingress')
      .insert({
        company_id: companyId,
        provider,
        external_event_id: externalEventId,
        received_at: receivedAt,
        payload_hash: payloadHash,
        signature_valid: signatureValid,
        replay_detected: replayDetected,
        status: replayDetected ? 'rejected' : (signatureValid ? 'received' : 'rejected'),
        correlation_id: correlationId,
        sanitized_headers_json: sanitizedHeaders,
        error_message: replayDetected ? 'Replay detected' : (!signatureValid ? 'Invalid signature' : null),
      })
      .select()
      .single();

    if (ingressError) {
      console.error(`[${correlationId}] Failed to record ingress:`, ingressError);
    }

    // 5. If replay or invalid signature, return success but don't process
    if (replayDetected || !signatureValid) {
      console.log(`[${correlationId}] Webhook rejected - replay: ${replayDetected}, signature: ${signatureValid}`);
      
      if (!signatureValid && !replayDetected) {
        await supabase.from('integration_dlq').insert({
          company_id: companyId,
          event_type: `webhook_${provider}`,
          payload_json: { payload: payload.substring(0, 10000), headers: sanitizedHeaders },
          error_json: { reason: 'Invalid signature', correlation_id: correlationId },
        });
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          processed: false,
          reason: replayDetected ? 'duplicate' : 'invalid_signature',
          correlation_id: correlationId 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Process the webhook (create job for async processing)
    const { error: jobError } = await supabase
      .from('jobs_queue')
      .insert({
        company_id: companyId,
        job_type: `process_webhook_${provider}`,
        payload_json: {
          ingress_id: ingressRecord?.id,
          provider,
          payload: JSON.parse(payload),
          correlation_id: correlationId,
        },
        priority: 1,
      });

    if (jobError) {
      console.error(`[${correlationId}] Failed to create job:`, jobError);
      
      await supabase
        .from('webhook_ingress')
        .update({ 
          status: 'failed', 
          error_message: 'Failed to create processing job',
          processed_at: new Date().toISOString()
        })
        .eq('id', ingressRecord?.id);
      
      await supabase.from('integration_dlq').insert({
        company_id: companyId,
        event_type: `webhook_${provider}`,
        payload_json: { payload: JSON.parse(payload), ingress_id: ingressRecord?.id },
        error_json: { reason: 'Failed to create job', error: jobError.message, correlation_id: correlationId },
      });
    } else {
      await supabase
        .from('webhook_ingress')
        .update({ status: 'processing' })
        .eq('id', ingressRecord?.id);
    }

    console.log(`[${correlationId}] Webhook processed successfully`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: true,
        correlation_id: correlationId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error(`[${correlationId}] Webhook error:`, error);
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : String(error),
        correlation_id: correlationId 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
