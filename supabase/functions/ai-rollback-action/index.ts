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
    const { action_result_id, company_id, phone } = await req.json();

    let targetResultId = action_result_id;

    // If no specific result, get the latest for this company/phone
    if (!targetResultId && company_id) {
      const { data: latestResult } = await supabase
        .from('ai_action_results')
        .select('id')
        .eq('company_id', company_id)
        .eq('can_rollback', true)
        .is('rolled_back_at', null)
        .order('executed_at', { ascending: false })
        .limit(1)
        .single();

      targetResultId = latestResult?.id;
    }

    if (!targetResultId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Nenhuma ação para desfazer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Rolling back action result: ${targetResultId}`);

    // Get rollback payload
    const { data: rollback } = await supabase
      .from('action_rollbacks')
      .select('*')
      .eq('action_result_id', targetResultId)
      .eq('rollback_status', 'pending')
      .single();

    if (!rollback) {
      return new Response(
        JSON.stringify({ success: false, error: 'Rollback não disponível' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = rollback.rollback_payload_json;
    const errors: string[] = [];

    // Execute rollback operations
    for (const op of payload) {
      try {
        if (op.operation === 'delete') {
          await supabase
            .from(op.table)
            .delete()
            .eq('id', op.id);
          console.log(`Deleted ${op.table} record: ${op.id}`);
        } else if (op.operation === 'update') {
          await supabase
            .from(op.table)
            .update(op.previous_values)
            .eq('id', op.id);
          console.log(`Reverted ${op.table} record: ${op.id}`);
        }
      } catch (opError: unknown) {
        console.error(`Rollback operation error:`, opError);
        errors.push(`${op.table}: ${opError instanceof Error ? opError.message : String(opError)}`);
      }
    }

    // Update rollback status
    await supabase
      .from('action_rollbacks')
      .update({
        rollback_status: errors.length === 0 ? 'completed' : 'failed',
        rollback_error: errors.length > 0 ? errors.join('; ') : null,
        executed_at: new Date().toISOString(),
        requested_by_phone: phone,
      })
      .eq('id', rollback.id);

    // Update action result
    await supabase
      .from('ai_action_results')
      .update({
        status: 'rolled_back',
        rolled_back_at: new Date().toISOString(),
      })
      .eq('id', targetResultId);

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        company_id: rollback.company_id,
        action: 'ai_rollback',
        table_name: 'action_rollbacks',
        record_id: rollback.id,
        new_data: { action_result_id: targetResultId, success: errors.length === 0 },
      });

    // Send WhatsApp notification
    if (phone) {
      const { data: decision } = await supabase
        .from('ai_action_results')
        .select('decision_id')
        .eq('id', targetResultId)
        .single();

      await supabase.functions.invoke('whatsapp-send-message', {
        body: {
          decision_id: decision?.decision_id,
          type: 'rollback_success',
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: errors.length === 0,
        rolled_back_operations: payload.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Rollback error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
