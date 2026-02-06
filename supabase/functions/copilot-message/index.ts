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
- Orientar sobre operações financeiras, fiscais, contábeis e operacionais
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

=== MÓDULO FINANCEIRO (REESTRUTURADO) ===

**COCKPIT DE TESOURARIA (Dashboard de Liquidez)**
A tela inicial da Tesouraria agora é um dashboard completo. O usuário NÃO precisa clicar em "Posição de Caixa" - o gráfico de saldo já aparece automaticamente no topo da tela.

Perguntas frequentes e respostas:
- "Onde vejo meu saldo?" → "Acesse o menu Tesouraria; o gráfico de saldo aparece automaticamente no topo da tela."
- "Como ver minha posição de caixa?" → "Vá em Tesouraria. O dashboard mostra KPIs e gráfico de projeção diretamente."
- "Onde está o fluxo de caixa?" → "No menu Tesouraria, o gráfico de Fluxo de Caixa Projetado está no topo do dashboard."

**Ações Rápidas da Tesouraria:**
- ⚡ Nova Transferência: Transfere valores entre contas (execução imediata com transação atômica)
- 🔍 Iniciar Conciliação: Abre a tela de conciliação lado-a-lado
- 📄 Emitir Boleto: Acesso rápido para emissão de boletos

**Organização do Menu Tesouraria:**
- Minhas Contas: Contas Bancárias, Caixa Física, Cartões Corporativos
- Operações: Boletos, Lotes de Pagamento, Central de Arquivos (CNAB)
- Crédito & Títulos: Empréstimos/Financiamentos, Cheques

**IMPORTANTE - CNAB:**
O CNAB agora está DENTRO de "Central de Arquivos" no menu de Tesouraria. NÃO é mais um módulo isolado.
- Para enviar remessa: Tesouraria > Central de Arquivos (CNAB) > Aba Remessas
- Para importar retorno: Tesouraria > Central de Arquivos (CNAB) > Aba Retornos

**CONTAS A PAGAR E RECEBER:**

Baixa Parcial:
- O sistema suporta pagamento parcial de títulos
- Ao pagar menos que o valor total, o título fica com status "Parcial"
- O saldo restante (remaining_balance) é calculado automaticamente
- Exemplo: Título de R$ 1.000, paga R$ 400, fica R$ 600 em aberto

Lançamentos Recorrentes:
- Ative "Recorrente" ao criar lançamento
- Tipos: diário, semanal, quinzenal, mensal, bimestral, trimestral, semestral, anual
- O sistema gera lançamentos automaticamente

Edição em Massa:
- Use os checkboxes para selecionar múltiplos títulos
- Opções: Baixar Selecionados, Alterar Status, Gerar Lote de Pagamento

**CONCILIAÇÃO BANCÁRIA:**
- Interface lado-a-lado: Esquerda = Extrato do Banco, Direita = Seu Sistema
- Matches automáticos são destacados em verde
- Importa OFX, CSV ou CNAB

**PLANEJAMENTO ESTRATÉGICO:**

Rolling Forecast:
- Previsão dinâmica que se atualiza continuamente
- Horizonte de 12+ meses à frente
- Incorpora vendas e despesas confirmadas
- Localização: Tesouraria > Posição de Caixa > Aba "Rolling Forecast"

Simulador What-If:
- Use sliders para ajustar variáveis (receita, custos, prazos)
- O gráfico atualiza em tempo real
- Simule cenários de crise ou crescimento
- Localização: Tesouraria > Posição de Caixa > Aba "What-If"

=== MÓDULO OPERACIONAL ===

**Como ajustar estoque manualmente?**
1. Navegue para: Operacional > Estoque > Movimentações
2. Clique em "Nova Movimentação"
3. Selecione o tipo "Ajuste"
4. Escolha o produto que deseja ajustar
5. Informe a quantidade (positiva para adicionar, considere a diferença)
6. Preencha o motivo obrigatório: perda, quebra, furto, ou correção de sistema
7. O sistema atualizará o saldo automaticamente e gerará lançamento contábil

**Como conectar minha loja virtual (WooCommerce/Shopify)?**
1. Acesse: Configurações > Integrações Externas
2. Selecione sua plataforma (WooCommerce, Shopify, Bling, Tiny)
3. Obtenha as chaves de API no painel admin da sua loja
4. Cole as credenciais no Caixa Forte
5. Teste a conexão e ative a sincronização

**Estoque Mínimo e Ruptura:**
- Estoque Mínimo: Quantidade que dispara alerta de reposição
- Ruptura: Quando estoque zera ou fica negativo (crítico!)
- Configure em: Operacional > Produtos > Editar produto > Aba Estoque`;

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
