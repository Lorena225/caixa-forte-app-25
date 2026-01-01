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
    const { decision_id, confirmation_id, selected_option } = await req.json();
    
    if (!decision_id) {
      throw new Error('decision_id is required');
    }

    console.log(`Executing actions for decision: ${decision_id}`);

    // Get decision
    const { data: decision, error: decisionError } = await supabase
      .from('ai_decisions')
      .select('*')
      .eq('id', decision_id)
      .single();

    if (decisionError || !decision) {
      throw new Error('Decision not found');
    }

    if (decision.status === 'executed') {
      return new Response(
        JSON.stringify({ success: false, error: 'Already executed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const companyId = decision.company_id;
    const actions = decision.proposed_actions_json;
    const executedActions = [];
    const createdIds: Record<string, string> = {};
    const affectedTables: string[] = [];
    let rollbackPayload: any[] = [];

    for (const action of actions) {
      const intent = action.intent || decision.intent;
      const txData = action.transaction || action;

      try {
        if (intent === 'create_transaction' || intent === 'create_and_settle') {
          // Resolve hints to IDs
          let walletId = txData.wallet_id;
          let categoryId = txData.category_id;
          let accountId = txData.account_id;
          let counterpartyId = txData.counterparty_id;

          // Resolve wallet by hint
          if (!walletId && txData.wallet_hint) {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('company_id', companyId)
              .or(`name.ilike.%${txData.wallet_hint}%,bank_name.ilike.%${txData.wallet_hint}%`)
              .limit(1)
              .single();
            walletId = wallet?.id;
          }

          // Resolve category by hint
          if (!categoryId && txData.category_hint) {
            const { data: category } = await supabase
              .from('account_categories')
              .select('id')
              .eq('company_id', companyId)
              .ilike('name', `%${txData.category_hint}%`)
              .limit(1)
              .single();
            categoryId = category?.id;
          }

          // Resolve account by hint
          if (!accountId && txData.account_hint) {
            const { data: account } = await supabase
              .from('accounts')
              .select('id, category_id')
              .eq('company_id', companyId)
              .ilike('name', `%${txData.account_hint}%`)
              .limit(1)
              .single();
            accountId = account?.id;
            if (!categoryId && account?.category_id) {
              categoryId = account.category_id;
            }
          }

          // Resolve counterparty
          if (!counterpartyId && txData.counterparty_hint) {
            const { data: cp } = await supabase
              .from('counterparties')
              .select('id')
              .eq('company_id', companyId)
              .ilike('name', `%${txData.counterparty_hint}%`)
              .limit(1)
              .single();
            counterpartyId = cp?.id;
          }

          // Create transaction
          const transactionData = {
            company_id: companyId,
            wallet_id: walletId,
            category_id: categoryId,
            account_id: accountId,
            counterparty_id: counterpartyId,
            direction: txData.direction === 'in' ? 'inflow' : 'outflow',
            amount: Math.abs(txData.amount),
            description: txData.description || 'Lançamento via WhatsApp',
            transaction_date: txData.transaction_date || new Date().toISOString().split('T')[0],
            due_date: txData.due_date || txData.transaction_date || new Date().toISOString().split('T')[0],
            paid_date: intent === 'create_and_settle' ? (txData.paid_date || new Date().toISOString().split('T')[0]) : null,
            status: intent === 'create_and_settle' ? 'paid' : 'pending',
            document_number: txData.document_number,
            source: 'whatsapp_ai',
          };

          const { data: transaction, error: txError } = await supabase
            .from('transactions')
            .insert(transactionData)
            .select()
            .single();

          if (txError) throw txError;

          createdIds.transaction_id = transaction.id;
          affectedTables.push('transactions');
          rollbackPayload.push({
            table: 'transactions',
            operation: 'delete',
            id: transaction.id,
          });

          executedActions.push({
            type: intent,
            transaction_id: transaction.id,
            amount: transaction.amount,
            direction: transaction.direction,
            status: transaction.status,
          });

          console.log(`Created transaction: ${transaction.id}`);
        }

        if (intent === 'settle_transaction') {
          const criteria = action.settle_criteria || action;
          
          // Find matching open transactions
          let query = supabase
            .from('transactions')
            .select('*')
            .eq('company_id', companyId)
            .is('paid_date', null)
            .eq('status', 'pending');

          if (criteria.amount) {
            const tolerance = criteria.amount * 0.01; // 1% tolerance
            query = query.gte('amount', criteria.amount - tolerance)
                        .lte('amount', criteria.amount + tolerance);
          }

          if (criteria.wallet_hint) {
            const { data: wallet } = await supabase
              .from('wallets')
              .select('id')
              .eq('company_id', companyId)
              .or(`name.ilike.%${criteria.wallet_hint}%,bank_name.ilike.%${criteria.wallet_hint}%`)
              .limit(1)
              .single();
            if (wallet) {
              query = query.eq('wallet_id', wallet.id);
            }
          }

          const { data: candidates } = await query.limit(5);

          if (!candidates || candidates.length === 0) {
            executedActions.push({
              type: 'settle_transaction',
              status: 'no_match',
              message: 'Nenhum título encontrado para baixar',
            });
            continue;
          }

          if (candidates.length > 1 && selected_option === undefined) {
            // Multiple matches - needs confirmation
            await supabase
              .from('ai_decisions')
              .update({
                ambiguous_matches_json: candidates.map((c, i) => ({
                  option: i + 1,
                  id: c.id,
                  amount: c.amount,
                  description: c.description,
                  due_date: c.due_date,
                })),
                needs_confirmation: true,
                status: 'awaiting_confirmation',
              })
              .eq('id', decision_id);

            return new Response(
              JSON.stringify({
                success: false,
                needs_confirmation: true,
                candidates: candidates.map((c, i) => ({
                  option: i + 1,
                  amount: c.amount,
                  description: c.description,
                  due_date: c.due_date,
                })),
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Settle the transaction
          const targetTx = selected_option !== undefined 
            ? candidates[selected_option - 1] 
            : candidates[0];

          const { error: settleError } = await supabase
            .from('transactions')
            .update({
              paid_date: new Date().toISOString().split('T')[0],
              status: 'paid',
            })
            .eq('id', targetTx.id);

          if (settleError) throw settleError;

          createdIds.settled_transaction_id = targetTx.id;
          affectedTables.push('transactions');
          rollbackPayload.push({
            table: 'transactions',
            operation: 'update',
            id: targetTx.id,
            previous_values: { paid_date: null, status: 'pending' },
          });

          executedActions.push({
            type: 'settle_transaction',
            transaction_id: targetTx.id,
            amount: targetTx.amount,
            status: 'settled',
          });

          console.log(`Settled transaction: ${targetTx.id}`);
        }

      } catch (actionError: unknown) {
        console.error('Action error:', actionError);
        executedActions.push({
          type: intent,
          status: 'error',
          error: actionError instanceof Error ? actionError.message : String(actionError),
        });
      }
    }

    // Save action result
    const { data: actionResult } = await supabase
      .from('ai_action_results')
      .insert({
        company_id: companyId,
        decision_id,
        confirmation_id,
        executed_actions_json: executedActions,
        created_ids_json: createdIds,
        affected_tables_json: affectedTables,
        status: executedActions.every(a => a.status !== 'error') ? 'success' : 'partial',
      })
      .select()
      .single();

    // Save rollback payload
    if (rollbackPayload.length > 0 && actionResult) {
      await supabase
        .from('action_rollbacks')
        .insert({
          company_id: companyId,
          action_result_id: actionResult.id,
          rollback_payload_json: rollbackPayload,
          rollback_status: 'pending',
        });
    }

    // Update decision status
    await supabase
      .from('ai_decisions')
      .update({ status: 'executed' })
      .eq('id', decision_id);

    // Create audit log
    await supabase
      .from('audit_logs')
      .insert({
        company_id: companyId,
        action: 'ai_execute',
        table_name: 'ai_action_results',
        record_id: actionResult?.id,
        new_data: { decision_id, executed_actions: executedActions },
      });

    // Trigger WhatsApp response
    await supabase.functions.invoke('whatsapp-send-message', {
      body: {
        decision_id,
        action_result_id: actionResult?.id,
        type: 'execution_result',
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        action_result_id: actionResult?.id,
        executed_actions: executedActions,
        created_ids: createdIds,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Execute actions error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
