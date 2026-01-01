import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface StatementTransaction {
  posted_date: string;
  description: string;
  amount: number;
  direction: "credit" | "debit";
  fit_id?: string;
  reference_number?: string;
  balance?: number;
}

interface ParseResult {
  format: string;
  bank_code?: string;
  account_number?: string;
  period_start?: string;
  period_end?: string;
  opening_balance?: number;
  closing_balance?: number;
  transactions: StatementTransaction[];
  total_credits: number;
  total_debits: number;
}

function parseOFX(content: string): ParseResult {
  const lines = content.split("\n");
  const transactions: StatementTransaction[] = [];
  
  let bankCode = "";
  let accountNumber = "";
  let periodStart = "";
  let periodEnd = "";
  let openingBalance = 0;
  let closingBalance = 0;
  
  // Extract bank info
  const bankIdMatch = content.match(/<BANKID>(\d+)/);
  if (bankIdMatch) bankCode = bankIdMatch[1];
  
  const acctIdMatch = content.match(/<ACCTID>([^<\n]+)/);
  if (acctIdMatch) accountNumber = acctIdMatch[1].trim();
  
  // Extract period
  const dtStartMatch = content.match(/<DTSTART>(\d{8})/);
  if (dtStartMatch) {
    const d = dtStartMatch[1];
    periodStart = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  }
  
  const dtEndMatch = content.match(/<DTEND>(\d{8})/);
  if (dtEndMatch) {
    const d = dtEndMatch[1];
    periodEnd = `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
  }
  
  // Extract balances
  const balAmtMatch = content.match(/<BALAMT>([+-]?\d+\.?\d*)/);
  if (balAmtMatch) closingBalance = parseFloat(balAmtMatch[1]);
  
  // Parse transactions
  const stmtTrnBlocks = content.split(/<STMTTRN>/);
  for (let i = 1; i < stmtTrnBlocks.length; i++) {
    const block = stmtTrnBlocks[i];
    const endIdx = block.indexOf("</STMTTRN>");
    const trnContent = endIdx > 0 ? block.slice(0, endIdx) : block;
    
    const trnTypeMatch = trnContent.match(/<TRNTYPE>([^<\n]+)/);
    const dtPostedMatch = trnContent.match(/<DTPOSTED>(\d{8})/);
    const trnAmtMatch = trnContent.match(/<TRNAMT>([+-]?\d+\.?\d*)/);
    const fitIdMatch = trnContent.match(/<FITID>([^<\n]+)/);
    const memoMatch = trnContent.match(/<MEMO>([^<\n]+)/);
    const nameMatch = trnContent.match(/<NAME>([^<\n]+)/);
    
    if (dtPostedMatch && trnAmtMatch) {
      const d = dtPostedMatch[1];
      const amount = parseFloat(trnAmtMatch[1]);
      
      transactions.push({
        posted_date: `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`,
        description: (memoMatch?.[1] || nameMatch?.[1] || "").trim(),
        amount: Math.abs(amount),
        direction: amount >= 0 ? "credit" : "debit",
        fit_id: fitIdMatch?.[1]?.trim(),
      });
    }
  }
  
  const totalCredits = transactions.filter(t => t.direction === "credit").reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.direction === "debit").reduce((sum, t) => sum + t.amount, 0);
  
  return {
    format: "OFX",
    bank_code: bankCode,
    account_number: accountNumber,
    period_start: periodStart,
    period_end: periodEnd,
    opening_balance: openingBalance,
    closing_balance: closingBalance,
    transactions,
    total_credits: totalCredits,
    total_debits: totalDebits,
  };
}

function parseCSV(content: string): ParseResult {
  const lines = content.trim().split("\n");
  const transactions: StatementTransaction[] = [];
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(/[,;]/);
    if (cols.length >= 3) {
      // Try to detect date, description, amount columns
      let date = "";
      let description = "";
      let amount = 0;
      
      for (const col of cols) {
        const trimmed = col.trim().replace(/"/g, "");
        
        // Check if it's a date
        const dateMatch = trimmed.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (dateMatch && !date) {
          const [_, d, m, y] = dateMatch;
          const year = y.length === 2 ? `20${y}` : y;
          date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
          continue;
        }
        
        // Check if it's a number
        const numVal = parseFloat(trimmed.replace(/[^\\d,.-]/g, "").replace(",", "."));
        if (!isNaN(numVal) && trimmed.match(/\d/)) {
          amount = numVal;
          continue;
        }
        
        // Otherwise it's description
        if (trimmed.length > 2 && !description) {
          description = trimmed;
        }
      }
      
      if (date && amount !== 0) {
        transactions.push({
          posted_date: date,
          description,
          amount: Math.abs(amount),
          direction: amount >= 0 ? "credit" : "debit",
        });
      }
    }
  }
  
  const totalCredits = transactions.filter(t => t.direction === "credit").reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = transactions.filter(t => t.direction === "debit").reduce((sum, t) => sum + t.amount, 0);
  
  let periodStart = "";
  let periodEnd = "";
  if (transactions.length > 0) {
    const dates = transactions.map(t => t.posted_date).sort();
    periodStart = dates[0];
    periodEnd = dates[dates.length - 1];
  }
  
  return {
    format: "CSV",
    period_start: periodStart,
    period_end: periodEnd,
    transactions,
    total_credits: totalCredits,
    total_debits: totalDebits,
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

    const { file_id, company_id, wallet_id } = await req.json();

    if (!file_id || !company_id) {
      return new Response(
        JSON.stringify({ error: "file_id and company_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[ai-parse-statement-file] Processing file ${file_id} for company ${company_id}`);

    // Get file from received_files
    const { data: fileRecord, error: fileError } = await supabase
      .from("received_files")
      .select("*")
      .eq("id", file_id)
      .eq("company_id", company_id)
      .single();

    if (fileError || !fileRecord) {
      console.error("[ai-parse-statement-file] File not found:", fileError);
      return new Response(
        JSON.stringify({ error: "File not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Download file content from storage
    const { data: fileContent, error: downloadError } = await supabase.storage
      .from("whatsapp-files")
      .download(fileRecord.storage_path);

    if (downloadError || !fileContent) {
      console.error("[ai-parse-statement-file] Download error:", downloadError);
      return new Response(
        JSON.stringify({ error: "Failed to download file" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const content = await fileContent.text();
    let parseResult: ParseResult;

    // Detect format and parse
    const fileName = fileRecord.original_filename?.toLowerCase() || "";
    const mimeType = fileRecord.mime_type || "";

    if (fileName.endsWith(".ofx") || content.includes("<OFX>") || content.includes("OFXHEADER")) {
      parseResult = parseOFX(content);
    } else if (fileName.endsWith(".csv") || mimeType.includes("csv")) {
      parseResult = parseCSV(content);
    } else {
      // Try OFX first, then CSV
      if (content.includes("<OFX>") || content.includes("OFXHEADER")) {
        parseResult = parseOFX(content);
      } else {
        parseResult = parseCSV(content);
      }
    }

    console.log(`[ai-parse-statement-file] Parsed ${parseResult.transactions.length} transactions`);

    // Create bank_statement_import record
    const { data: importRecord, error: importError } = await supabase
      .from("bank_statement_imports")
      .insert({
        company_id,
        file_id,
        wallet_id,
        original_filename: fileRecord.original_filename,
        file_format: parseResult.format,
        source: "whatsapp",
        status: "parsed",
        period_start: parseResult.period_start,
        period_end: parseResult.period_end,
        opening_balance: parseResult.opening_balance,
        closing_balance: parseResult.closing_balance,
        total_credits: parseResult.total_credits,
        total_debits: parseResult.total_debits,
        line_count: parseResult.transactions.length,
        summary_json: {
          bank_code: parseResult.bank_code,
          account_number: parseResult.account_number,
        },
      })
      .select()
      .single();

    if (importError) {
      console.error("[ai-parse-statement-file] Import record error:", importError);
      return new Response(
        JSON.stringify({ error: "Failed to create import record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create bank_statement and lines
    const { data: statement, error: stmtError } = await supabase
      .from("bank_statements")
      .insert({
        company_id,
        wallet_id: wallet_id || null,
        statement_date: parseResult.period_end || new Date().toISOString().split("T")[0],
        source_type: parseResult.format.toLowerCase(),
        source_filename: fileRecord.original_filename,
        opening_balance: parseResult.opening_balance,
        closing_balance: parseResult.closing_balance,
      })
      .select()
      .single();

    if (stmtError) {
      console.error("[ai-parse-statement-file] Statement error:", stmtError);
      return new Response(
        JSON.stringify({ error: "Failed to create statement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert statement lines
    if (parseResult.transactions.length > 0) {
      const lines = parseResult.transactions.map((t, idx) => ({
        statement_id: statement.id,
        line_number: idx + 1,
        posted_date: t.posted_date,
        description: t.description,
        amount: t.amount,
        direction: t.direction,
        fit_id: t.fit_id,
        reference_number: t.reference_number,
        balance: t.balance,
        is_reconciled: false,
      }));

      const { error: linesError } = await supabase
        .from("bank_statement_lines")
        .insert(lines);

      if (linesError) {
        console.error("[ai-parse-statement-file] Lines error:", linesError);
      }
    }

    // Update file status
    await supabase
      .from("received_files")
      .update({ processing_status: "processed" })
      .eq("id", file_id);

    console.log(`[ai-parse-statement-file] Successfully processed file ${file_id}`);

    return new Response(
      JSON.stringify({
        success: true,
        import_id: importRecord.id,
        statement_id: statement.id,
        transactions_count: parseResult.transactions.length,
        total_credits: parseResult.total_credits,
        total_debits: parseResult.total_debits,
        period_start: parseResult.period_start,
        period_end: parseResult.period_end,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[ai-parse-statement-file] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
