import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
};

// HMAC verification helper
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  if (!signature || !secret) return false;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const computedSig = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return computedSig === signature.replace('sha256=', '');
}

// Sanitize PII from webhook payload
function sanitizePayload(payload: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = ['cpf', 'cnpj', 'nome', 'pagador'];
  const result = { ...payload };
  
  for (const field of sensitiveFields) {
    if (result[field] && typeof result[field] === 'string') {
      const val = result[field] as string;
      if (val.length > 6) {
        result[field] = val.substring(0, 3) + '***' + val.substring(val.length - 3);
      }
    }
  }
  
  return result;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[pix-webhook] Received webhook request');

  try {
    const url = new URL(req.url);
    const companyId = url.searchParams.get('company_id');
    const providerKey = url.searchParams.get('provider') || 'generic';
    
    if (!companyId) {
      console.error('[pix-webhook] Missing company_id parameter');
      return new Response(JSON.stringify({ error: 'Missing company_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body = await req.text();
    const payload = JSON.parse(body);
    const signature = req.headers.get('x-webhook-signature') || req.headers.get('x-signature');
    
    console.log('[pix-webhook] Processing for company:', companyId, 'provider:', providerKey);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch provider config to verify signature
    const { data: providerConfig } = await supabase
      .from('pix_providers')
      .select('webhook_secret_encrypted, config_json')
      .eq('company_id', companyId)
      .eq('provider_key', providerKey)
      .single();

    let signatureValid = false;
    if (providerConfig?.webhook_secret_encrypted && signature) {
      signatureValid = await verifySignature(body, signature, providerConfig.webhook_secret_encrypted);
    }

    // Extract event data (generic structure, adapt per provider)
    const eventId = payload.evento?.id || payload.event_id || payload.txid || crypto.randomUUID();
    const txid = payload.pix?.[0]?.txid || payload.txid || payload.cobranca?.txid;
    const endToEndId = payload.pix?.[0]?.endToEndId || payload.end_to_end_id;
    const eventType = payload.evento?.tipo || payload.event_type || 'pix_received';
    const status = payload.status || 'paid';
    const amount = payload.pix?.[0]?.valor || payload.valor || payload.amount;

    // Check for duplicate (idempotency)
    const { data: existingEvent } = await supabase
      .from('pix_events')
      .select('id')
      .eq('company_id', companyId)
      .eq('provider_key', providerKey)
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      console.log('[pix-webhook] Duplicate event ignored:', eventId);
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Insert event
    const { error: insertError } = await supabase
      .from('pix_events')
      .insert({
        company_id: companyId,
        provider_key: providerKey,
        event_id: eventId,
        txid,
        end_to_end_id: endToEndId,
        event_type: eventType,
        status,
        amount: amount ? parseFloat(amount) : null,
        raw_json_sanitized: sanitizePayload(payload),
        signature_valid: signatureValid,
        is_duplicate: false,
        processed_at: null,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('[pix-webhook] Error inserting event:', insertError);
      throw insertError;
    }

    // If valid txid, try to settle the charge
    if (txid && status === 'paid') {
      const { data: charge, error: chargeError } = await supabase
        .from('pix_charges')
        .select('id, transaction_id, status')
        .eq('company_id', companyId)
        .eq('txid', txid)
        .single();

      if (charge && charge.status !== 'paid') {
        // Update charge to paid
        await supabase
          .from('pix_charges')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            paid_amount: amount ? parseFloat(amount) : null,
            payer_name: payload.pagador?.nome || payload.payer?.name,
            payer_document: payload.pagador?.cpf || payload.pagador?.cnpj,
            end_to_end_id: endToEndId,
            updated_at: new Date().toISOString()
          })
          .eq('id', charge.id);

        // Update linked transaction if exists
        if (charge.transaction_id) {
          await supabase
            .from('transactions')
            .update({
              status: 'paid',
              paid_date: new Date().toISOString().split('T')[0],
              paid_amount: amount ? parseFloat(amount) : null,
              updated_at: new Date().toISOString()
            })
            .eq('id', charge.transaction_id);

          console.log('[pix-webhook] Transaction settled:', charge.transaction_id);
        }

        // Mark event as processed
        await supabase
          .from('pix_events')
          .update({ processed_at: new Date().toISOString() })
          .eq('company_id', companyId)
          .eq('provider_key', providerKey)
          .eq('event_id', eventId);

        console.log('[pix-webhook] Charge settled successfully:', txid);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[pix-webhook] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
