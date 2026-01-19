import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CopilotContext {
  route: string;
  module: string;
  userId?: string;
  companyId?: string;
  companyName?: string;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context, conversationHistory = [] } = await req.json() as {
      message: string;
      context: CopilotContext;
      conversationHistory: ChatMessage[];
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é o Copilot, um assistente de IA integrado ao Caixa Forte ERP, um sistema de gestão financeira empresarial brasileiro.

Sua função é:
- Ajudar usuários a navegar pelo sistema
- Responder dúvidas sobre funcionalidades
- Orientar sobre operações financeiras, fiscais e contábeis
- Sugerir ações e atalhos quando apropriado

Contexto atual do usuário:
- Módulo: ${context.module}
- Rota: ${context.route}
${context.companyName ? `- Empresa: ${context.companyName}` : ''}

Diretrizes:
1. Responda sempre em português brasileiro
2. Seja conciso e direto, mas cordial
3. Use terminologia financeira/contábil brasileira quando apropriado
4. Se não souber algo específico do sistema, indique onde o usuário pode encontrar a informação
5. Para operações complexas, divida em passos claros
6. Mencione atalhos de teclado quando relevante (ex: Cmd+K para busca rápida)

Módulos principais do sistema:
- Dashboard: Visão geral e KPIs
- Tesouraria: Fluxo de caixa, contratos, CNAB, PIX
- Fiscal: NF-e, NFS-e, SPED, obrigações acessórias
- Contabilidade: Lançamentos, razão, balancete, DRE
- Cobrança: Boletos, réguas de cobrança, negativação
- Compras: Cotações, pedidos, entradas
- Vendas: Orçamentos, pedidos, faturamento
- Estoque: Movimentações, inventário
- Cadastros: Clientes, fornecedores, plano de contas
- Conciliação: Extrato bancário, importação OFX
- Integrações: APIs, webhooks, conectores`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
        max_tokens: 1024,
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
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("copilot-message error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
