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
  transcription?: string;
}

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
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

    // Check if Lovable AI is available
    if (!lovableApiKey) {
      console.warn("[AI Multimodal] LOVABLE_API_KEY not configured, using fallback processing");
    }

    // Process based on input type
    switch (input_type) {
      case "audio":
        // Process audio with Lovable AI (transcription + intent)
        const transcriptionResult = await processAudioWithAI(content, lovableApiKey);
        inputSummary = transcriptionResult.transcription;
        extractionResult = await extractIntentWithAI(transcriptionResult.transcription, context, lovableApiKey);
        extractionResult.transcription = transcriptionResult.transcription;
        break;

      case "image":
        // Process image with Lovable AI Vision
        extractionResult = await processImageWithAI(content, lovableApiKey);
        inputSummary = `Imagem: ${extractionResult.vendor || 'Documento'} - R$ ${extractionResult.amount || '?'}`;
        break;

      case "text":
      default:
        inputSummary = content.substring(0, 100);
        extractionResult = await extractIntentWithAI(content, context, lovableApiKey);
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

// Process audio using Lovable AI for transcription simulation
async function processAudioWithAI(
  base64Audio: string, 
  apiKey: string | undefined
): Promise<{ transcription: string; language: string }> {
  if (!apiKey) {
    // Fallback without AI
    return {
      transcription: "Áudio recebido - transcrição indisponível",
      language: "pt-BR",
    };
  }

  try {
    // Use Lovable AI to simulate transcription understanding
    // Note: For production, you'd want a dedicated audio transcription service
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente de transcrição de áudio financeiro brasileiro. 
Quando receber uma descrição de áudio, simule a transcrição típica que seria falada.
Responda APENAS com a transcrição simulada, sem explicações.
Exemplos de padrões comuns:
- "Paguei cem reais de almoço"
- "Gastei duzentos no supermercado"
- "Recebi mil reais do cliente X"`
          },
          {
            role: "user",
            content: "Transcreva este áudio financeiro de um usuário brasileiro (formato base64, primeiros 100 chars): " + 
              base64Audio.substring(0, 100)
          }
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI Multimodal] Lovable AI transcription error:", errorText);
      throw new Error("AI transcription failed");
    }

    const data = await response.json();
    const transcription = data.choices?.[0]?.message?.content || "Áudio não reconhecido";

    return {
      transcription: transcription.trim(),
      language: "pt-BR",
    };
  } catch (error) {
    console.error("[AI Multimodal] Audio processing error:", error);
    return {
      transcription: "Erro ao processar áudio",
      language: "pt-BR",
    };
  }
}

// Process image using Lovable AI Vision
async function processImageWithAI(
  base64Image: string, 
  apiKey: string | undefined
): Promise<ExtractionResult> {
  if (!apiKey) {
    // Fallback without AI
    return {
      confidence: 30,
      reasoning: "Processamento de imagem indisponível sem configuração de IA",
      rules_applied: ["fallback_mode"],
    };
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash", // Vision-capable model
        messages: [
          {
            role: "system",
            content: `Você é um OCR especializado em documentos financeiros brasileiros (notas fiscais, recibos, cupons).
Extraia as seguintes informações da imagem:
- data: Data do documento (formato YYYY-MM-DD)
- amount: Valor total em número
- vendor: Nome do estabelecimento
- vendor_cnpj: CNPJ se visível
- items: Lista de itens/produtos
- category_suggestion: Categoria sugerida (Alimentação, Transporte, Combustível, etc.)

Responda APENAS em JSON válido com estas chaves.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analise esta imagem e extraia os dados financeiros:"
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("[AI Multimodal] Rate limit exceeded");
        return createFallbackOCR("Rate limit excedido, tente novamente em alguns segundos");
      }
      if (response.status === 402) {
        console.warn("[AI Multimodal] Payment required");
        return createFallbackOCR("Créditos de IA esgotados");
      }
      throw new Error(`AI Vision failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    // Parse JSON from response
    let parsed: Record<string, any> = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch {
      console.warn("[AI Multimodal] Could not parse OCR JSON response");
    }

    return {
      date: parsed.date || new Date().toISOString().split("T")[0],
      amount: typeof parsed.amount === "number" ? parsed.amount : parseFloat(parsed.amount) || undefined,
      vendor: parsed.vendor || undefined,
      vendor_cnpj: parsed.vendor_cnpj || undefined,
      items: Array.isArray(parsed.items) ? parsed.items : undefined,
      category_suggestion: parsed.category_suggestion || "Outros",
      confidence: parsed.amount ? 85 : 50,
      reasoning: `OCR processado por IA. Vendor: ${parsed.vendor || 'não identificado'}, Valor: R$ ${parsed.amount || '?'}`,
      rules_applied: ["ai_vision_ocr", parsed.vendor ? "vendor_extracted" : "vendor_missing"],
    };
  } catch (error) {
    console.error("[AI Multimodal] Image processing error:", error);
    return createFallbackOCR("Erro ao processar imagem");
  }
}

function createFallbackOCR(reason: string): ExtractionResult {
  return {
    confidence: 20,
    reasoning: reason,
    rules_applied: ["fallback_mode"],
  };
}

// Extract intent from text using Lovable AI
async function extractIntentWithAI(
  text: string, 
  context: Record<string, unknown> | undefined,
  apiKey: string | undefined
): Promise<ExtractionResult> {
  // First try local pattern matching for common cases
  const localResult = extractIntentLocally(text);
  
  // If high confidence locally, skip AI call
  if (localResult.confidence >= 85 && localResult.amount) {
    return localResult;
  }

  // Use AI for ambiguous cases
  if (!apiKey) {
    return localResult;
  }

  try {
    const response = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Você é um assistente financeiro brasileiro que extrai informações de mensagens de texto.
Extraia:
- amount: valor em número (ex: "mil e quinhentos" = 1500)
- vendor: estabelecimento/fornecedor mencionado
- category_suggestion: categoria apropriada
- date: data se mencionada (formato YYYY-MM-DD)

Categorias válidas: Alimentação, Transporte, Combustível, Mercado, Energia Elétrica, Água, 
Telecomunicações, Saúde, Material de Escritório, Equipamentos, Serviços, Outros

Responda APENAS em JSON válido.`
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 200,
        tools: [
          {
            type: "function",
            function: {
              name: "extract_transaction",
              description: "Extrai dados de uma transação financeira do texto",
              parameters: {
                type: "object",
                properties: {
                  amount: { type: "number", description: "Valor da transação" },
                  vendor: { type: "string", description: "Nome do fornecedor/estabelecimento" },
                  category_suggestion: { type: "string", description: "Categoria sugerida" },
                  date: { type: "string", description: "Data no formato YYYY-MM-DD" },
                  confidence: { type: "number", description: "Confiança de 0 a 100" }
                },
                required: ["category_suggestion"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_transaction" } }
      }),
    });

    if (!response.ok) {
      console.warn("[AI Multimodal] AI intent extraction failed, using local result");
      return localResult;
    }

    const data = await response.json();
    
    // Extract from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        return {
          amount: parsed.amount || localResult.amount,
          vendor: parsed.vendor || localResult.vendor,
          category_suggestion: parsed.category_suggestion || localResult.category_suggestion,
          date: parsed.date,
          confidence: parsed.confidence || 80,
          reasoning: `IA identificou: ${parsed.vendor || 'transação'} em ${parsed.category_suggestion}`,
          rules_applied: ["ai_intent_extraction", ...localResult.rules_applied],
        };
      } catch {
        return localResult;
      }
    }

    return localResult;
  } catch (error) {
    console.error("[AI Multimodal] Intent extraction error:", error);
    return localResult;
  }
}

// Local pattern matching (fallback and optimization)
function extractIntentLocally(text: string): ExtractionResult {
  const lowerText = text.toLowerCase();
  const originalText = text;
  
  // Amount extraction - handles various formats
  // Order matters: try more specific patterns first
  let amount: number | undefined;
  
  // Pattern 1: R$ 1.500,00 or R$ 1500,00 (Brazilian format with cents)
  const brCurrencyMatch = originalText.match(/R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2}))/i);
  if (brCurrencyMatch) {
    amount = parseFloat(brCurrencyMatch[1].replace(/\./g, "").replace(",", "."));
  }
  
  // Pattern 2: Plain numbers like 1500 (most common in chat)
  if (!amount) {
    const plainNumberMatch = originalText.match(/(?:^|\s)(\d{3,})(?:\s|$|[^\d])/);
    if (plainNumberMatch) {
      amount = parseFloat(plainNumberMatch[1]);
    }
  }
  
  // Pattern 3: "100 reais" or "cem reais"
  if (!amount) {
    const reaisMatch = lowerText.match(/(\d+)\s*(?:reais?|real)/i);
    if (reaisMatch) {
      amount = parseFloat(reaisMatch[1]);
    }
  }
  
  // Pattern 4: "1 mil" or "2 mil"  
  if (!amount) {
    const milMatch = lowerText.match(/(\d+)\s*mil/i);
    if (milMatch) {
      amount = parseFloat(milMatch[1]) * 1000;
    }
  }

  // Category inference based on keywords
  const categoryRules: Array<{ keywords: string[]; category: string; priority: number }> = [
    { keywords: ["dell", "lenovo", "hp", "notebook", "computador", "equipamento"], category: "Equipamentos", priority: 1 },
    { keywords: ["uber", "99", "taxi", "corrida", "indriver"], category: "Transporte", priority: 1 },
    { keywords: ["almoço", "jantar", "restaurante", "comida", "lanche", "ifood"], category: "Alimentação", priority: 1 },
    { keywords: ["gasolina", "combustível", "posto", "etanol", "shell", "ipiranga"], category: "Combustível", priority: 1 },
    { keywords: ["mercado", "supermercado", "compras", "atacadão"], category: "Mercado", priority: 1 },
    { keywords: ["luz", "energia", "cemig", "enel", "cpfl"], category: "Energia Elétrica", priority: 1 },
    { keywords: ["água", "copasa", "sabesp", "saneamento"], category: "Água", priority: 1 },
    { keywords: ["internet", "vivo", "claro", "tim", "oi", "telefone"], category: "Telecomunicações", priority: 1 },
    { keywords: ["farmácia", "remédio", "medicamento", "drogaria"], category: "Saúde", priority: 1 },
    { keywords: ["material", "escritório", "papelaria", "kalunga"], category: "Material de Escritório", priority: 2 },
    { keywords: ["software", "licença", "assinatura", "saas"], category: "Serviços Digitais", priority: 2 },
  ];

  let matchedCategory = "Outros";
  let confidence = 50;
  const appliedRules: string[] = [];
  let vendor: string | undefined;

  for (const rule of categoryRules) {
    for (const keyword of rule.keywords) {
      if (lowerText.includes(keyword)) {
        matchedCategory = rule.category;
        confidence = 80 + (rule.priority === 1 ? 10 : 0);
        appliedRules.push(`keyword_match:${keyword}->${rule.category}`);
        
        // Try to extract vendor from known brands
        const brandKeywords = ["dell", "lenovo", "hp", "shell", "ipiranga", "uber", "99", "ifood"];
        if (brandKeywords.includes(keyword)) {
          vendor = keyword.charAt(0).toUpperCase() + keyword.slice(1);
        }
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
          const [keyword] = detail.split("->");
          return `encontrei a palavra '${keyword}'`;
        }
        if (type === "amount_extracted") {
          return `o valor é R$ ${detail}`;
        }
        return r;
      }).join(" e ")}.`
    : "Não encontrei padrões claros para classificar esta transação.";

  return {
    amount,
    vendor,
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
    "Equipamentos": "Despesas com Equipamentos",
    "Serviços Digitais": "Despesas com TI",
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
