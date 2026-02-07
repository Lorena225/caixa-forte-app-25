import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface BriefingContent {
  balance: {
    total: number;
    accounts: Array<{ name: string; balance: number }>;
  };
  bills_today: {
    count: number;
    total: number;
    items: Array<{ description: string; amount: number; counterparty: string }>;
  };
  overdue: {
    count: number;
    total: number;
  };
  anomalies: {
    count: number;
    items: Array<{ title: string; severity: string }>;
  };
  forecast?: {
    next_7_days: number;
    trend: "up" | "down" | "stable";
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const { company_id, force_generate } = body;

    console.log(`[Morning Briefing] Starting for company: ${company_id || "all"}`);

    // Get companies with briefing enabled
    let companiesQuery = supabase
      .from("ai_morning_briefings")
      .select("*, companies!inner(id, trade_name)")
      .eq("enabled", true);

    if (company_id) {
      companiesQuery = companiesQuery.eq("company_id", company_id);
    }

    const { data: briefingConfigs, error: configError } = await companiesQuery;

    if (configError) {
      console.error("[Morning Briefing] Error fetching configs:", configError);
      throw configError;
    }

    if (!briefingConfigs || briefingConfigs.length === 0) {
      return new Response(
        JSON.stringify({ message: "No briefing configs found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: Array<{ company_id: string; status: string; briefing?: any }> = [];

    for (const config of briefingConfigs) {
      const companyId = config.company_id;
      
      // Check if already sent today (unless forced)
      if (!force_generate && config.last_sent_at) {
        const lastSent = new Date(config.last_sent_at);
        const today = new Date();
        if (
          lastSent.getDate() === today.getDate() &&
          lastSent.getMonth() === today.getMonth() &&
          lastSent.getFullYear() === today.getFullYear()
        ) {
          console.log(`[Morning Briefing] Already sent today for company ${companyId}`);
          results.push({ company_id: companyId, status: "already_sent" });
          continue;
        }
      }

      try {
        // Generate briefing content
        const briefingContent = await generateBriefingContent(supabase, companyId, config);

        // Save to history
        const { error: historyError } = await supabase
          .from("ai_briefing_history")
          .insert({
            company_id: companyId,
            briefing_date: new Date().toISOString().split("T")[0],
            content_json: briefingContent,
            balance_snapshot: briefingContent.balance.total,
            bills_today_count: briefingContent.bills_today.count,
            bills_today_total: briefingContent.bills_today.total,
            anomalies_count: briefingContent.anomalies.count,
            delivered_to: config.delivery_channels || ["dashboard"],
          });

        if (historyError) {
          console.error("[Morning Briefing] Error saving history:", historyError);
        }

        // Update last_sent_at
        await supabase
          .from("ai_morning_briefings")
          .update({ last_sent_at: new Date().toISOString() })
          .eq("company_id", companyId);

        // Create insight for dashboard
        await createBriefingInsight(supabase, companyId, briefingContent);

        // TODO: Send to WhatsApp if enabled
        // TODO: Send email if enabled

        results.push({ 
          company_id: companyId, 
          status: "success",
          briefing: briefingContent 
        });

        console.log(`[Morning Briefing] Generated successfully for company ${companyId}`);

      } catch (err) {
        console.error(`[Morning Briefing] Error for company ${companyId}:`, err);
        results.push({ company_id: companyId, status: "error" });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Morning Briefing] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function generateBriefingContent(supabase: any, companyId: string, config: any): Promise<BriefingContent> {
  const today = new Date().toISOString().split("T")[0];

  // Get current balance (simplified - sum of bank accounts)
  const { data: accounts } = await supabase
    .from("bank_accounts")
    .select("id, account_name, balance")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const balanceTotal = accounts?.reduce((sum: number, acc: any) => sum + (acc.balance || 0), 0) || 0;

  // Get bills due today
  const { data: billsToday } = await supabase
    .from("transactions")
    .select("id, description, total_amount, counterparty:counterparties(trade_name)")
    .eq("company_id", companyId)
    .eq("direction", "outbound")
    .eq("due_date", today)
    .eq("status", "pending");

  // Get overdue bills
  const { data: overdueCount } = await supabase
    .from("transactions")
    .select("id, total_amount", { count: "exact" })
    .eq("company_id", companyId)
    .eq("direction", "outbound")
    .lt("due_date", today)
    .eq("status", "pending");

  // Get active anomalies
  const { data: anomalies } = await supabase
    .from("ai_insights")
    .select("id, title, severity")
    .eq("company_id", companyId)
    .eq("insight_type", "anomaly")
    .eq("is_dismissed", false)
    .limit(5);

  const briefing: BriefingContent = {
    balance: {
      total: balanceTotal,
      accounts: accounts?.map((acc: any) => ({
        name: acc.account_name,
        balance: acc.balance || 0,
      })) || [],
    },
    bills_today: {
      count: billsToday?.length || 0,
      total: billsToday?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0,
      items: billsToday?.slice(0, 5).map((b: any) => ({
        description: b.description,
        amount: b.total_amount,
        counterparty: b.counterparty?.trade_name || "N/A",
      })) || [],
    },
    overdue: {
      count: overdueCount?.length || 0,
      total: overdueCount?.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0) || 0,
    },
    anomalies: {
      count: anomalies?.length || 0,
      items: anomalies?.map((a: any) => ({
        title: a.title,
        severity: a.severity,
      })) || [],
    },
  };

  // Add forecast if enabled
  if (config.include_forecast) {
    briefing.forecast = {
      next_7_days: balanceTotal * 0.95, // Simplified projection
      trend: "stable",
    };
  }

  return briefing;
}

async function createBriefingInsight(supabase: any, companyId: string, content: BriefingContent) {
  // Build insight message
  const parts: string[] = [];

  // Balance
  const formattedBalance = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(content.balance.total);
  parts.push(`💰 Saldo atual: ${formattedBalance}`);

  // Bills today
  if (content.bills_today.count > 0) {
    const formattedBills = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(content.bills_today.total);
    parts.push(`📅 ${content.bills_today.count} conta(s) a pagar hoje: ${formattedBills}`);
  }

  // Overdue
  if (content.overdue.count > 0) {
    parts.push(`⚠️ ${content.overdue.count} conta(s) vencida(s)`);
  }

  // Anomalies
  if (content.anomalies.count > 0) {
    parts.push(`🔍 ${content.anomalies.count} anomalia(s) detectada(s)`);
  }

  const description = parts.join("\n");

  // Create or update today's briefing insight
  const today = new Date().toISOString().split("T")[0];
  
  const { data: existingInsight } = await supabase
    .from("ai_insights")
    .select("id")
    .eq("company_id", companyId)
    .eq("insight_type", "briefing")
    .gte("created_at", today)
    .single();

  if (existingInsight) {
    await supabase
      .from("ai_insights")
      .update({
        title: `☀️ Bom dia! Seu resumo financeiro de hoje`,
        description,
        data_json: content,
        severity: content.overdue.count > 0 || content.anomalies.count > 0 ? "warning" : "info",
      })
      .eq("id", existingInsight.id);
  } else {
    await supabase
      .from("ai_insights")
      .insert({
        company_id: companyId,
        insight_type: "briefing",
        title: `☀️ Bom dia! Seu resumo financeiro de hoje`,
        description,
        data_json: content,
        severity: content.overdue.count > 0 || content.anomalies.count > 0 ? "warning" : "info",
        suggested_action: content.bills_today.count > 0 
          ? `Você tem ${content.bills_today.count} conta(s) para pagar. Acesse Contas a Pagar.`
          : null,
      });
  }
}
