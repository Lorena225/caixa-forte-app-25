import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOpenAIKey } from "../_shared/resolveOpenAIKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for reconciliation plan
const reconciliationPlanSchema = {
  type: "object",
  properties: {
    matches: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement_line_id: { type: "string" },
          transaction_id: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          match_reasons: { type: "array", items: { type: "string" } },
          amount_diff: { type: "number" },
          date_diff_days: { type: "number" }
        },
        required: ["statement_line_id", "transaction_id", "confidence", "match_reasons"]
      }
    },
    create_suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          statement_line_id: { type: "string" },
          suggested_category_hint: { type: "string" },
          suggested_counterparty_hint: { type: "string" },
          suggested_description: { type: "string" },
          confidence: { type: "number" },
          reasoning: { type: "string" }
        },
        required: ["statement_line_id", "confidence"]
      }
    },
    summary: {
      type: "object",
      properties: {
        total_lines: { type: "number" },
        auto_matched: { type: "number" },
        needs_review: { type: "number" },
        to_create: { type: "number" }
      }
    }
  },
  required: ["matches", "create_suggestions", "summary"]
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
    const { company_id, wallet_id, statement_id, auto_match_threshold = 0.85 } = await req.json();
    
    if (!company_id) {
      throw new Error('company_id is required');
    }

    console.log(`Proposing reconciliation plan for company ${company_id}`);

    // Check AI availability using BYOK
    const keyResult = await resolveOpenAIKey(company_id);
    
    if (!keyResult.key) {
      return new Response(
        JSON.stringify({ 
          error: 'AI_DISABLED_NO_KEY',
          message: 'IA desativada. Configure sua chave OpenAI em Integrações → IA (ChatGPT)'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unreconciled statement lines
    let linesQuery = supabase
      .from('bank_statement_lines')
      .select('*, bank_statements!inner(wallet_id, company_id)')
      .eq('bank_statements.company_id', company_id)
      .eq('is_reconciled', false)
      .limit(100);

    if (wallet_id) {
      linesQuery = linesQuery.eq('bank_statements.wallet_id', wallet_id);
    }
    if (statement_id) {
      linesQuery = linesQuery.eq('statement_id', statement_id);
    }

    const { data: statementLines, error: linesError } = await linesQuery;
    
    if (linesError) throw linesError;
    if (!statementLines?.length) {
      return new Response(
        JSON.stringify({ success: true, message: 'No unreconciled lines found', matches: [], create_suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get open transactions for matching
    let txQuery = supabase
      .from('transactions')
      .select('id, amount, direction, description, transaction_date, due_date, counterparty_id, counterparties(name)')
      .eq('company_id', company_id)
      .in('status', ['pending', 'open'])
      .limit(200);

    if (wallet_id) {
      txQuery = txQuery.eq('wallet_id', wallet_id);
    }

    const { data: transactions } = await txQuery;

    // Get company context
    const { data: categories } = await supabase
      .from('account_categories')
      .select('id, name, category_type')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .limit(30);

    const { data: counterparties } = await supabase
      .from('counterparties')
      .select('id, name, type')
      .eq('company_id', company_id)
      .eq('is_active', true)
      .limit(50);

    const systemPrompt = `Você é um especialista em conciliação bancária.
Sua tarefa é propor matches entre linhas de extrato bancário e transações pendentes.

LINHAS DE EXTRATO (não conciliadas):
${JSON.stringify(statementLines.map(l => ({
  id: l.id,
  date: l.posted_date,
  description: l.description,
  amount: l.amount,
  direction: l.direction
})), null, 2)}

TRANSAÇÕES PENDENTES:
${JSON.stringify(transactions?.map(t => ({
  id: t.id,
  date: t.transaction_date || t.due_date,
  description: t.description,
  amount: t.amount,
  direction: t.direction,
  counterparty: (t.counterparties as any)?.name
})) || [], null, 2)}

CATEGORIAS DISPONÍVEIS:
${JSON.stringify(categories?.map(c => ({ name: c.name, type: c.category_type })) || [])}

CONTRAPARTES CONHECIDAS:
${JSON.stringify(counterparties?.map(c => ({ name: c.name, type: c.type })) || [])}

INSTRUÇÕES:
1. Para cada linha de extrato, busque a melhor transação correspondente
2. Match por: valor (1% tolerância), data (±3 dias), descrição similar
3. Defina confidence: 0.95+ para match perfeito, 0.85-0.95 para bom match, abaixo para dúvida
4. Para linhas sem match, sugira criação de transação com categoria/contraparte
5. Identifique padrões recorrentes (mesma contraparte, valores similares)

Retorne o plano de conciliação estruturado.`;

    const startTime = Date.now();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${keyResult.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Analise os dados e proponha o plano de conciliação.' }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'propose_reconciliation_plan',
            description: 'Propõe matches e criações para conciliação bancária',
            parameters: reconciliationPlanSchema
          }
        }],
        tool_choice: { type: 'function', function: { name: 'propose_reconciliation_plan' } }
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    let plan;
    
    if (toolCall?.function?.arguments) {
      plan = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error('Failed to extract reconciliation plan');
    }

    // Save AI request
    await supabase
      .from('ai_requests')
      .insert({
        company_id,
        model: 'gpt-4o-mini',
        input_json: { statement_lines_count: statementLines.length, transactions_count: transactions?.length },
        output_json: plan,
        tokens_input: aiResponse.usage?.prompt_tokens,
        tokens_output: aiResponse.usage?.completion_tokens,
        latency_ms: latencyMs,
        status: 'completed',
      });

    // Save high-confidence matches as suggestions
    const autoMatches = plan.matches?.filter((m: any) => m.confidence >= auto_match_threshold) || [];
    const reviewMatches = plan.matches?.filter((m: any) => m.confidence < auto_match_threshold) || [];

    if (reviewMatches.length > 0 || plan.create_suggestions?.length > 0) {
      const suggestions = [
        ...reviewMatches.map((m: any) => ({
          company_id,
          statement_line_id: m.statement_line_id,
          transaction_id: m.transaction_id,
          match_score: Math.round(m.confidence * 100),
          match_details_json: { reasons: m.match_reasons, amount_diff: m.amount_diff, date_diff_days: m.date_diff_days },
          status: 'pending',
        })),
        ...plan.create_suggestions?.map((s: any) => ({
          company_id,
          statement_line_id: s.statement_line_id,
          transaction_id: null,
          match_score: Math.round(s.confidence * 100),
          match_details_json: { 
            type: 'create_suggestion',
            category_hint: s.suggested_category_hint,
            counterparty_hint: s.suggested_counterparty_hint,
            description: s.suggested_description,
            reasoning: s.reasoning
          },
          status: 'pending',
        })) || []
      ];

      if (suggestions.length > 0) {
        await supabase.from('reconciliation_suggestions').insert(suggestions);
      }
    }

    console.log(`Reconciliation plan: ${autoMatches.length} auto-matches, ${reviewMatches.length} for review, ${plan.create_suggestions?.length || 0} to create`);

    return new Response(
      JSON.stringify({
        success: true,
        plan: {
          auto_matches: autoMatches,
          needs_review: reviewMatches,
          create_suggestions: plan.create_suggestions,
          summary: plan.summary,
        },
        ai_source: keyResult.source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Propose plan error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
