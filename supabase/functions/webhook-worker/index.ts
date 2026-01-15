import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Retry delays in milliseconds: 1min, 5min, 15min
const RETRY_DELAYS = [60000, 300000, 900000];
const MAX_ATTEMPTS = 3;

async function generateHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  is_active: boolean;
}

interface WebhookEvent {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempts: number;
  next_retry_at: string | null;
  webhooks: WebhookConfig;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleRetry(
  supabase: SupabaseClient<any, any, any>,
  eventId: string,
  currentAttempts: number,
  errorMessage: string
): Promise<void> {
  const newAttempts = currentAttempts + 1;
  
  if (newAttempts >= MAX_ATTEMPTS) {
    // Max attempts reached - mark as permanently failed
    const { error } = await supabase
      .from('webhook_events')
      .update({
        attempts: newAttempts,
        last_error: `Failed after ${MAX_ATTEMPTS} attempts. Last error: ${errorMessage.substring(0, 1000)}`,
        next_retry_at: null,
      })
      .eq('id', eventId);

    if (error) {
      console.error(`[webhook-worker] Error marking event ${eventId} as failed:`, error);
    } else {
      console.log(`[webhook-worker] Event ${eventId} marked as failed after ${MAX_ATTEMPTS} attempts`);
    }
  } else {
    // Schedule retry with exponential backoff
    const retryDelay = RETRY_DELAYS[newAttempts - 1] || RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const nextRetryAt = new Date(Date.now() + retryDelay).toISOString();

    const { error } = await supabase
      .from('webhook_events')
      .update({
        attempts: newAttempts,
        last_error: errorMessage.substring(0, 1000),
        next_retry_at: nextRetryAt,
      })
      .eq('id', eventId);

    if (error) {
      console.error(`[webhook-worker] Error scheduling retry for ${eventId}:`, error);
    } else {
      console.log(`[webhook-worker] Event ${eventId} scheduled for retry at ${nextRetryAt} (attempt ${newAttempts}/${MAX_ATTEMPTS})`);
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('[webhook-worker] Starting webhook processing...');

    // Fetch pending events that are ready to be processed
    // Either never attempted, or retry time has passed
    const { data: events, error: fetchError } = await supabase
      .from('webhook_events')
      .select(`
        id,
        webhook_id,
        event_type,
        payload,
        attempts,
        next_retry_at,
        webhooks!inner (
          id,
          url,
          secret,
          is_active
        )
      `)
      .is('delivered_at', null)
      .eq('webhooks.is_active', true)
      .lt('attempts', MAX_ATTEMPTS)
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order('created_at', { ascending: true })
      .limit(50);

    if (fetchError) {
      console.error('[webhook-worker] Error fetching events:', fetchError);
      throw fetchError;
    }

    if (!events || events.length === 0) {
      console.log('[webhook-worker] No pending events to process');
      return new Response(JSON.stringify({ processed: 0, message: 'No pending events' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[webhook-worker] Processing ${events.length} events...`);

    let successCount = 0;
    let failCount = 0;

    for (const eventData of events) {
      const event = eventData as unknown as WebhookEvent;
      const webhook = event.webhooks;
      
      if (!webhook || !webhook.is_active) {
        console.log(`[webhook-worker] Skipping event ${event.id}: webhook inactive or missing`);
        continue;
      }

      const payloadString = JSON.stringify(event.payload);
      const timestamp = Date.now().toString();
      const signaturePayload = `${timestamp}.${payloadString}`;

      try {
        // Generate HMAC signature
        const signature = await generateHmacSignature(signaturePayload, webhook.secret);
        
        console.log(`[webhook-worker] Sending event ${event.id} to ${webhook.url}`);

        // Make HTTP POST request
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': `t=${timestamp},v1=${signature}`,
            'X-Event-Type': event.event_type,
            'X-Event-Id': event.id,
            'User-Agent': 'ERP-Webhook/1.0',
          },
          body: payloadString,
        });

        const statusCode = response.status;
        const responseText = await response.text().catch(() => '');

        if (statusCode >= 200 && statusCode < 300) {
          // Success - mark as delivered
          const { error: updateError } = await supabase
            .from('webhook_events')
            .update({
              delivered_at: new Date().toISOString(),
              attempts: event.attempts + 1,
              last_error: null,
              next_retry_at: null,
            })
            .eq('id', event.id);

          if (updateError) {
            console.error(`[webhook-worker] Error updating success status for ${event.id}:`, updateError);
          } else {
            console.log(`[webhook-worker] Event ${event.id} delivered successfully (status: ${statusCode})`);
            successCount++;
          }
        } else {
          // Error - schedule retry or mark as failed
          await handleRetry(supabase, event.id, event.attempts, `HTTP ${statusCode}: ${responseText.substring(0, 500)}`);
          failCount++;
        }
      } catch (error) {
        // Network or other error - schedule retry
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[webhook-worker] Error sending event ${event.id}:`, errorMessage);
        await handleRetry(supabase, event.id, event.attempts, errorMessage);
        failCount++;
      }
    }

    const result = {
      processed: events.length,
      success: successCount,
      failed: failCount,
      timestamp: new Date().toISOString(),
    };

    console.log('[webhook-worker] Processing complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[webhook-worker] Fatal error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
