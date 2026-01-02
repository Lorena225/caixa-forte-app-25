import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveOpenAIKey } from "../_shared/resolveOpenAIKey.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Schema for bank statement line extraction
const statementLineSchema = {
  type: "object",
  properties: {
    lines: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Data da transação (YYYY-MM-DD)" },
          description: { type: "string", description: "Descrição do lançamento" },
          amount: { type: "number", description: "Valor absoluto" },
          direction: { type: "string", enum: ["credit", "debit"], description: "Crédito ou débito" },
          balance: { type: "number", description: "Saldo após transação (se disponível)" },
          reference: { type: "string", description: "Número de referência/documento" },
          counterparty_hint: { type: "string", description: "Nome do beneficiário/pagador" },
          category_hint: { type: "string", description: "Categoria sugerida" }
        },
        required: ["date", "description", "amount", "direction"]
      }
    },
    summary: {
      type: "object",
      properties: {
        period_start: { type: "string" },
        period_end: { type: "string" },
        opening_balance: { type: "number" },
        closing_balance: { type: "number" },
        total_credits: { type: "number" },
        total_debits: { type: "number" },
        line_count: { type: "number" }
      }
    }
  },
  required: ["lines", "summary"]
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
    const { file_id, file_content, company_id, wallet_id } = await req.json();
    
    if (!file_content || !company_id) {
      throw new Error('file_content and company_id are required');
    }

    console.log(`Parsing statement for company ${company_id}, content length: ${file_content.length}`);

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

    // Get company context for categorization
    const [categoriesRes, counterpartiesRes, rulesRes] = await Promise.all([
      supabase.from('account_categories').select('id, name, category_type').eq('company_id', company_id).eq('is_active', true).limit(30),
      supabase.from('counterparties').select('id, name, type, document').eq('company_id', company_id).eq('is_active', true).limit(100),
      supabase.from('categorization_rules').select('name, conditions_json, account_id, counterparty_id').eq('company_id', company_id).eq('is_active', true).limit(50),
    ]);

    const systemPrompt = `Você é um especialista em análise de extratos bancários. 
Sua tarefa é extrair transações estruturadas do texto do extrato fornecido.

CONTEXTO DA EMPRESA:
- Categorias disponíveis: ${JSON.stringify(categoriesRes.data?.slice(0, 20) || [])}
- Fornecedores/Clientes conhecidos: ${JSON.stringify(counterpartiesRes.data?.map(c => ({ name: c.name, type: c.type })).slice(0, 30) || [])}

REGRAS DE CATEGORIZAÇÃO:
${rulesRes.data?.map(r => `- ${r.name}: ${JSON.stringify(r.conditions_json)}`).join('\n') || 'Nenhuma regra definida'}

INSTRUÇÕES:
1. Identifique cada linha de transação no extrato
2. Extraia data, descrição, valor e tipo (crédito/débito)
3. Identifique saldos quando disponíveis
4. Sugira categorias baseado na descrição e nas categorias disponíveis
5. Identifique contrapartes conhecidas (clientes/fornecedores)
6. Extraia números de referência/documento quando presentes
7. Calcule totais de créditos e débitos
8. Identifique período e saldos de abertura/fechamento

FORMATO DE DATAS: Use YYYY-MM-DD
VALORES: Use números positivos (a direção indica se é crédito ou débito)

Analise o texto e retorne as transações estruturadas.`;

    const startTime = Date.now();
    
    // Call OpenAI API
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
          { role: 'user', content: `Analise o seguinte extrato bancário:\n\n${file_content}` }
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_statement_lines',
            description: 'Extrai linhas de transação do extrato bancário',
            parameters: statementLineSchema
          }
        }],
        tool_choice: { type: 'function', function: { name: 'extract_statement_lines' } }
      }),
    });

    const latencyMs = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    
    // Extract structured output
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    let parsedOutput;
    
    if (toolCall?.function?.arguments) {
      parsedOutput = JSON.parse(toolCall.function.arguments);
    } else {
      throw new Error('Failed to extract structured output from AI response');
    }

    // Save AI request
    await supabase
      .from('ai_requests')
      .insert({
        company_id,
        file_id,
        model: 'gpt-4o-mini',
        input_json: { content_length: file_content.length },
        output_json: parsedOutput,
        tokens_input: aiResponse.usage?.prompt_tokens,
        tokens_output: aiResponse.usage?.completion_tokens,
        latency_ms: latencyMs,
        status: 'completed',
      });

    // Create bank statement import record
    const { data: importRecord, error: importError } = await supabase
      .from('bank_statement_imports')
      .insert({
        company_id,
        wallet_id,
        file_id,
        source: 'ai_parsed',
        file_format: 'text',
        status: 'parsed',
        line_count: parsedOutput.lines?.length || 0,
        total_credits: parsedOutput.summary?.total_credits,
        total_debits: parsedOutput.summary?.total_debits,
        opening_balance: parsedOutput.summary?.opening_balance,
        closing_balance: parsedOutput.summary?.closing_balance,
        period_start: parsedOutput.summary?.period_start,
        period_end: parsedOutput.summary?.period_end,
        summary_json: parsedOutput.summary,
        processed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (importError) {
      console.error('Error creating import record:', importError);
      throw importError;
    }

    // Create bank statement and lines if wallet provided
    if (wallet_id && parsedOutput.lines?.length > 0) {
      const { data: statement } = await supabase
        .from('bank_statements')
        .insert({
          company_id,
          wallet_id,
          statement_date: parsedOutput.summary?.period_end || new Date().toISOString().split('T')[0],
          opening_balance: parsedOutput.summary?.opening_balance,
          closing_balance: parsedOutput.summary?.closing_balance,
          source_type: 'ai_parsed',
        })
        .select()
        .single();

      if (statement) {
        const linesToInsert = parsedOutput.lines.map((line: any, idx: number) => ({
          statement_id: statement.id,
          line_number: idx + 1,
          posted_date: line.date,
          description: line.description,
          amount: line.amount,
          direction: line.direction,
          balance: line.balance,
          reference_number: line.reference,
          is_reconciled: false,
        }));

        await supabase.from('bank_statement_lines').insert(linesToInsert);
      }
    }

    console.log(`Statement parsed: ${parsedOutput.lines?.length} lines, source: ${keyResult.source}`);

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importRecord?.id,
        lines_count: parsedOutput.lines?.length || 0,
        summary: parsedOutput.summary,
        lines: parsedOutput.lines,
        ai_source: keyResult.source,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Statement parser error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
