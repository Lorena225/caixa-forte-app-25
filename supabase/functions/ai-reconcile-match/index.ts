import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BankTransaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  direction: 'entrada' | 'saida';
}

interface SystemTransaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  counterparty?: string;
  type: 'receita' | 'despesa';
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { company_id, bank_transaction, system_transactions } = await req.json();

    if (!company_id || !bank_transaction || !system_transactions) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bankTxn = bank_transaction as BankTransaction;
    const sysTxns = system_transactions as SystemTransaction[];

    // Filter by direction match first
    const directionMap = { 'entrada': 'receita', 'saida': 'despesa' };
    const filteredTxns = sysTxns.filter(t => t.type === directionMap[bankTxn.direction]);

    if (filteredTxns.length === 0) {
      return new Response(
        JSON.stringify({ match: null, reason: "No transactions match direction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt for AI
    const systemPrompt = `Você é um especialista em conciliação bancária. Analise a transação bancária e encontre a melhor correspondência entre as transações do sistema.

Regras de correspondência:
1. O valor deve ser igual ou muito próximo (tolerância de 1%)
2. A data deve estar dentro de 5 dias úteis
3. Descrições similares aumentam a confiança
4. Contrapartes conhecidas aumentam a confiança

Responda APENAS com a chamada da função match_transaction.`;

    const userPrompt = `Transação bancária a conciliar:
- ID: ${bankTxn.id}
- Valor: R$ ${Math.abs(bankTxn.amount).toFixed(2)}
- Data: ${bankTxn.date}
- Descrição: ${bankTxn.description || "Sem descrição"}
- Tipo: ${bankTxn.direction === 'entrada' ? 'Crédito' : 'Débito'}

Transações do sistema disponíveis para matching:
${filteredTxns.map((t, i) => `
${i + 1}. ID: ${t.id}
   Valor: R$ ${t.amount.toFixed(2)}
   Data: ${t.date}
   Descrição: ${t.description || "Sem descrição"}
   Contraparte: ${t.counterparty || "N/A"}
`).join('\n')}

Encontre a melhor correspondência ou indique que não há match adequado.`;

    console.log(`[ai-reconcile-match] Processing bank txn ${bankTxn.id} against ${filteredTxns.length} candidates`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "match_transaction",
              description: "Retorna o resultado do matching entre transações",
              parameters: {
                type: "object",
                properties: {
                  has_match: {
                    type: "boolean",
                    description: "Se uma correspondência adequada foi encontrada",
                  },
                  transaction_id: {
                    type: "string",
                    description: "ID da transação do sistema que corresponde",
                  },
                  confidence: {
                    type: "number",
                    description: "Nível de confiança de 0 a 1",
                  },
                  reasons: {
                    type: "array",
                    items: { type: "string" },
                    description: "Razões para o match ou não-match",
                  },
                  amount_diff: {
                    type: "number",
                    description: "Diferença de valor em reais",
                  },
                  date_diff_days: {
                    type: "number",
                    description: "Diferença em dias entre as datas",
                  },
                },
                required: ["has_match", "confidence", "reasons"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "match_transaction" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await response.json();
    console.log("[ai-reconcile-match] AI response received");

    // Parse tool call response
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "match_transaction") {
      return new Response(
        JSON.stringify({ match: null, reason: "AI did not return a valid match result" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let matchResult;
    try {
      matchResult = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse AI response:", e);
      return new Response(
        JSON.stringify({ match: null, reason: "Failed to parse AI response" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!matchResult.has_match) {
      return new Response(
        JSON.stringify({ 
          match: null, 
          reason: matchResult.reasons?.join("; ") || "No suitable match found"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the match for auditing
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("ai_logs").insert({
      company_id,
      agent_type: "reconcile_matcher",
      origin: "edge_function",
      input_text: `Bank txn ${bankTxn.id} matching`,
      interpretation: matchResult,
      status: "success",
    });

    console.log(`[ai-reconcile-match] Match found: ${matchResult.transaction_id} with confidence ${matchResult.confidence}`);

    return new Response(
      JSON.stringify({
        match: {
          transaction_id: matchResult.transaction_id,
          confidence: matchResult.confidence,
          reasons: matchResult.reasons,
          amount_diff: matchResult.amount_diff || 0,
          date_diff_days: matchResult.date_diff_days || 0,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[ai-reconcile-match] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
