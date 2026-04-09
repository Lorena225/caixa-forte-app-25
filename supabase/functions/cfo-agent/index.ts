import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Define tools for Function Calling
const tools = [
  {
    type: "function",
    function: {
      name: "create_transaction",
      description: "Cria uma nova transação financeira (despesa ou receita) no sistema. Use quando o usuário pedir para lançar, registrar ou criar um gasto, despesa, receita ou entrada.",
      parameters: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["income", "expense"],
            description: "Tipo da transação: 'expense' para despesas/gastos, 'income' para receitas/entradas"
          },
          amount: {
            type: "number",
            description: "Valor da transação em reais (número positivo)"
          },
          description: {
            type: "string",
            description: "Descrição da transação (ex: 'Uber', 'Almoço', 'Venda produto X')"
          },
          category_name: {
            type: "string",
            description: "Nome da categoria sugerida (ex: 'Transporte', 'Alimentação', 'Vendas')"
          },
          date: {
            type: "string",
            description: "Data da transação no formato YYYY-MM-DD (se não informada, usar data atual)"
          }
        },
        required: ["type", "amount", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_balance",
      description: "Obtém o saldo atual e resumo financeiro da empresa. Use quando o usuário perguntar sobre saldo, quanto tem, posição de caixa.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_pending_bills",
      description: "Lista contas a pagar próximas do vencimento. Use quando o usuário perguntar sobre contas, vencimentos, o que precisa pagar.",
      parameters: {
        type: "object",
        properties: {
          days_ahead: {
            type: "number",
            description: "Quantidade de dias à frente para buscar (padrão: 7)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_insight",
      description: "Registra uma sugestão ou insight proativo para o usuário. Use quando identificar padrões ou oportunidades.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Título curto do insight"
          },
          description: {
            type: "string",
            description: "Descrição detalhada da sugestão"
          },
          insight_type: {
            type: "string",
            enum: ["suggestion", "pattern", "forecast", "alert"],
            description: "Tipo do insight"
          },
          severity: {
            type: "string",
            enum: ["info", "warning", "critical"],
            description: "Severidade do insight"
          }
        },
        required: ["title", "description", "insight_type"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "analyze_image",
      description: "Analisa uma imagem de nota fiscal, recibo ou comprovante usando OCR. Use quando o usuário enviar uma imagem para lançamento.",
      parameters: {
        type: "object",
        properties: {
          image_url: {
            type: "string",
            description: "URL da imagem a ser analisada"
          }
        },
        required: ["image_url"]
      }
    }
  }
];

// Tool execution functions
async function executeCreateTransaction(
  supabase: any,
  companyId: string,
  params: { type: string; amount: number; description: string; category_name?: string; date?: string }
) {
  console.log("[CFO Agent] Executing create_transaction:", params);
  
  // Find or create category
  let categoryId = null;
  if (params.category_name) {
    const { data: category } = await supabase
      .from("account_categories")
      .select("id")
      .eq("company_id", companyId)
      .ilike("name", `%${params.category_name}%`)
      .limit(1)
      .single();
    
    categoryId = category?.id;
  }

  // Create the transaction
  const transactionData = {
    company_id: companyId,
    direction: params.type === "expense" ? "out" : "in",
    total_amount: params.type === "expense" ? -Math.abs(params.amount) : Math.abs(params.amount),
    original_amount: Math.abs(params.amount),
    description: params.description,
    category_id: categoryId,
    transaction_date: params.date || new Date().toISOString().split("T")[0],
    status: "pending"
  };

  const { data, error } = await supabase
    .from("transactions")
    .insert(transactionData)
    .select()
    .single();

  if (error) {
    console.error("[CFO Agent] Error creating transaction:", error);
    return { success: false, error: error.message };
  }

  console.log("[CFO Agent] Transaction created:", data.id);
  return {
    success: true,
    transaction_id: data.id,
    amount: Math.abs(params.amount),
    type: params.type,
    description: params.description,
    category: params.category_name || "Sem categoria",
    message: `Transação de R$ ${Math.abs(params.amount).toFixed(2)} (${params.description}) criada com sucesso!`
  };
}

async function executeGetBalance(supabase: any, companyId: string) {
  console.log("[CFO Agent] Executing get_balance");
  
  // Get total balance from bank accounts
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("current_balance")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const totalBalance = accounts?.reduce((sum: number, acc: any) => sum + (acc.current_balance || 0), 0) || 0;

  // Get pending receivables
  const { data: receivables } = await supabase
    .from("transactions")
    .select("total_amount")
    .eq("company_id", companyId)
    .eq("direction", "in")
    .eq("status", "pending");

  const pendingReceivables = receivables?.reduce((sum: number, t: any) => sum + Math.abs(t.total_amount || 0), 0) || 0;

  // Get pending payables
  const { data: payables } = await supabase
    .from("transactions")
    .select("total_amount")
    .eq("company_id", companyId)
    .eq("direction", "out")
    .eq("status", "pending");

  const pendingPayables = payables?.reduce((sum: number, t: any) => sum + Math.abs(t.total_amount || 0), 0) || 0;

  return {
    current_balance: totalBalance,
    pending_receivables: pendingReceivables,
    pending_payables: pendingPayables,
    projected_balance: totalBalance + pendingReceivables - pendingPayables
  };
}

async function executeGetPendingBills(supabase: any, companyId: string, daysAhead: number = 7) {
  console.log("[CFO Agent] Executing get_pending_bills, days:", daysAhead);
  
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const { data: bills } = await supabase
    .from("transactions")
    .select("id, description, total_amount, due_date, counterparty_id, counterparties(name)")
    .eq("company_id", companyId)
    .eq("direction", "out")
    .eq("status", "pending")
    .lte("due_date", futureDate.toISOString().split("T")[0])
    .order("due_date", { ascending: true })
    .limit(10);

  return {
    bills: bills?.map((b: any) => ({
      id: b.id,
      description: b.description,
      amount: Math.abs(b.total_amount),
      due_date: b.due_date,
      counterparty: b.counterparties?.name || "Não informado"
    })) || [],
    total: bills?.reduce((sum: number, b: any) => sum + Math.abs(b.total_amount), 0) || 0,
    count: bills?.length || 0
  };
}

async function executeCreateInsight(
  supabase: any,
  companyId: string,
  params: { title: string; description: string; insight_type: string; severity?: string }
) {
  console.log("[CFO Agent] Executing create_insight:", params);
  
  const { data, error } = await supabase
    .from("ai_insights")
    .insert({
      company_id: companyId,
      title: params.title,
      description: params.description,
      insight_type: params.insight_type,
      severity: params.severity || "info",
      confidence_score: 85
    })
    .select()
    .single();

  if (error) {
    console.error("[CFO Agent] Error creating insight:", error);
    return { success: false, error: error.message };
  }

  return { success: true, insight_id: data.id };
}

async function executeAnalyzeImage(imageUrl: string) {
  console.log("[CFO Agent] Executing analyze_image (simulated OCR):", imageUrl);
  
  // Simulated OCR result - in production, integrate with Google Vision or similar
  return {
    success: true,
    ocr_result: {
      detected_amount: 50.00,
      detected_vendor: "Restaurante Exemplo",
      detected_date: new Date().toISOString().split("T")[0],
      suggested_category: "Alimentação",
      confidence: 0.87,
      raw_text: "NOTA FISCAL - R$ 50,00 - Restaurante Exemplo"
    },
    message: "Li sua nota de R$ 50,00 do Restaurante Exemplo. Classifico como Alimentação. Confirma o lançamento?"
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, companyId, conversationHistory = [] } = await req.json();

    if (!companyId) {
      return new Response(
        JSON.stringify({ error: "company_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI personality settings
    const { data: settings } = await supabase
      .from("ai_company_settings")
      .select("personality_mode")
      .eq("company_id", companyId)
      .single();

    const personalityMode = settings?.personality_mode || "balanced";
    
    const personalityPrompts: Record<string, string> = {
      conservative: "Você é um CFO conservador, focado em economia, redução de custos e preservação de caixa. Questione gastos desnecessários.",
      balanced: "Você é um CFO equilibrado, balanceando crescimento com prudência financeira. Analise custos e benefícios de cada decisão.",
      aggressive: "Você é um CFO focado em crescimento, busque oportunidades de investimento e expansão. Priorize ROI e escalabilidade."
    };

    const systemPrompt = `Você é o CFO Virtual do Vitrio ERP, um assistente financeiro inteligente para empresas brasileiras.

${personalityPrompts[personalityMode]}

Suas capacidades:
1. CRIAR TRANSAÇÕES: Quando o usuário pedir para lançar gastos ou receitas, use a função create_transaction
2. CONSULTAR SALDO: Use get_balance para informar posição financeira
3. LISTAR CONTAS: Use get_pending_bills para mostrar vencimentos
4. GERAR INSIGHTS: Use create_insight para sugestões proativas
5. ANALISAR IMAGENS: Use analyze_image para OCR de notas fiscais

Diretrizes:
- Responda sempre em português brasileiro
- Seja proativo: sugira ações quando identificar oportunidades
- Confirme antes de executar ações financeiras
- Use formatação monetária brasileira (R$ 1.234,56)
- Se o usuário mencionar valores, extraia o número corretamente
- Para despesas, use type="expense"; para receitas, use type="income"`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message }
    ];

    // First call to get tool calls
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools,
        tool_choice: "auto",
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o suporte." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("[CFO Agent] AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const completion = await response.json();
    const assistantMessage = completion.choices?.[0]?.message;

    // Check for tool calls
    if (assistantMessage?.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("[CFO Agent] Tool calls detected:", assistantMessage.tool_calls.length);
      
      const toolResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const funcName = toolCall.function.name;
        const funcArgs = JSON.parse(toolCall.function.arguments || "{}");
        
        console.log(`[CFO Agent] Executing tool: ${funcName}`, funcArgs);
        
        let result;
        switch (funcName) {
          case "create_transaction":
            result = await executeCreateTransaction(supabase, companyId, funcArgs);
            break;
          case "get_balance":
            result = await executeGetBalance(supabase, companyId);
            break;
          case "get_pending_bills":
            result = await executeGetPendingBills(supabase, companyId, funcArgs.days_ahead || 7);
            break;
          case "create_insight":
            result = await executeCreateInsight(supabase, companyId, funcArgs);
            break;
          case "analyze_image":
            result = await executeAnalyzeImage(funcArgs.image_url);
            break;
          default:
            result = { error: "Função não reconhecida" };
        }
        
        toolResults.push({
          tool_call_id: toolCall.id,
          role: "tool",
          content: JSON.stringify(result)
        });
      }

      // Second call with tool results
      const followUpMessages = [
        ...messages,
        assistantMessage,
        ...toolResults
      ];

      const followUpResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: followUpMessages,
          max_tokens: 1024,
          temperature: 0.7,
        }),
      });

      if (!followUpResponse.ok) {
        throw new Error(`Follow-up AI error: ${followUpResponse.status}`);
      }

      const followUpCompletion = await followUpResponse.json();
      const finalContent = followUpCompletion.choices?.[0]?.message?.content || "Operação concluída.";

      // Log AI action
      await supabase.from("ai_logs").insert({
        company_id: companyId,
        agent_type: "cfo_virtual",
        origin: "chat",
        input_text: message,
        interpretation: { tool_calls: assistantMessage.tool_calls },
        action_executed: toolResults.map(r => JSON.parse(r.content)),
        status: "completed"
      });

      return new Response(
        JSON.stringify({
          content: finalContent,
          tool_calls: assistantMessage.tool_calls.map((tc: any) => tc.function.name),
          tool_results: toolResults.map(r => JSON.parse(r.content))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No tool calls, return direct response
    return new Response(
      JSON.stringify({
        content: assistantMessage?.content || "Desculpe, não entendi. Pode reformular?",
        tool_calls: [],
        tool_results: []
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[CFO Agent] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
