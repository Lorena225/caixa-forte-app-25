import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmitRequest {
  company_id: string;
  document_type: 'nfe' | 'nfse';
  invoice_id: string;
  action: 'emit' | 'cancel' | 'status' | 'cce';
  justification?: string;
  correction_text?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[fiscal-emit] Request received');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: EmitRequest = await req.json();
    const { company_id, document_type, invoice_id, action, justification, correction_text } = body;

    if (!company_id || !document_type || !invoice_id || !action) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check user access
    const { data: access } = await supabase
      .from('company_users')
      .select('id')
      .eq('company_id', company_id)
      .eq('user_id', user.id)
      .single();

    if (!access) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get fiscal provider config
    const { data: providerConfig } = await supabase
      .from('fiscal_provider_config')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_enabled', true)
      .contains('document_types', [document_type])
      .single();

    if (!providerConfig) {
      return new Response(JSON.stringify({ 
        error: 'No fiscal provider configured for this document type',
        code: 'NO_PROVIDER'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const tableName = document_type === 'nfe' ? 'nfe_invoices' : 'nfse_invoices';
    const eventsTable = document_type === 'nfe' ? 'nfe_events' : 'nfse_events';

    // Get invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', invoice_id)
      .eq('company_id', company_id)
      .single();

    if (invoiceError || !invoice) {
      return new Response(JSON.stringify({ error: 'Invoice not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case 'emit':
        // Validate invoice data
        if (invoice.status !== 'draft') {
          return new Response(JSON.stringify({ error: 'Invoice must be in draft status' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Call fiscal provider API (placeholder - would call actual provider)
        result = await emitDocument(providerConfig, invoice, document_type);
        
        if (result.success) {
          await supabase
            .from(tableName)
            .update({
              status: 'authorized',
              access_key: result.access_key,
              number: result.number,
              sefaz_protocol: result.protocol,
              xml_path: result.xml_path,
              danfe_pdf_path: result.pdf_path || result.danfe_pdf_path,
              authorized_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invoice_id);

          // Log event
          await supabase
            .from(eventsTable)
            .insert({
              invoice_id,
              event_type: 'status',
              status: 'authorized',
              protocol: result.protocol,
              response_json: result
            });
        } else {
          await supabase
            .from(tableName)
            .update({
              status: 'error',
              sefaz_message: result.message,
              updated_at: new Date().toISOString()
            })
            .eq('id', invoice_id);
        }
        break;

      case 'cancel':
        if (!justification || justification.length < 15) {
          return new Response(JSON.stringify({ error: 'Justification must be at least 15 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (invoice.status !== 'authorized') {
          return new Response(JSON.stringify({ error: 'Only authorized invoices can be canceled' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        result = await cancelDocument(providerConfig, invoice, justification, document_type);
        
        if (result.success) {
          await supabase
            .from(tableName)
            .update({
              status: 'canceled',
              canceled_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', invoice_id);

          await supabase
            .from(eventsTable)
            .insert({
              invoice_id,
              event_type: 'cancel',
              justification,
              protocol: result.protocol,
              status: 'canceled',
              response_json: result
            });
        }
        break;

      case 'status':
        result = await getDocumentStatus(providerConfig, invoice, document_type);
        
        await supabase
          .from(eventsTable)
          .insert({
            invoice_id,
            event_type: 'status',
            status: result.status,
            response_json: result
          });
        break;

      case 'cce':
        if (document_type !== 'nfe') {
          return new Response(JSON.stringify({ error: 'CC-e only available for NF-e' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!correction_text || correction_text.length < 15) {
          return new Response(JSON.stringify({ error: 'Correction text must be at least 15 characters' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        result = await sendCCe(providerConfig, invoice, correction_text);
        
        if (result.success) {
          const { data: lastEvent } = await supabase
            .from(eventsTable)
            .select('event_sequence')
            .eq('invoice_id', invoice_id)
            .eq('event_type', 'cce')
            .order('event_sequence', { ascending: false })
            .limit(1)
            .single();

          await supabase
            .from(eventsTable)
            .insert({
              invoice_id,
              event_type: 'cce',
              event_sequence: (lastEvent?.event_sequence || 0) + 1,
              correction_text,
              protocol: result.protocol,
              status: 'authorized',
              response_json: result
            });
        }
        break;
    }

    console.log('[fiscal-emit] Action completed:', action, 'success:', result.success);

    return new Response(JSON.stringify({
      ok: true,
      action,
      result
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[fiscal-emit] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Provider interface functions (placeholder implementations)
// In production, these would call actual fiscal provider APIs

async function emitDocument(
  providerConfig: Record<string, unknown>,
  invoice: Record<string, unknown>,
  documentType: string
): Promise<Record<string, unknown>> {
  console.log('[fiscal-emit] Emitting document via provider:', providerConfig.provider_key);
  
  // This would be replaced with actual API call to the fiscal provider
  // Example providers: TecnoSpeed, NFe.io, eNotas, FocusNFe
  
  const providerKey = providerConfig.provider_key as string;
  const environment = providerConfig.environment as string;
  
  // Simulate provider response
  // In production: const response = await fetch(providerEndpoint, { ... })
  
  if (environment === 'homologacao') {
    // Simulate success for testing
    const timestamp = Date.now().toString(36).toUpperCase();
    const randomKey = Array.from(crypto.getRandomValues(new Uint8Array(22)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
      .substring(0, 44);
    
    return {
      success: true,
      access_key: randomKey,
      number: Math.floor(Math.random() * 100000) + 1,
      series: 1,
      protocol: `${timestamp}${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      xml_path: `/fiscal/${documentType}/${invoice.id}/authorized.xml`,
      pdf_path: `/fiscal/${documentType}/${invoice.id}/danfe.pdf`,
      danfe_pdf_path: `/fiscal/${documentType}/${invoice.id}/danfe.pdf`,
      message: 'Autorizado em ambiente de homologação'
    };
  }
  
  // Production would call the real API
  return {
    success: false,
    message: 'Production emission requires provider API credentials'
  };
}

async function cancelDocument(
  providerConfig: Record<string, unknown>,
  invoice: Record<string, unknown>,
  justification: string,
  documentType: string
): Promise<Record<string, unknown>> {
  console.log('[fiscal-emit] Canceling document via provider:', providerConfig.provider_key);
  
  const environment = providerConfig.environment as string;
  
  if (environment === 'homologacao') {
    const timestamp = Date.now().toString(36).toUpperCase();
    return {
      success: true,
      protocol: `CANC${timestamp}`,
      message: 'Cancelamento autorizado em homologação'
    };
  }
  
  return {
    success: false,
    message: 'Production cancellation requires provider API'
  };
}

async function getDocumentStatus(
  providerConfig: Record<string, unknown>,
  invoice: Record<string, unknown>,
  documentType: string
): Promise<Record<string, unknown>> {
  console.log('[fiscal-emit] Getting document status via provider:', providerConfig.provider_key);
  
  return {
    status: invoice.status,
    protocol: invoice.sefaz_protocol,
    message: 'Status retrieved from local database'
  };
}

async function sendCCe(
  providerConfig: Record<string, unknown>,
  invoice: Record<string, unknown>,
  correctionText: string
): Promise<Record<string, unknown>> {
  console.log('[fiscal-emit] Sending CC-e via provider:', providerConfig.provider_key);
  
  const environment = providerConfig.environment as string;
  
  if (environment === 'homologacao') {
    const timestamp = Date.now().toString(36).toUpperCase();
    return {
      success: true,
      protocol: `CCE${timestamp}`,
      message: 'Carta de correção autorizada em homologação'
    };
  }
  
  return {
    success: false,
    message: 'Production CC-e requires provider API'
  };
}
