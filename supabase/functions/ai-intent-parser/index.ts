import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOpenAIKey } from "../_shared/resolveOpenAIKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// JSON Schema for structured output
const transactionSchema = {
  type: "object",
  properties: {
    intent: {
      type: "string",
      enum: ["create_transaction", "settle_transaction", "create_and_settle", "import_bank_statement", "query_report", "undo_action", "unknown"]
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    needs_confirmation: { type: "boolean" },
    missing_fields: { type: "array", items: { type: "string" } },
    transaction: {
      type: "object",
      properties: {
        direction: { type: "string", enum: ["in", "out"] },
        amount: { type: "number" },
        transaction_date: { type: "string", format: "date" },
        due_date: { type: "string", format: "date" },
        paid_date: { type: "string", format: "date" },
        wallet_hint: { type: "string" },
        category_hint: { type: "string" },
        account_hint: { type: "string" },
        counterparty_hint: { type: "string" },
        description: { type: "string" },
        document_number: { type: "string" },
        document_type: { type: "string" }
      }
    },
    settle_criteria: {
      type: "object",
      properties: {
        amount: { type: "number" },
        date_window_days: { type: "number" },
        wallet_hint: { type: "string" },
        text_match: { type: "string" },
        counterparty_hint: { type: "string" }
      }
    },
    query: {
      type: "object",
      properties: {
        report_type: { type: "string" },
        period: { type: "string" },
        filters: { type: "object" }
      }
    }
  },
  required: ["intent", "confidence", "needs_confirmation", "missing_fields"]
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
    const { inbox_id, text, company_id } = await req.json();
    
    if (!text || !company_id) {
      throw new Error('text and company_id are required');
    }

    console.log(`Parsing message for company ${company_id}: ${text.substring(0, 100)}...`);

    // Check AI availability using BYOK
    const keyResult = await resolveOpenAIKey(company_id);
    
    if (!keyResult.key) {
      console.log(`AI disabled for company ${company_id}: ${keyResult.error}`);
      return new Response(
        JSON.stringify({ 
          error: 'AI_DISABLED_NO_KEY',
          message: 'IA desativada. Configure sua chave OpenAI em Integrações → IA (ChatGPT)'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from('ai_company_settings')
      .select('*')
      .eq('company_id', company_id)
      .maybeSingle();

    if (aiSettings && !aiSettings.enabled) {
      return new Response(
        JSON.stringify({ 
          error: 'AI_DISABLED',
          message: 'IA está desativada nas configurações da empresa'
        }),
        { status: 412, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get company context
    const [categoriesRes, accountsRes, walletsRes, counterpartiesRes, rulesRes] = await Promise.all([
      supabase.from('account_categories').select('id, code, name, category_type').eq('company_id', company_id).eq('is_active', true),
      supabase.from('accounts').select('id, code, name, category_id').eq('company_id', company_id).eq('is_active', true).limit(50),
      supabase.from('wallets').select('id, name, bank_name').eq('company_id', company_id).eq('is_active', true),
      supabase.from('counterparties').select('id, name, type').eq('company_id', company_id).eq('is_active', true).limit(50),
      supabase.from('automation_rules').select('pattern, action_json').eq('company_id', company_id).eq('is_active', true).limit(20),
    ]);

    const systemPrompt = `Você é um assistente financeiro que interpreta mensagens sobre transações financeiras.
Sua tarefa é extrair informações estruturadas da mensagem do usuário.

CONTEXTO DA EMPRESA:
- Categorias: ${JSON.stringify(categoriesRes.data?.slice(0, 10) || [])}
- Contas: ${JSON.stringify(accountsRes.data?.slice(0, 10) || [])}
- Carteiras: ${JSON.stringify(walletsRes.data || [])}
- Fornecedores/Clientes: ${JSON.stringify(counterpartiesRes.data?.slice(0, 10) || [])}

REGRAS DE AUTOMAÇÃO EXISTENTES:
${rulesRes.data?.map(r => `- Padrão "${r.pattern}" → ${JSON.stringify(r.action_json)}`).join('\n') || 'Nenhuma'}

INSTRUÇÕES:
1. Identifique a intenção: criar lançamento (create_transaction), baixar título (settle_transaction), criar e baixar (create_and_settle), consulta (query_report), desfazer (undo_action)
2. Extraia valores monetários (R$, reais)
3. Identifique datas (hoje, ontem, dd/mm, etc)
4. Identifique carteiras por nome do banco (Itaú, Bradesco, Nubank, etc)
5. Identifique categorias/contas pelo contexto (despesa, receita, fornecedor, cliente)
6. Extraia número de documento (NF, boleto, etc)
7. Se faltar informação obrigatória (categoria, conta, carteira), liste em missing_fields
8. Defina confidence baseado na clareza da mensagem

EXEMPLOS:
- "Paguei NF 1234 R$ 189,90 hoje no Itaú" → create_and_settle, direction: out, amount: 189.90
- "Recebi R$ 500 do cliente João" → create_and_settle, direction: in
- "Baixar boleto de R$ 1000 do fornecedor XYZ" → settle_transaction
- "Lancei despesa de R$ 50 com alimentação" → create_transaction, direction: out
- "Me manda o fluxo do mês" → query_report

Responda APENAS com JSON válido seguindo o schema.`;

    const startTime = Date.now();
    
    // Call OpenAI API (using resolved key - company or global)
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
          { role: 'user', content: text }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_transaction_intent',
            description: 'Extrai a intenção e dados da transação da mensagem',
            parameters: transactionSchema
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_transaction_intent' } }
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: 'INVALID_API_KEY', message: 'Chave OpenAI inválida' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response received, usage:', aiResponse.usage);

    // Extract structured output from tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    let parsedOutput;
    
    if (toolCall?.function?.arguments) {
      parsedOutput = JSON.parse(toolCall.function.arguments);
    } else {
      const content = aiResponse.choices?.[0]?.message?.content;
      parsedOutput = JSON.parse(content);
    }

    // Save AI request
    const { data: aiRequest } = await supabase
      .from('ai_requests')
      .insert({
        company_id,
        inbox_id,
        model: 'gpt-4o-mini',
        input_json: { text, system_prompt_length: systemPrompt.length },
        output_json: parsedOutput,
        raw_response: aiResponse,
        tokens_input: aiResponse.usage?.prompt_tokens,
        tokens_output: aiResponse.usage?.completion_tokens,
        latency_ms: latencyMs,
        status: 'completed',
      })
      .select()
      .single();

    // Determine risk level based on settings
    let riskLevel = 'low';
    const riskReasons: string[] = [];
    const highRiskLimit = aiSettings?.high_risk_amount_limit || 10000;
    
    if (parsedOutput.confidence < 0.7) {
      riskLevel = 'medium';
      riskReasons.push('low_confidence');
    }
    if (parsedOutput.missing_fields?.length > 0) {
      riskLevel = 'medium';
      riskReasons.push('missing_required_fields');
    }
    if (parsedOutput.transaction?.amount > highRiskLimit) {
      riskLevel = 'high';
      riskReasons.push('high_value_transaction');
    }
    if (parsedOutput.intent === 'create_and_settle' && parsedOutput.confidence < 0.85) {
      riskLevel = 'high';
      riskReasons.push('auto_settle_uncertain');
    }

    // Determine auto-approval based on settings
    const autopilotMode = aiSettings?.autopilot_mode || 'safe';
    let autoApprove = false;
    
    if (autopilotMode === 'autopilot') {
      autoApprove = riskLevel !== 'high' || !aiSettings?.require_pin_for_high_risk;
    } else if (autopilotMode === 'balanced') {
      autoApprove = riskLevel === 'low';
    }
    // safe mode: never auto-approve

    // Check specific permissions
    if (autoApprove) {
      if (parsedOutput.intent === 'settle_transaction' && !aiSettings?.allow_auto_settle) {
        autoApprove = false;
      }
      if (parsedOutput.intent === 'create_and_settle' && !aiSettings?.allow_auto_create_and_settle) {
        autoApprove = false;
      }
    }

    // Create AI decision
    const { data: decision, error: decisionError } = await supabase
      .from('ai_decisions')
      .insert({
        company_id,
        inbox_id,
        ai_request_id: aiRequest?.id,
        intent: parsedOutput.intent,
        confidence: parsedOutput.confidence,
        proposed_actions_json: [parsedOutput],
        needs_confirmation: !autoApprove || parsedOutput.needs_confirmation,
        missing_fields_json: parsedOutput.missing_fields || [],
        risk_level: riskLevel,
        risk_reasons_json: riskReasons,
        status: autoApprove && !parsedOutput.needs_confirmation ? 'approved' : 'awaiting_confirmation',
      })
      .select()
      .single();

    if (decisionError) {
      console.error('Error creating decision:', decisionError);
      throw decisionError;
    }

    // Update inbox status if inbox_id provided
    if (inbox_id) {
      await supabase
        .from('whatsapp_inbox')
        .update({ status: 'processed', processed_at: new Date().toISOString() })
        .eq('id', inbox_id);
    }

    // If auto-approved, create execution job
    if (decision.status === 'approved') {
      await supabase
        .from('jobs_queue')
        .insert({
          company_id,
          job_type: 'execute_actions',
          payload_json: { decision_id: decision.id },
          priority: 3,
        });
    }

    console.log(`Decision created: ${decision.id}, status: ${decision.status}, source: ${keyResult.source}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        decision_id: decision.id,
        intent: parsedOutput.intent,
        confidence: parsedOutput.confidence,
        needs_confirmation: decision.needs_confirmation,
        risk_level: riskLevel,
        parsed_output: parsedOutput,
        ai_source: keyResult.source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Parse message error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
