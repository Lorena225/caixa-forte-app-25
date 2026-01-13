import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateChargeRequest {
  company_id: string;
  transaction_id?: string;
  amount: number;
  description?: string;
  expiration_seconds?: number;
  payer_name?: string;
  payer_document?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[pix-create-charge] Request received');

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

    const body: CreateChargeRequest = await req.json();
    const { company_id, transaction_id, amount, description, expiration_seconds = 3600, payer_name, payer_document } = body;

    if (!company_id || !amount) {
      return new Response(JSON.stringify({ error: 'Missing required fields: company_id, amount' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check user access to company
    const { data: access } = await supabase
      .from('company_users')
      .select('id')
      .eq('company_id', company_id)
      .eq('user_id', user.id)
      .single();

    if (!access) {
      return new Response(JSON.stringify({ error: 'Access denied to company' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get active PIX provider
    const { data: provider } = await supabase
      .from('pix_providers')
      .select('*')
      .eq('company_id', company_id)
      .eq('is_enabled', true)
      .single();

    // Generate TXID (26-35 chars, alphanumeric)
    const timestamp = Date.now().toString(36);
    const random = crypto.randomUUID().replace(/-/g, '').substring(0, 10);
    const txid = `${timestamp}${random}`.toUpperCase().substring(0, 35);

    // Generate BR Code (EMV format - simplified)
    // Real implementation would use proper EMV QR code generation
    const brcode = generateBRCode({
      txid,
      amount,
      description: description || 'Pagamento',
      // These would come from company bank config
      pixKey: provider?.config_json?.pix_key || 'placeholder@example.com',
      merchantName: 'EMPRESA',
      merchantCity: 'SAO PAULO'
    });

    const expiresAt = new Date(Date.now() + expiration_seconds * 1000).toISOString();

    // Create charge record
    const { data: charge, error: insertError } = await supabase
      .from('pix_charges')
      .insert({
        company_id,
        provider_id: provider?.id,
        transaction_id,
        txid,
        amount,
        status: 'active',
        payer_name,
        payer_document,
        description,
        brcode,
        expiration_seconds,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('[pix-create-charge] Insert error:', insertError);
      throw insertError;
    }

    console.log('[pix-create-charge] Charge created:', txid);

    return new Response(JSON.stringify({
      ok: true,
      charge: {
        id: charge.id,
        txid,
        brcode,
        amount,
        status: 'active',
        expires_at: expiresAt,
        qrcode_url: `/api/pix-qrcode?txid=${txid}`
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[pix-create-charge] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Simplified BR Code generation (EMV format)
// In production, use a proper library like pix-utils
function generateBRCode(params: {
  txid: string;
  amount: number;
  description: string;
  pixKey: string;
  merchantName: string;
  merchantCity: string;
}): string {
  const { txid, amount, description, pixKey, merchantName, merchantCity } = params;
  
  // EMV QR Code format (simplified)
  const formatIndicator = '000201'; // Payload Format Indicator
  const pointOfInitiation = '010212'; // Point of Initiation (12 = dynamic)
  
  // Merchant Account Info (ID 26)
  const gui = '0014BR.GOV.BCB.PIX';
  const key = `01${pixKey.length.toString().padStart(2, '0')}${pixKey}`;
  const txidField = `25${txid.length.toString().padStart(2, '0')}${txid}`;
  const merchantAccountInfo = `${gui}${key}${txidField}`;
  const merchantAccountField = `26${merchantAccountInfo.length.toString().padStart(2, '0')}${merchantAccountInfo}`;
  
  // Amount (ID 54)
  const amountStr = amount.toFixed(2);
  const amountField = `54${amountStr.length.toString().padStart(2, '0')}${amountStr}`;
  
  // Country (ID 58)
  const countryField = '5802BR';
  
  // Merchant Name (ID 59)
  const name = merchantName.substring(0, 25);
  const nameField = `59${name.length.toString().padStart(2, '0')}${name}`;
  
  // Merchant City (ID 60)
  const city = merchantCity.substring(0, 15);
  const cityField = `60${city.length.toString().padStart(2, '0')}${city}`;
  
  // Transaction Currency (ID 53)
  const currencyField = '5303986'; // BRL
  
  // Additional Data (ID 62) - txid already in merchant account
  
  // Build payload without CRC
  const payloadWithoutCRC = `${formatIndicator}${pointOfInitiation}${merchantAccountField}${currencyField}${amountField}${countryField}${nameField}${cityField}6304`;
  
  // Calculate CRC16 (CCITT-FALSE)
  const crc = calculateCRC16(payloadWithoutCRC);
  
  return `${payloadWithoutCRC}${crc}`;
}

function calculateCRC16(str: string): string {
  let crc = 0xFFFF;
  const polynomial = 0x1021;
  
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc = crc << 1;
      }
    }
  }
  
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
}
