import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Knowledge Base Content for System Prompt
const knowledgeBaseContext = `
Você é o Copilot do Caixa Forte, um assistente inteligente especializado em ajudar usuários a navegar e utilizar o sistema ERP financeiro.

## Sobre o Sistema Caixa Forte
O Caixa Forte é um ERP financeiro completo com módulos de:

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

## Instruções de Comportamento
1. Responda sempre em português brasileiro
2. Seja conciso mas completo nas explicações
3. Use emojis para tornar as respostas mais amigáveis
4. Quando não souber algo específico do sistema, sugira contatar o suporte
5. Para navegação, indique o caminho do menu (ex: "Financeiro > Tesouraria > Posição de Caixa")
6. Forneça passos numerados quando explicar processos
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, stream = true } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: knowledgeBaseContext },
          ...messages,
        ],
        stream,
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
          JSON.stringify({ error: "Créditos insuficientes. Entre em contato com o administrador." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua pergunta. Tente novamente." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    } else {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (error) {
    console.error("Copilot chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
