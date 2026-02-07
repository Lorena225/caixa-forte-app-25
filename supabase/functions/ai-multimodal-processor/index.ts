import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ProcessingRequest {
  company_id: string;
  input_type: "text" | "image" | "audio";
  content: string; // Base64 for image/audio, plain text for text
  phone_number?: string;
  connection_id?: string;
  context?: Record<string, unknown>;
}

interface ExtractionResult {
  date?: string;
  amount?: number;
  vendor?: string;
  vendor_cnpj?: string;
  items?: string[];
  category_suggestion?: string;
  confidence: number;
  reasoning: string;
  rules_applied: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: ProcessingRequest = await req.json();
    const { company_id, input_type, content, phone_number, connection_id, context } = body;

    if (!company_id || !input_type || !content) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: company_id, input_type, content" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[AI Multimodal] Processing ${input_type} for company ${company_id}`);

    let extractionResult: ExtractionResult;
    let inputSummary: string;

    // Process based on input type
    switch (input_type) {
      case "audio":
        // Simulate Whisper transcription
        const transcription = await processAudio(content);
        inputSummary = transcription.text;
        extractionResult = await extractIntentFromText(transcription.text, context);
        break;

      case "image":
        // Simulate Vision/OCR processing
        const ocrResult = await processImage(content);
        inputSummary = `Imagem: ${ocrResult.vendor || 'Documento'} - R$ ${ocrResult.amount || '?'}`;
        extractionResult = ocrResult;
        break;

      case "text":
      default:
        inputSummary = content.substring(0, 100);
        extractionResult = await extractIntentFromText(content, context);
        break;
    }

    // Determine category based on extracted data
    const categoryMapping = determineCategoryMapping(extractionResult);

    // Log the decision
    const { data: logData, error: logError } = await supabase
      .from("ai_decision_logs")
      .insert({
        company_id,
        decision_type: input_type === "image" ? "ocr" : input_type === "audio" ? "voice_intent" : "categorization",
        input_type,
        input_summary: inputSummary,
        extracted_data: extractionResult,
        reasoning: extractionResult.reasoning,
        confidence_score: extractionResult.confidence,
        rules_applied: extractionResult.rules_applied,
        final_action: "create_staged_transaction",
        phone_number,
      })
      .select()
      .single();

    if (logError) {
      console.error("[AI Multimodal] Error logging decision:", logError);
    }

    // Create staged transaction if we have enough confidence
    if (extractionResult.confidence >= 60 && extractionResult.amount) {
      const { data: stagedTx, error: stageError } = await supabase
        .from("ai_staged_transactions")
        .insert({
          company_id,
          source: input_type === "audio" ? "whatsapp_audio" : input_type === "image" ? "whatsapp_image" : "whatsapp_text",
          raw_input: inputSummary,
          parsed_data: extractionResult,
          suggested_amount: extractionResult.amount,
          suggested_date: extractionResult.date || new Date().toISOString().split("T")[0],
          suggested_description: buildDescription(extractionResult),
          suggested_type: "expense",
          ocr_confidence: extractionResult.confidence,
          status: "pending",
        })
        .select()
        .single();

      if (stageError) {
        console.error("[AI Multimodal] Error staging transaction:", stageError);
      }

      // Update or create inbox state
      if (phone_number) {
        await updateInboxState(supabase, company_id, phone_number, connection_id, {
          state: "awaiting_confirmation",
          pending_action: "create_transaction",
          pending_data: stagedTx,
          staged_tx_id: stagedTx?.id,
        });
      }

      // Build confirmation message
      const confirmationMessage = buildConfirmationMessage(extractionResult, categoryMapping);

      return new Response(
        JSON.stringify({
          success: true,
          requires_confirmation: true,
          message: confirmationMessage,
          staged_transaction_id: stagedTx?.id,
          decision_log_id: logData?.id,
          extraction: extractionResult,
          category_suggestion: categoryMapping,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Low confidence - ask for clarification
    return new Response(
      JSON.stringify({
        success: true,
        requires_confirmation: true,
        message: "Não consegui entender completamente. Pode me dar mais detalhes?",
        confidence: extractionResult.confidence,
        partial_extraction: extractionResult,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[AI Multimodal] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Simulate audio transcription (Whisper)
async function processAudio(base64Audio: string): Promise<{ text: string; language: string }> {
  // In production, this would call OpenAI Whisper API
  // For now, simulate common patterns
  const commonPatterns = [
    { pattern: /paguei|gastei|comprei/i, category: "expense" },
    { pattern: /recebi|entrou|depositaram/i, category: "income" },
  ];
  
  // Simulated transcription based on typical voice inputs
  return {
    text: "Paguei cem reais de almoço no restaurante",
    language: "pt-BR",
  };
}

// Simulate image OCR/Vision processing
async function processImage(base64Image: string): Promise<ExtractionResult> {
  // In production, this would call OpenAI Vision or Google Cloud Vision API
  // Simulate common receipt/invoice data extraction
  
  const simulatedOCR: ExtractionResult = {
    date: new Date().toISOString().split("T")[0],
    amount: 150.00,
    vendor: "Posto Shell",
    vendor_cnpj: "33.000.167/1234-56",
    items: ["Gasolina Comum - 30L"],
    category_suggestion: "Combustível",
    confidence: 87,
    reasoning: "Identificado como posto de combustível pelo nome 'Shell' e item 'Gasolina'. CNPJ validado.",
    rules_applied: [
      "vendor_name_match:shell->combustivel",
      "item_keyword:gasolina->combustivel",
      "cnpj_sector:posto_combustivel"
    ],
  };

  return simulatedOCR;
}

// Extract intent from text
async function extractIntentFromText(text: string, context?: Record<string, unknown>): Promise<ExtractionResult> {
  const lowerText = text.toLowerCase();
  
  // Amount extraction
  const amountMatch = lowerText.match(/r?\$?\s*(\d+(?:[.,]\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : null;

  // Category inference based on keywords
  const categoryRules: Array<{ keywords: string[]; category: string; priority: number }> = [
    { keywords: ["uber", "99", "taxi", "corrida"], category: "Transporte", priority: 1 },
    { keywords: ["almoço", "jantar", "restaurante", "comida", "lanche"], category: "Alimentação", priority: 1 },
    { keywords: ["gasolina", "combustível", "posto", "etanol"], category: "Combustível", priority: 1 },
    { keywords: ["mercado", "supermercado", "compras"], category: "Mercado", priority: 1 },
    { keywords: ["luz", "energia", "cemig", "enel"], category: "Energia Elétrica", priority: 1 },
    { keywords: ["água", "copasa", "sabesp"], category: "Água", priority: 1 },
    { keywords: ["internet", "vivo", "claro", "tim", "oi"], category: "Telecomunicações", priority: 1 },
    { keywords: ["farmácia", "remédio", "medicamento"], category: "Saúde", priority: 1 },
    { keywords: ["material", "escritório", "papelaria"], category: "Material de Escritório", priority: 2 },
  ];

  let matchedCategory = "Outros";
  let confidence = 50;
  const appliedRules: string[] = [];

  for (const rule of categoryRules) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword)) {
        matchedCategory = rule.category;
        confidence = 80 + (rule.priority === 1 ? 10 : 0);
        appliedRules.push(`keyword_match:${keyword}->${rule.category}`);
        break;
      }
    }
    if (appliedRules.length > 0) break;
  }

  // Boost confidence if amount is present
  if (amount) {
    confidence = Math.min(confidence + 10, 95);
    appliedRules.push(`amount_extracted:${amount}`);
  }

  // Generate reasoning
  const reasoning = appliedRules.length > 0
    ? `Classifiquei como ${matchedCategory} porque ${appliedRules.map(r => {
        const [type, detail] = r.split(":");
        if (type === "keyword_match") {
          const [keyword, cat] = detail.split("->");
          return `encontrei a palavra '${keyword}'`;
        }
        if (type === "amount_extracted") {
          return `o valor é R$ ${detail}`;
        }
        return r;
      }).join(" e ")}.`
    : "Não encontrei padrões claros para classificar esta transação.";

  return {
    amount: amount || undefined,
    category_suggestion: matchedCategory,
    confidence,
    reasoning,
    rules_applied: appliedRules,
  };
}

// Determine category mapping
function determineCategoryMapping(extraction: ExtractionResult): { category: string; account: string } {
  const categoryToAccount: Record<string, string> = {
    "Alimentação": "Despesas com Alimentação",
    "Transporte": "Despesas com Transporte",
    "Combustível": "Despesas com Veículos",
    "Mercado": "Despesas com Alimentação",
    "Energia Elétrica": "Despesas com Utilidades",
    "Água": "Despesas com Utilidades",
    "Telecomunicações": "Despesas com Comunicação",
    "Saúde": "Despesas com Saúde",
    "Material de Escritório": "Despesas Administrativas",
    "Outros": "Outras Despesas",
  };

  return {
    category: extraction.category_suggestion || "Outros",
    account: categoryToAccount[extraction.category_suggestion || "Outros"] || "Outras Despesas",
  };
}

// Build description from extraction
function buildDescription(extraction: ExtractionResult): string {
  const parts: string[] = [];
  
  if (extraction.vendor) parts.push(extraction.vendor);
  if (extraction.items && extraction.items.length > 0) {
    parts.push(extraction.items.slice(0, 2).join(", "));
  }
  if (extraction.category_suggestion && parts.length === 0) {
    parts.push(extraction.category_suggestion);
  }
  
  return parts.join(" - ") || "Transação via IA";
}

// Build confirmation message
function buildConfirmationMessage(extraction: ExtractionResult, category: { category: string; account: string }): string {
  const parts: string[] = [];
  
  if (extraction.vendor) {
    parts.push(`no ${extraction.vendor}`);
  }
  
  const amount = extraction.amount 
    ? `R$ ${extraction.amount.toFixed(2).replace(".", ",")}` 
    : "valor não identificado";
  
  return `📝 Li uma despesa de ${amount}${parts.length > 0 ? " " + parts.join(" ") : ""}. Posso lançar em "${category.category}"?

Responda:
✅ *Sim* - para confirmar
❌ *Não* - para cancelar
✏️ *Categoria X* - para mudar a categoria`;
}

// Update inbox conversation state
async function updateInboxState(
  supabase: any,
  companyId: string,
  phoneNumber: string,
  connectionId: string | undefined,
  stateData: {
    state: string;
    pending_action: string;
    pending_data: any;
    staged_tx_id?: string;
  }
) {
  // Check if inbox exists
  const { data: existing } = await supabase
    .from("ai_inbox")
    .select("id")
    .eq("company_id", companyId)
    .eq("phone_number", phoneNumber)
    .single();

  if (existing) {
    await supabase
      .from("ai_inbox")
      .update({
        conversation_state: stateData.state,
        pending_action: { type: stateData.pending_action, staged_tx_id: stateData.staged_tx_id },
        pending_entity_data: stateData.pending_data,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    await supabase
      .from("ai_inbox")
      .insert({
        company_id: companyId,
        phone_number: phoneNumber,
        connection_id: connectionId || null,
        conversation_state: stateData.state,
        pending_action: { type: stateData.pending_action, staged_tx_id: stateData.staged_tx_id },
        pending_entity_data: stateData.pending_data,
      });
  }
}
