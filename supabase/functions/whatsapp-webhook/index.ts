import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-twilio-signature, x-hub-signature-256',
};

interface WhatsAppMessage {
  from: string;
  body?: string;
  type: 'text' | 'audio' | 'image' | 'document';
  mediaUrl?: string;
  mediaMimeType?: string;
  messageId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const url = new URL(req.url);
    const provider = url.searchParams.get('provider') || 'twilio';
    const companyId = url.searchParams.get('company_id');

    // Webhook verification for WhatsApp Cloud API
    if (req.method === 'GET') {
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      if (mode === 'subscribe' && token && challenge) {
        // Verify token against stored webhook secret
        const { data: connection } = await supabase
          .from('whatsapp_connections')
          .select('webhook_secret')
          .eq('company_id', companyId)
          .single();

        if (connection?.webhook_secret === token) {
          console.log('Webhook verified');
          return new Response(challenge, { status: 200 });
        }
        return new Response('Verification failed', { status: 403 });
      }
    }

    const body = await req.text();
    let messages: WhatsAppMessage[] = [];
    let rawJson: any;

    // Parse based on provider
    if (provider === 'twilio') {
      const params = new URLSearchParams(body);
      rawJson = Object.fromEntries(params);
      
      if (params.get('Body') || params.get('MediaUrl0')) {
        messages.push({
          from: params.get('From')?.replace('whatsapp:', '') || '',
          body: params.get('Body') || undefined,
          type: params.get('MediaContentType0')?.startsWith('audio') ? 'audio' 
              : params.get('MediaContentType0')?.startsWith('image') ? 'image'
              : params.get('MediaContentType0') ? 'document' : 'text',
          mediaUrl: params.get('MediaUrl0') || undefined,
          mediaMimeType: params.get('MediaContentType0') || undefined,
          messageId: params.get('MessageSid') || crypto.randomUUID(),
        });
      }
    } else if (provider === 'whatsapp_cloud') {
      rawJson = JSON.parse(body);
      const entry = rawJson.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      
      if (value?.messages) {
        for (const msg of value.messages) {
          const mediaTypes = ['audio', 'image', 'document', 'sticker', 'video'];
          let mediaUrl, mediaMimeType, msgType: WhatsAppMessage['type'] = 'text';
          
          for (const mt of mediaTypes) {
            if (msg[mt]) {
              msgType = mt === 'sticker' || mt === 'video' ? 'image' : mt as any;
              mediaUrl = msg[mt].id; // Will need to download via API
              mediaMimeType = msg[mt].mime_type;
              break;
            }
          }

          messages.push({
            from: msg.from,
            body: msg.text?.body || msg.caption,
            type: msgType,
            mediaUrl,
            mediaMimeType,
            messageId: msg.id,
          });
        }
      }
    } else if (provider === 'evolution') {
      rawJson = JSON.parse(body);
      const data = rawJson.data;
      
      if (data?.message) {
        messages.push({
          from: data.key?.remoteJid?.split('@')[0] || '',
          body: data.message?.conversation || data.message?.extendedTextMessage?.text,
          type: data.message?.audioMessage ? 'audio' 
              : data.message?.imageMessage ? 'image'
              : data.message?.documentMessage ? 'document' : 'text',
          mediaUrl: data.message?.mediaUrl,
          mediaMimeType: data.message?.audioMessage?.mimetype 
                      || data.message?.imageMessage?.mimetype
                      || data.message?.documentMessage?.mimetype,
          messageId: data.key?.id || crypto.randomUUID(),
        });
      }
    }

    console.log(`Received ${messages.length} messages from ${provider}`);

    for (const msg of messages) {
      // Find contact and get company
      const { data: contact } = await supabase
        .from('whatsapp_contacts')
        .select('id, company_id, is_allowed, is_blocked')
        .eq('phone_e164', msg.from)
        .single();

      if (!contact) {
        console.log(`Unknown contact: ${msg.from}`);
        continue;
      }

      if (!contact.is_allowed || contact.is_blocked) {
        console.log(`Contact not allowed: ${msg.from}`);
        continue;
      }

      // Check idempotency
      const { data: existing } = await supabase
        .from('whatsapp_inbox')
        .select('id')
        .eq('provider_msg_id', msg.messageId)
        .single();

      if (existing) {
        console.log(`Duplicate message: ${msg.messageId}`);
        continue;
      }

      // Insert into inbox
      const { data: inboxRecord, error: inboxError } = await supabase
        .from('whatsapp_inbox')
        .insert({
          company_id: contact.company_id,
          contact_id: contact.id,
          provider_msg_id: msg.messageId,
          phone: msg.from,
          msg_type: msg.type,
          text_body: msg.body,
          media_url: msg.mediaUrl,
          media_mime_type: msg.mediaMimeType,
          raw_json: rawJson,
          status: 'received',
        })
        .select()
        .single();

      if (inboxError) {
        console.error('Error inserting inbox:', inboxError);
        continue;
      }

      console.log(`Inbox record created: ${inboxRecord.id}`);

      // Create jobs based on message type
      const jobs = [];

      if (msg.mediaUrl) {
        // Download media job
        jobs.push({
          company_id: contact.company_id,
          job_type: 'download_media',
          payload_json: {
            inbox_id: inboxRecord.id,
            media_url: msg.mediaUrl,
            mime_type: msg.mediaMimeType,
            provider,
          },
          priority: 1,
        });
      } else if (msg.body) {
        // Parse text message job
        jobs.push({
          company_id: contact.company_id,
          job_type: 'parse_message',
          payload_json: {
            inbox_id: inboxRecord.id,
            text: msg.body,
          },
          priority: 2,
        });
      }

      if (jobs.length > 0) {
        const { error: jobsError } = await supabase
          .from('jobs_queue')
          .insert(jobs);

        if (jobsError) {
          console.error('Error creating jobs:', jobsError);
        } else {
          console.log(`Created ${jobs.length} jobs for inbox ${inboxRecord.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: messages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
