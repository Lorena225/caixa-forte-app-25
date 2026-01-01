import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ReconciliationMatch {
  statement_line_id: string;
  transaction_id: string;
  score: number;
  match_type: "exact" | "fuzzy" | "suggested";
  match_details: {
    amount_match: boolean;
    date_diff_days: number;
    description_similarity: number;
  };
}

function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const aLower = a.toLowerCase().trim();
  const bLower = b.toLowerCase().trim();
  if (aLower === bLower) return 1;
  
  const maxLen = Math.max(aLower.length, bLower.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(aLower, bLower);
  return 1 - distance / maxLen;
}

function calculateMatchScore(
  statementLine: { amount: number; posted_date: string; description: string; direction: string },
  transaction: { amount: number; due_date: string; description: string; type: string }
): { score: number; details: { amount_match: boolean; date_diff_days: number; description_similarity: number } } {
  let score = 0;

  // Amount match (40% weight)
  const amountMatch = Math.abs(statementLine.amount - transaction.amount) < 0.01;
  if (amountMatch) {
    score += 40;
  } else {
    const amountDiff = Math.abs(statementLine.amount - transaction.amount) / Math.max(statementLine.amount, transaction.amount);
    if (amountDiff < 0.05) score += 30;
    else if (amountDiff < 0.1) score += 20;
  }

  // Date match (30% weight)
  const stmtDate = new Date(statementLine.posted_date);
  const txnDate = new Date(transaction.due_date);
  const dateDiffDays = Math.abs((stmtDate.getTime() - txnDate.getTime()) / (1000 * 60 * 60 * 24));
  
  if (dateDiffDays === 0) score += 30;
  else if (dateDiffDays <= 3) score += 25;
  else if (dateDiffDays <= 7) score += 15;
  else if (dateDiffDays <= 14) score += 5;

  // Description similarity (20% weight)
  const descSimilarity = stringSimilarity(statementLine.description || "", transaction.description || "");
  score += descSimilarity * 20;

  // Direction/Type match (10% weight)
  const isCredit = statementLine.direction === "credit";
  const isReceivable = transaction.type === "receivable";
  if ((isCredit && isReceivable) || (!isCredit && !isReceivable)) {
    score += 10;
  }

  return {
    score,
    details: {
      amount_match: amountMatch,
      date_diff_days: dateDiffDays,
      description_similarity: descSimilarity,
    },
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

    const { statement_id, company_id, wallet_id, auto_match_threshold = 85 } = await req.json();

    if (!company_id) {
      return new Response(
        JSON.stringify({ error: "company_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[reconcile-engine] Starting reconciliation for company ${company_id}`);

    // Get unreconciled statement lines
    let stmtQuery = supabase
      .from("bank_statement_lines")
      .select(`
        *,
        bank_statements!inner(company_id, wallet_id)
      `)
      .eq("bank_statements.company_id", company_id)
      .eq("is_reconciled", false);

    if (statement_id) {
      stmtQuery = stmtQuery.eq("statement_id", statement_id);
    }

    if (wallet_id) {
      stmtQuery = stmtQuery.eq("bank_statements.wallet_id", wallet_id);
    }

    const { data: statementLines, error: stmtError } = await stmtQuery;

    if (stmtError) {
      console.error("[reconcile-engine] Statement lines error:", stmtError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch statement lines" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[reconcile-engine] Found ${statementLines?.length || 0} unreconciled lines`);

    if (!statementLines || statementLines.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No unreconciled lines found",
          matches: [],
          auto_matched: 0,
          suggestions: 0,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get open transactions for matching
    const { data: transactions, error: txnError } = await supabase
      .from("transactions")
      .select("*")
      .eq("company_id", company_id)
      .is("paid_date", null)
      .in("status", ["open", "pending"]);

    if (txnError) {
      console.error("[reconcile-engine] Transactions error:", txnError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch transactions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[reconcile-engine] Found ${transactions?.length || 0} open transactions`);

    const matches: ReconciliationMatch[] = [];
    const autoMatches: ReconciliationMatch[] = [];
    const suggestions: ReconciliationMatch[] = [];

    // Match each statement line with transactions
    for (const line of statementLines) {
      const lineMatches: ReconciliationMatch[] = [];

      for (const txn of transactions || []) {
        const { score, details } = calculateMatchScore(
          {
            amount: line.amount,
            posted_date: line.posted_date,
            description: line.description || "",
            direction: line.direction,
          },
          {
            amount: txn.amount,
            due_date: txn.due_date,
            description: txn.description || "",
            type: txn.type,
          }
        );

        if (score >= 50) {
          const match: ReconciliationMatch = {
            statement_line_id: line.id,
            transaction_id: txn.id,
            score,
            match_type: score >= auto_match_threshold ? "exact" : score >= 70 ? "fuzzy" : "suggested",
            match_details: details,
          };
          lineMatches.push(match);
        }
      }

      // Sort by score and take best match
      lineMatches.sort((a, b) => b.score - a.score);
      if (lineMatches.length > 0) {
        const bestMatch = lineMatches[0];
        matches.push(bestMatch);

        if (bestMatch.score >= auto_match_threshold) {
          autoMatches.push(bestMatch);
        } else {
          suggestions.push(bestMatch);
        }
      }
    }

    console.log(`[reconcile-engine] Found ${autoMatches.length} auto-matches, ${suggestions.length} suggestions`);

    // Store suggestions in database
    if (suggestions.length > 0) {
      const suggestionsToInsert = suggestions.map(s => ({
        company_id,
        statement_line_id: s.statement_line_id,
        transaction_id: s.transaction_id,
        score: s.score,
        match_type: s.match_type,
        match_details_json: s.match_details,
        status: "pending",
      }));

      const { error: suggestError } = await supabase
        .from("reconciliation_suggestions")
        .upsert(suggestionsToInsert, {
          onConflict: "statement_line_id,transaction_id",
        });

      if (suggestError) {
        console.error("[reconcile-engine] Suggestion insert error:", suggestError);
      }
    }

    // Auto-apply high-confidence matches
    if (autoMatches.length > 0) {
      for (const match of autoMatches) {
        // Create reconciliation match record
        const { error: matchError } = await supabase
          .from("reconciliation_matches")
          .insert({
            company_id,
            statement_line_id: match.statement_line_id,
            transaction_id: match.transaction_id,
            match_type: "auto",
            confidence_score: match.score,
          });

        if (!matchError) {
          // Update statement line as reconciled
          await supabase
            .from("bank_statement_lines")
            .update({ is_reconciled: true, reconciled_at: new Date().toISOString() })
            .eq("id", match.statement_line_id);

          // Update transaction as paid
          const line = statementLines.find(l => l.id === match.statement_line_id);
          if (line) {
            await supabase
              .from("transactions")
              .update({
                status: "paid",
                paid_date: line.posted_date,
                paid_amount: line.amount,
              })
              .eq("id", match.transaction_id);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        total_lines: statementLines.length,
        auto_matched: autoMatches.length,
        suggestions: suggestions.length,
        unmatched: statementLines.length - matches.length,
        matches: matches.slice(0, 100), // Limit response size
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[reconcile-engine] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
