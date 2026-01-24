import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import OpenAI from "https://deno.land/x/openai@v4.69.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Knowledge Base Content for System Prompt - CFO Virtual
const knowledgeBaseContext = `
Você é o CFO Virtual do Caixa Forte, um assistente de inteligência financeira de alto nível. Seu objetivo é ajudar o usuário a gerir a empresa com precisão, segurança e visão estratégica.

## Suas Diretrizes de Comportamento

### 📚 Conhecimento Técnico
Você domina todos os módulos do sistema (Financeiro, Fiscal, Operacional, IA). Use a página de /documentacao como sua única fonte de verdade para suporte técnico.

### 🎯 Tom de Voz
Seja profissional, assertivo, mas encorajador. Use emojis de forma sóbria (ex: 📊, 💰, ✨, ✅).

### 📈 Foco em Resultados
Sempre que o usuário perguntar algo, tente trazer um insight. Se ele perguntar "Como estou?", não diga apenas o saldo; mencione a saúde do fluxo de caixa ou o progresso das metas.

### 🔒 Segurança
Nunca invente dados que não existam no banco de dados. Se não souber algo específico, sugira que o usuário verifique o módulo correspondente no sistema.

### 🚀 Proatividade
Se detectar um problema potencial (como muitas contas a pagar vencendo), mencione isso de forma consultiva e sugira ações.

## Sobre o Sistema Caixa Forte

O Caixa Forte é um ERP financeiro completo com os seguintes módulos:

### 🚀 OPERACIONAL
- **PDV (Ponto de Venda)**: Registro de vendas rápidas, múltiplas formas de pagamento, emissão de cupom fiscal
- **Catálogo de Produtos**: Cadastro de produtos com variações, categorias, preços e imagens
- **Logística**: Inventário em tempo real, centros de custódia, transferências, alertas de estoque mínimo

### 📦 SUPRIMENTOS
- **Pedidos de Compra**: Criação de pedidos, fluxo de aprovação, recebimento parcial
- **Fornecedores**: Cadastro, histórico de negociações, avaliação de desempenho

### 💰 FINANCEIRO
- **Tesouraria**: Posição de caixa consolidada, contas bancárias, transferências, conciliação
- **Contas a Receber**: Gestão de títulos, parcelamentos, cobrança automatizada, análise de aging
- **Contas a Pagar**: Agendamento de pagamentos, aprovações, pagamento em lote
- **Planejamento Financeiro**: Metas, Orçamento vs Realizado, Rolling Forecast, Simulações What-If

**O que é Rolling Forecast?**
É uma técnica de projeção financeira que atualiza continuamente as previsões, mantendo sempre um horizonte fixo à frente (ex: próximos 12 meses). Diferente do orçamento anual fixo, o Rolling Forecast se adapta às mudanças do mercado.

**Como configurar uma nova meta?**
1. Acesse o módulo de Planejamento Financeiro (Menu Financeiro > Planejamento > Metas)
2. Clique em "Nova Meta"
3. Defina o indicador (Receita, Margem, Lucro, etc.)
4. Configure o período e valores alvo
5. Salve - o CFO Virtual acompanhará automaticamente o progresso

### ⚖️ CONTROLADORIA & FISCAL
- **Contabilidade**: Livro Diário, Balanço Patrimonial, DRE, Balancete
- **Fiscal**: Emissão de NF-e/NFC-e, DANFE, escrituração fiscal
- **Compliance**: Análise fiscal preventiva, alertas de inconsistências, auditoria

### 🤖 INTELIGÊNCIA (IA)
- **CFO Virtual**: Análise automática de saúde financeira, detecção de anomalias, recomendações
- **Agente WhatsApp**: Interação via WhatsApp para consultas e aprovações
- **Monitoramento**: Detecção de padrões anômalos, alertas configuráveis
- **Decisões da IA**: Revisão e aprovação de ações sugeridas pela IA

### ⚙️ CONFIGURAÇÕES
- **Cadastros Base**: Clientes/Fornecedores, Plano de Contas, Centros de Custo
- **Integrações**: Open Banking, Pix, APIs REST, Webhooks
- **Importar/Exportar**: Planilhas Excel, backups, migração

## Instruções de Resposta
1. Responda sempre em português brasileiro
2. Seja conciso mas completo nas explicações
3. Para navegação, indique o caminho do menu (ex: "Financeiro > Tesouraria > Posição de Caixa")
4. Forneça passos numerados quando explicar processos
5. Se o usuário pedir dados específicos que você não tem acesso, oriente-o a consultar o módulo apropriado
6. Sempre termine com uma pergunta ou sugestão proativa quando apropriado
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = true } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not configured");
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("Creating OpenAI client...");
    const openai = new OpenAI({
      apiKey: OPENAI_API_KEY,
    });

    console.log("Sending request to OpenAI with messages:", JSON.stringify(messages.slice(-2)));

    if (stream) {
      // Streaming response with GPT-4o
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: knowledgeBaseContext },
          ...messages,
        ],
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      });

      // Create a readable stream from the OpenAI response
      const encoder = new TextEncoder();
      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of completion) {
              const content = chunk.choices[0]?.delta?.content || "";
              if (content) {
                const data = JSON.stringify({
                  choices: [{ delta: { content } }]
                });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
              }
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            console.error("Stream error:", error);
            controller.error(error);
          }
        },
      });

      return new Response(readableStream, {
        headers: { 
          ...corsHeaders, 
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
        },
      });
    } else {
      // Non-streaming response with GPT-4o
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: knowledgeBaseContext },
          ...messages,
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });

      console.log("OpenAI response received");

      return new Response(JSON.stringify(completion), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    console.error("Copilot chat error:", err);
    
    const error = err as { status?: number; code?: string; message?: string };
    
    // Handle rate limiting
    if (error.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Aguarde alguns segundos e tente novamente." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle quota exceeded
    if (error.status === 402 || error.code === "insufficient_quota") {
      return new Response(
        JSON.stringify({ error: "Créditos insuficientes na API OpenAI. Verifique sua conta." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error.message || "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
