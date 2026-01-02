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
    const { company_id, plan, user_id } = await req.json();
    
    if (!company_id || !plan) {
      throw new Error('company_id and plan are required');
    }

    console.log(`Executing reconciliation plan for company ${company_id}`);

    const results = {
      reconciled: [] as any[],
      created: [] as any[],
      errors: [] as any[],
    };

    // Execute auto-matches (reconcile)
    for (const match of plan.auto_matches || []) {
      try {
        // Update statement line as reconciled
        const { error: lineError } = await supabase
          .from('bank_statement_lines')
          .update({
            is_reconciled: true,
            reconciled_at: new Date().toISOString(),
          })
          .eq('id', match.statement_line_id);

        if (lineError) throw lineError;

        // Update transaction as paid
        const { error: txError } = await supabase
          .from('transactions')
          .update({
            status: 'paid',
            paid_date: new Date().toISOString().split('T')[0],
          })
          .eq('id', match.transaction_id);

        if (txError) throw txError;

        // Update suggestion status if exists
        await supabase
          .from('reconciliation_suggestions')
          .update({ status: 'applied' })
          .eq('statement_line_id', match.statement_line_id)
          .eq('transaction_id', match.transaction_id);

        results.reconciled.push({
          statement_line_id: match.statement_line_id,
          transaction_id: match.transaction_id,
          confidence: match.confidence,
        });

      } catch (e) {
        results.errors.push({
          type: 'reconcile',
          statement_line_id: match.statement_line_id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Execute create suggestions
    for (const suggestion of plan.create_and_reconcile || []) {
      try {
        // Get statement line details
        const { data: line } = await supabase
          .from('bank_statement_lines')
          .select('*, bank_statements(wallet_id)')
          .eq('id', suggestion.statement_line_id)
          .single();

        if (!line) continue;

        // Resolve category if hint provided
        let categoryId = suggestion.category_id;
        if (!categoryId && suggestion.category_hint) {
          const { data: cat } = await supabase
            .from('account_categories')
            .select('id')
            .eq('company_id', company_id)
            .ilike('name', `%${suggestion.category_hint}%`)
            .limit(1)
            .single();
          categoryId = cat?.id;
        }

        // Resolve counterparty if hint provided
        let counterpartyId = suggestion.counterparty_id;
        if (!counterpartyId && suggestion.counterparty_hint) {
          const { data: cp } = await supabase
            .from('counterparties')
            .select('id')
            .eq('company_id', company_id)
            .ilike('name', `%${suggestion.counterparty_hint}%`)
            .limit(1)
            .single();
          counterpartyId = cp?.id;
        }

        // Create transaction
        const { data: newTx, error: txError } = await supabase
          .from('transactions')
          .insert({
            company_id,
            wallet_id: (line.bank_statements as any)?.wallet_id,
            category_id: categoryId,
            counterparty_id: counterpartyId,
            direction: line.direction === 'credit' ? 'inflow' : 'outflow',
            amount: line.amount,
            description: suggestion.description || line.description,
            transaction_date: line.posted_date,
            due_date: line.posted_date,
            paid_date: line.posted_date,
            status: 'paid',
            source: 'ai_reconciliation',
          })
          .select()
          .single();

        if (txError) throw txError;

        // Mark line as reconciled
        await supabase
          .from('bank_statement_lines')
          .update({
            is_reconciled: true,
            reconciled_at: new Date().toISOString(),
          })
          .eq('id', suggestion.statement_line_id);

        results.created.push({
          statement_line_id: suggestion.statement_line_id,
          transaction_id: newTx.id,
          amount: newTx.amount,
        });

      } catch (e) {
        results.errors.push({
          type: 'create',
          statement_line_id: suggestion.statement_line_id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        company_id,
        user_id,
        action: 'ai_execute_plan',
        table_name: 'reconciliation',
        new_data: {
          reconciled_count: results.reconciled.length,
          created_count: results.created.length,
          errors_count: results.errors.length,
        },
      });

    console.log(`Plan executed: ${results.reconciled.length} reconciled, ${results.created.length} created, ${results.errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          reconciled: results.reconciled.length,
          created: results.created.length,
          errors: results.errors.length,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Execute plan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
