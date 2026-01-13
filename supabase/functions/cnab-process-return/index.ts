import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProcessReturnRequest {
  company_id: string;
  return_file_id: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[cnab-process-return] Request received');

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

    const body: ProcessReturnRequest = await req.json();
    const { company_id, return_file_id } = body;

    if (!company_id || !return_file_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get return file
    const { data: returnFile, error: fileError } = await supabase
      .from('cnab_return_files')
      .select('*, cnab_agreements(bank_code, layout)')
      .eq('id', return_file_id)
      .eq('company_id', company_id)
      .single();

    if (fileError || !returnFile) {
      return new Response(JSON.stringify({ error: 'Return file not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (returnFile.status === 'processed') {
      return new Response(JSON.stringify({ error: 'File already processed' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const bankCode = returnFile.cnab_agreements?.bank_code || '001';
    const fileContent = returnFile.file_content;

    if (!fileContent) {
      return new Response(JSON.stringify({ error: 'Empty file content' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Parse return file
    const lines = fileContent.split('\n').filter((l: string) => l.trim());
    const results = {
      total: 0,
      settled: 0,
      rejected: 0,
      pending: 0,
      tariffs: 0,
      unknown: 0,
      errors: [] as string[]
    };

    // Get occurrence map for this bank
    const { data: occurrenceMap } = await supabase
      .from('cnab_occurrence_map')
      .select('*')
      .eq('bank_code', bankCode)
      .eq('occurrence_type', 'retorno');

    const occMap = new Map(occurrenceMap?.map(o => [o.occurrence_code, o]) || []);

    // Process detail records (skip header/trailer)
    for (let i = 1; i < lines.length - 1; i++) {
      const line = lines[i];
      if (line.length < 100) continue;

      results.total++;

      try {
        // CNAB 240 detail parsing (simplified - positions vary by bank)
        // Position 15-16: Occurrence code (2 chars)
        const occurrenceCode = line.substring(15, 17).trim();
        // Position 62-76: Our number
        const ourNumber = line.substring(62, 76).trim();
        // Position 85-99: Paid amount
        const paidAmountStr = line.substring(85, 99).trim();
        const paidAmount = parseFloat(paidAmountStr) / 100;
        // Position 145-152: Payment date
        const paymentDateStr = line.substring(145, 153).trim();

        const occurrence = occMap.get(occurrenceCode);
        const action = occurrence?.action || 'pendencia';

        // Find related remittance item
        const { data: remittanceItem } = await supabase
          .from('cnab_remittance_items')
          .select('id, transaction_id, status')
          .eq('company_id', company_id)
          .eq('our_number', ourNumber)
          .single();

        if (remittanceItem) {
          let newStatus = 'pending';
          
          if (action === 'baixar') {
            newStatus = 'paid';
            results.settled++;

            // Update transaction if linked
            if (remittanceItem.transaction_id) {
              const paymentDate = paymentDateStr.length === 8
                ? `20${paymentDateStr.substring(4, 6)}-${paymentDateStr.substring(2, 4)}-${paymentDateStr.substring(0, 2)}`
                : new Date().toISOString().split('T')[0];

              await supabase
                .from('transactions')
                .update({
                  status: 'paid',
                  paid_date: paymentDate,
                  paid_amount: paidAmount > 0 ? paidAmount : undefined,
                  updated_at: new Date().toISOString()
                })
                .eq('id', remittanceItem.transaction_id);
            }
          } else if (action === 'recusar') {
            newStatus = 'rejected';
            results.rejected++;
          } else if (action === 'tarifa') {
            results.tariffs++;
            // Log tariff but don't change status
          } else if (action === 'pendencia') {
            results.pending++;
            // Create inbox item for manual review
            await supabase
              .from('ai_inbox')
              .insert({
                company_id,
                source: 'cnab_return',
                source_id: return_file_id,
                message_type: 'pendencia',
                content_json: {
                  our_number: ourNumber,
                  occurrence_code: occurrenceCode,
                  occurrence_meaning: occurrence?.meaning || 'Desconhecido',
                  line_number: i + 1,
                  raw_line: line.substring(0, 100)
                },
                status: 'pending'
              });
          } else {
            results.unknown++;
          }

          // Update remittance item
          await supabase
            .from('cnab_remittance_items')
            .update({
              status: newStatus,
              return_code: occurrenceCode,
              return_message: occurrence?.meaning || 'Código desconhecido',
              processed_at: new Date().toISOString()
            })
            .eq('id', remittanceItem.id);

          // Insert occurrence record
          await supabase
            .from('cnab_occurrences')
            .insert({
              cnab_file_id: return_file_id,
              line_number: i + 1,
              occurrence_code: occurrenceCode,
              occurrence_description: occurrence?.meaning || 'Desconhecido',
              document_number: ourNumber,
              amount: paidAmount > 0 ? paidAmount : null,
              status: newStatus,
              related_transaction_id: remittanceItem.transaction_id
            });
        } else {
          results.unknown++;
          console.log('[cnab-process-return] No matching item for our_number:', ourNumber);
        }

      } catch (lineError) {
        results.errors.push(`Line ${i + 1}: ${lineError instanceof Error ? lineError.message : 'Unknown error'}`);
        console.error('[cnab-process-return] Error processing line:', i + 1, lineError);
      }
    }

    // Update return file status
    await supabase
      .from('cnab_return_files')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString(),
        processed_by: user.id,
        summary_json: results
      })
      .eq('id', return_file_id);

    console.log('[cnab-process-return] Processing complete:', results);

    return new Response(JSON.stringify({
      ok: true,
      results
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[cnab-process-return] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
