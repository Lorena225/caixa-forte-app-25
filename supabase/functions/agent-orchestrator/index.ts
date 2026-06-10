// =====================================================
// BLOCO 3: ORQUESTRADOR DE AGENTES IA EXECUTORES
// Redeploy: 2026-06-10
// supabase/functions/agent-orchestrator/index.ts
// VirtruvIA · Blueprint Sistema Financeiro v1.0
// =====================================================
// Cada agente é instanciado por tipo e executa suas
// tools (ações CRUD) respeitando guardrails e N0–N3.
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Tipos ────────────────────────────────────────────
type AgentType =
  | "AP" | "AR" | "reconciliation" | "classifier"
  | "cashflow" | "loans" | "budget" | "fiscal"
  | "auditor" | "conversational";

type AutonomyLevel =
  | "N0_suggestion" | "N1_approval" | "N2_notify" | "N3_autonomous";

interface AgentRequest {
  company_id: string;
  agent_type: AgentType;
  trigger: string;          // descrição do evento que disparou o agente
  context_json?: Record<string, unknown>;
  force_level?: AutonomyLevel; // para testes/override manual
}

interface GuardrailResult {
  allowed: boolean;
  effective_level: AutonomyLevel;
  reason: string;
  requires_dual_approval?: boolean;
}

// ─── Ferramentas (tools) por agente ──────────────────

const AGENT_TOOLS: Record<AgentType, Record<string, { description: string; risk: "low"|"medium"|"high" }>> = {
  AP: {
    capturar_nf:           { description: "Captura NF de e-mail/webhook e armazena para processamento", risk: "low" },
    extrair_dados:         { description: "Extrai dados da NF via OCR/LLM (fornecedor, valor, data, itens)", risk: "low" },
    classificar_despesa:   { description: "Sugere conta contábil e centro de custo para a despesa", risk: "low" },
    criar_titulo_pagar:    { description: "Cria lançamento em contas a pagar", risk: "medium" },
    validar_xml_sefaz:     { description: "Valida chave de acesso da NF-e na SEFAZ", risk: "low" },
    associar_pedido:       { description: "Associa NF ao pedido de compra (3-way match)", risk: "medium" },
    encaminhar_aprovacao:  { description: "Envia para workflow de aprovação por alçada", risk: "low" },
    agendar_pagamento:     { description: "Agenda pagamento na data de vencimento", risk: "high" },
    gerar_cnab:            { description: "Gera arquivo CNAB para remessa bancária", risk: "high" },
    dar_baixa_titulo:      { description: "Baixa título após confirmação bancária", risk: "medium" },
  },
  AR: {
    emitir_boleto:         { description: "Emite boleto registrado via API bancária", risk: "medium" },
    enviar_cobranca:       { description: "Envia cobrança por e-mail/WhatsApp/SMS", risk: "low" },
    gerar_pix_qr:          { description: "Gera QR Code Pix dinâmico para recebimento", risk: "low" },
    aplicar_regua_cobranca:{ description: "Aplica régua de cobrança conforme escalonamento D-3/D+0/...", risk: "low" },
    dar_baixa_recebimento: { description: "Dá baixa ao receber pagamento (match valor+data+doc)", risk: "medium" },
    renegociar_titulo:     { description: "Renegocia prazo ou desconto de título em aberto", risk: "high" },
    calcular_juros_multa:  { description: "Calcula juros e multa por atraso conforme contrato", risk: "low" },
    atualizar_score_cliente:{ description: "Atualiza score de crédito do cliente com novo comportamento", risk: "low" },
  },
  reconciliation: {
    buscar_extrato_api:    { description: "Busca extrato via Open Finance / Pluggy API", risk: "low" },
    importar_ofx:          { description: "Importa extrato OFX do banco", risk: "low" },
    importar_cnab:         { description: "Importa retorno CNAB 240/400", risk: "low" },
    match_automatico:      { description: "Executa matching automático extrato × lançamentos", risk: "medium" },
    conciliar_titulo:      { description: "Concilia item do extrato com título do sistema", risk: "medium" },
    criar_lancamento_avulso:{ description: "Cria lançamento manual para itens sem match", risk: "medium" },
    reportar_divergencia:  { description: "Reporta divergência para revisão humana", risk: "low" },
    aprender_padrao:       { description: "Registra padrão de recorrência para futuros matches", risk: "low" },
  },
  classifier: {
    sugerir_conta_contabil:{ description: "Sugere conta contábil baseado no histórico da empresa", risk: "low" },
    sugerir_centro_custo:  { description: "Sugere centro de custo para o lançamento", risk: "low" },
    sugerir_natureza:      { description: "Sugere natureza financeira (categoria DRE)", risk: "low" },
    aprender_com_correcao: { description: "Aprende com correções humanas para melhorar futuros", risk: "low" },
    classificar_em_lote:   { description: "Classifica lote de lançamentos não classificados", risk: "low" },
  },
  cashflow: {
    calcular_fluxo_caixa:  { description: "Calcula fluxo de caixa realizado do período", risk: "low" },
    projetar_30_60_90:     { description: "Projeta fluxo 30/60/90 dias com base em recorrências", risk: "low" },
    simular_cenario:       { description: "Simula cenário otimista/realista/pessimista", risk: "low" },
    alertar_saldo_critico: { description: "Emite alerta quando saldo projetado fica negativo", risk: "low" },
    sugerir_aplicacao:     { description: "Sugere aplicação financeira de saldo ocioso", risk: "medium" },
    sugerir_resgate:       { description: "Sugere resgate de aplicação para cobrir obrigação", risk: "high" },
  },
  loans: {
    gerar_cronograma:      { description: "Gera cronograma de parcelas (SAC/Price/Bullet/Misto)", risk: "low" },
    atualizar_saldo_devedor:{ description: "Atualiza saldo devedor com pagamentos e indexadores", risk: "medium" },
    calcular_juros:        { description: "Calcula juros do período por indexador (CDI/IPCA/etc.)", risk: "low" },
    simular_amortizacao_extra:{ description: "Simula amortização extraordinária e impacto no custo", risk: "low" },
    provisionar_contabilmente:{ description: "Gera provisão contábil de juros e encargos", risk: "medium" },
    alertar_covenant:      { description: "Alerta quando cláusula contratual está em risco", risk: "low" },
  },
  budget: {
    distribuir_meta_anual: { description: "Distribui meta anual por mês com sazonalidade aprendida", risk: "medium" },
    comparar_real_x_orcado:{ description: "Compara realizado vs orçado e apura variações", risk: "low" },
    alertar_estouro:       { description: "Alerta quando projeção supera meta em mais de 5%", risk: "low" },
    gerar_forecast_rolling:{ description: "Gera forecast rolling de 12 meses com dados históricos", risk: "low" },
    explicar_variacao:     { description: "Gera explicação textual das variações budget vs real", risk: "low" },
  },
  fiscal: {
    validar_nota_sefaz:    { description: "Valida NF-e/NFS-e na SEFAZ em tempo real", risk: "low" },
    calcular_impostos:     { description: "Calcula ICMS/PIS/COFINS/ISS para emissão", risk: "low" },
    gerar_dctf:            { description: "Prepara declaração DCTF para envio", risk: "high" },
    preparar_sped:         { description: "Consolida dados para geração do SPED Contábil/Fiscal", risk: "high" },
    alertar_vencimento_obrigacao:{ description: "Alerta vencimentos fiscais próximos (DARF, FGTS, etc.)", risk: "low" },
  },
  auditor: {
    detectar_duplicidade:  { description: "Detecta lançamentos duplicados por valor/data/fornecedor", risk: "low" },
    detectar_anomalia:     { description: "Detecta valores atípicos via Isolation Forest", risk: "low" },
    checar_compliance:     { description: "Verifica compliance com políticas internas e alçadas", risk: "low" },
    gerar_alerta_risco:    { description: "Gera alerta de risco com criticidade e ação recomendada", risk: "low" },
    preparar_trilha_auditoria:{ description: "Consolida trilha de auditoria de um período", risk: "low" },
  },
  conversational: {
    consultar_dados:       { description: "Consulta dados financeiros em linguagem natural (RAG)", risk: "low" },
    gerar_relatorio_adhoc: { description: "Gera relatório ad-hoc conforme pedido do usuário", risk: "low" },
    explicar_indicador:    { description: "Explica indicador financeiro com contexto da empresa", risk: "low" },
    executar_comando_via_chat:{ description: "Executa ação financeira via chat (N1/N2 mínimo)", risk: "medium" },
  },
};

// ─── Verificação de Guardrails ────────────────────────

async function checkGuardrails(
  supabase: ReturnType<typeof createClient>,
  req: AgentRequest,
  tool_name: string,
  amount?: number
): Promise<GuardrailResult> {
  // 1. Kill switch
  const { data: ks } = await supabase
    .from("agent_kill_switch")
    .select("is_paused, pause_reason")
    .eq("company_id", req.company_id)
    .single();

  if (ks?.is_paused) {
    return {
      allowed: false,
      effective_level: "N0_suggestion",
      reason: `Kill switch ativo: ${ks.pause_reason}`,
    };
  }

  // 2. Configuração de autonomia do agente
  const { data: config } = await supabase
    .from("agent_autonomy_config")
    .select("autonomy_level, is_enabled, max_amount_auto, max_amount_notify, auto_window_start, auto_window_end")
    .eq("company_id", req.company_id)
    .eq("agent_type", req.agent_type)
    .single();

  if (!config?.is_enabled) {
    return {
      allowed: false,
      effective_level: "N0_suggestion",
      reason: `Agente ${req.agent_type} desabilitado para esta empresa`,
    };
  }

  let effectiveLevel = (req.force_level ?? config.autonomy_level) as AutonomyLevel;

  // 3. Rebaixa nível se amount excede limite
  if (amount && effectiveLevel === "N3_autonomous" && amount > (config.max_amount_auto ?? 5000)) {
    effectiveLevel = "N2_notify";
  }
  if (amount && effectiveLevel !== "N0_suggestion" && amount > (config.max_amount_notify ?? 50000)) {
    effectiveLevel = "N0_suggestion";
  }

  // 4. Whitelist check para pagamentos
  if (tool_name === "agendar_pagamento" || tool_name === "gerar_cnab") {
    const counterparty_id = (req.context_json?.counterparty_id as string) ?? null;
    if (counterparty_id && amount) {
      const { data: wl } = await supabase.rpc("check_vendor_whitelist", {
        p_company_id: req.company_id,
        p_counterparty_id: counterparty_id,
        p_amount: amount,
      });
      if (!wl) {
        effectiveLevel = "N1_approval";
      }
    }
  }

  // 5. Dupla aprovação acima de R$100k
  const requiresDual = !!(amount && amount > 100000);

  return {
    allowed: true,
    effective_level: effectiveLevel,
    reason: `Nível ${effectiveLevel} aplicado${amount ? ` para R$${amount}` : ""}`,
    requires_dual_approval: requiresDual,
  };
}

// ─── Log de ação autônoma ─────────────────────────────

async function logAgentAction(
  supabase: ReturnType<typeof createClient>,
  params: {
    company_id: string;
    agent_type: AgentType;
    autonomy_level: AutonomyLevel;
    action_key: string;
    action_label: string;
    entity_type?: string;
    entity_id?: string;
    amount?: number;
    reason: string;
    confidence_pct?: number;
    status: string;
  }
) {
  await supabase.from("agent_action_log").insert({
    company_id:     params.company_id,
    agent_type:     params.agent_type,
    autonomy_level: params.autonomy_level,
    action_key:     params.action_key,
    action_label:   params.action_label,
    entity_type:    params.entity_type,
    entity_id:      params.entity_id,
    amount:         params.amount,
    reason:         params.reason,
    confidence_pct: params.confidence_pct,
    status:         params.status,
    triggered_by:   "agent",
  });
}

// ─── Execução de Tool com LLM ─────────────────────────

async function executeWithLLM(
  agent_type: AgentType,
  tool_name: string,
  context: Record<string, unknown>,
  company_context: Record<string, unknown>
): Promise<{ result: Record<string, unknown>; confidence: number; reason: string }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY") ?? Deno.env.get("OPENAI_API_KEY");
  const isAnthropic = !!Deno.env.get("ANTHROPIC_API_KEY");

  const systemPrompt = `Você é o Agente ${agent_type} de um sistema financeiro empresarial brasileiro.
Sua responsabilidade: executar a ação "${tool_name}" com máxima precisão.
Contexto da empresa: ${JSON.stringify(company_context)}

REGRAS:
1. Responda APENAS em JSON válido
2. Sempre inclua: { "success": bool, "result": {...}, "confidence": 0-100, "reason": "executei porque..." }
3. Reason deve explicar claramente o motivo da ação (para auditoria)
4. Se confiança < 80, sinalize para revisão humana`;

  const userPrompt = `Execute a ação "${tool_name}" com base neste contexto:
${JSON.stringify(context, null, 2)}

Retorne o resultado em JSON.`;

  try {
    let responseText = "";

    if (isAnthropic) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey!,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await response.json();
      responseText = data.content?.[0]?.text ?? "{}";
    } else {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 1000,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      });
      const data = await response.json();
      responseText = data.choices?.[0]?.message?.content ?? "{}";
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    return {
      result: parsed.result ?? parsed,
      confidence: parsed.confidence ?? 70,
      reason: parsed.reason ?? `Ação ${tool_name} executada pelo agente ${agent_type}`,
    };
  } catch (err) {
    return {
      result: { error: String(err) },
      confidence: 0,
      reason: `Erro ao executar ${tool_name}: ${String(err)}`,
    };
  }
}

// ─── Handler Principal ────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: AgentRequest & { tool_name: string; amount?: number } = await req.json();
    const { company_id, agent_type, trigger, context_json, tool_name, amount } = body;

    if (!company_id || !agent_type || !tool_name) {
      return new Response(
        JSON.stringify({ error: "company_id, agent_type e tool_name são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verifica se a tool existe para o agente
    const agentTools = AGENT_TOOLS[agent_type];
    if (!agentTools || !agentTools[tool_name]) {
      return new Response(
        JSON.stringify({ error: `Tool "${tool_name}" não existe para agente "${agent_type}"` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Verifica guardrails
    const guardrail = await checkGuardrails(supabase, { company_id, agent_type, trigger, context_json }, tool_name, amount);

    if (!guardrail.allowed) {
      await logAgentAction(supabase, {
        company_id, agent_type,
        autonomy_level: "N0_suggestion",
        action_key: tool_name,
        action_label: agentTools[tool_name].description,
        amount,
        reason: guardrail.reason,
        status: "failed",
      });
      return new Response(
        JSON.stringify({ allowed: false, reason: guardrail.reason }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const effectiveLevel = guardrail.effective_level;

    // ── N0: apenas sugere, não executa
    if (effectiveLevel === "N0_suggestion") {
      const { result, confidence, reason } = await executeWithLLM(
        agent_type, tool_name, context_json ?? {}, { company_id }
      );
      await logAgentAction(supabase, {
        company_id, agent_type,
        autonomy_level: "N0_suggestion",
        action_key: tool_name,
        action_label: agentTools[tool_name].description,
        amount, reason, confidence_pct: confidence,
        status: "pending_approval",
      });
      return new Response(
        JSON.stringify({ level: "N0_suggestion", suggestion: result, confidence, reason }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── N1: prepara e aguarda aprovação humana
    if (effectiveLevel === "N1_approval") {
      const { result, confidence, reason } = await executeWithLLM(
        agent_type, tool_name, context_json ?? {}, { company_id }
      );
      const { data: logRow } = await supabase.from("agent_action_log").insert({
        company_id, agent_type,
        autonomy_level: "N1_approval",
        action_key: tool_name,
        action_label: agentTools[tool_name].description,
        amount, reason, confidence_pct: confidence,
        status: "pending_approval",
        triggered_by: "agent",
      }).select("id").single();

      // Dupla aprovação para valores altos
      if (guardrail.requires_dual_approval && logRow?.id) {
        await supabase.from("agent_dual_approval").insert({
          company_id,
          action_log_id: logRow.id,
          amount: amount ?? 0,
          first_agent: agent_type,
        });
      }

      return new Response(
        JSON.stringify({
          level: "N1_approval",
          action_prepared: result,
          log_id: logRow?.id,
          confidence, reason,
          requires_dual_approval: guardrail.requires_dual_approval,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── N2 e N3: executa
    const { result, confidence, reason } = await executeWithLLM(
      agent_type, tool_name, context_json ?? {}, { company_id }
    );

    const status = effectiveLevel === "N2_notify" ? "executed" : "executed";

    await logAgentAction(supabase, {
      company_id, agent_type,
      autonomy_level: effectiveLevel,
      action_key: tool_name,
      action_label: agentTools[tool_name].description,
      amount, reason, confidence_pct: confidence,
      status,
    });

    // Atualiza métricas de drift
    await supabase.rpc("record_agent_action_result", {
      p_company_id: company_id,
      p_agent_type: agent_type,
      p_was_corrected: false,
      p_was_rejected: false,
    });

    return new Response(
      JSON.stringify({
        level: effectiveLevel,
        executed: true,
        result,
        confidence,
        reason,
        notify: effectiveLevel === "N2_notify",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
