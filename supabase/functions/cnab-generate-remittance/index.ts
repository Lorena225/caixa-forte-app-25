import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateRemittanceRequest {
  company_id: string;
  agreement_id: string;
  transaction_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('[cnab-generate-remittance] Request received');

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: GenerateRemittanceRequest = await req.json();
    const { company_id, agreement_id, transaction_ids } = body;

    if (!company_id || !agreement_id || !transaction_ids?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get agreement
    const { data: agreement, error: agreementError } = await supabase
      .from('cnab_agreements')
      .select('*')
      .eq('id', agreement_id)
      .eq('company_id', company_id)
      .single();

    if (agreementError || !agreement) {
      return new Response(JSON.stringify({ error: 'Agreement not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get transactions
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*, counterparties(name, document, address_city, address_state, address_zip)')
      .in('id', transaction_ids)
      .eq('company_id', company_id)
      .eq('direction', 'in'); // Only AR for cobranca

    if (txError || !transactions?.length) {
      return new Response(JSON.stringify({ error: 'No valid transactions found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get next sequence number
    const { data: lastRemittance } = await supabase
      .from('cnab_remittances')
      .select('remittance_number')
      .eq('agreement_id', agreement_id)
      .order('remittance_number', { ascending: false })
      .limit(1)
      .single();

    const remittanceNumber = (lastRemittance?.remittance_number || 0) + 1;
    const fileSequence = remittanceNumber;

    // Generate CNAB 240 file
    const lines: string[] = [];
    const today = new Date();
    const dateStr = formatDate(today);
    const timeStr = formatTime(today);

    // Header de Arquivo (Registro 0)
    lines.push(generateFileHeader({
      bankCode: agreement.bank_code,
      companyDocument: agreement.config_json?.company_document || '00000000000000',
      companyName: agreement.config_json?.company_name || 'EMPRESA',
      bankName: getBankName(agreement.bank_code),
      fileSequence,
      dateStr,
      timeStr
    }));

    // Header de Lote (Registro 1)
    lines.push(generateBatchHeader({
      bankCode: agreement.bank_code,
      batchNumber: 1,
      serviceType: agreement.service_type || '01',
      companyDocument: agreement.config_json?.company_document || '00000000000000',
      companyName: agreement.config_json?.company_name || 'EMPRESA',
      agreementNumber: agreement.agreement_number,
      walletCode: agreement.wallet_code,
      walletVariation: agreement.wallet_variation,
      dateStr
    }));

    let totalAmount = 0;
    const items: { transaction_id: string; our_number: string }[] = [];

    // Detalhe Segmento P e Q para cada título
    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      const sequenceInBatch = (i + 1) * 2;
      const ourNumber = generateOurNumber(agreement.bank_code, fileSequence, i + 1);

      // Segmento P
      lines.push(generateSegmentP({
        bankCode: agreement.bank_code,
        batchNumber: 1,
        sequenceInBatch,
        agreementNumber: agreement.agreement_number,
        walletCode: agreement.wallet_code,
        ourNumber,
        dueDate: formatDateCNAB(new Date(tx.due_date)),
        amount: tx.amount,
        documentNumber: tx.document_number || tx.id.substring(0, 15)
      }));

      // Segmento Q
      lines.push(generateSegmentQ({
        bankCode: agreement.bank_code,
        batchNumber: 1,
        sequenceInBatch: sequenceInBatch + 1,
        payerName: tx.counterparties?.name || 'PAGADOR',
        payerDocument: tx.counterparties?.document || '00000000000',
        payerCity: tx.counterparties?.address_city || 'SAO PAULO',
        payerState: tx.counterparties?.address_state || 'SP',
        payerZip: tx.counterparties?.address_zip || '00000000'
      }));

      totalAmount += parseFloat(tx.amount);
      items.push({ transaction_id: tx.id, our_number: ourNumber });
    }

    // Trailer de Lote (Registro 5)
    lines.push(generateBatchTrailer({
      bankCode: agreement.bank_code,
      batchNumber: 1,
      recordCount: transactions.length * 2 + 2, // P+Q + headers
      totalAmount
    }));

    // Trailer de Arquivo (Registro 9)
    lines.push(generateFileTrailer({
      bankCode: agreement.bank_code,
      batchCount: 1,
      recordCount: lines.length + 1
    }));

    const fileContent = lines.join('\r\n');
    const fileName = `REM${agreement.bank_code}${dateStr}${String(fileSequence).padStart(6, '0')}.txt`;

    // Create remittance record
    const { data: remittance, error: remittanceError } = await supabase
      .from('cnab_remittances')
      .insert({
        company_id,
        agreement_id,
        remittance_number: remittanceNumber,
        file_sequence: fileSequence,
        operation_type: 'cobranca',
        file_content: fileContent,
        record_count: transactions.length,
        total_amount: totalAmount,
        status: 'generated',
        generated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (remittanceError) {
      console.error('[cnab-generate-remittance] Error creating remittance:', remittanceError);
      throw remittanceError;
    }

    // Create remittance items
    for (const item of items) {
      await supabase
        .from('cnab_remittance_items')
        .insert({
          company_id,
          remittance_id: remittance.id,
          transaction_id: item.transaction_id,
          our_number: item.our_number,
          status: 'pending'
        });
    }

    console.log('[cnab-generate-remittance] Remittance generated:', remittance.id, 'items:', items.length);

    return new Response(JSON.stringify({
      ok: true,
      remittance: {
        id: remittance.id,
        file_name: fileName,
        file_content: fileContent,
        record_count: transactions.length,
        total_amount: totalAmount
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[cnab-generate-remittance] Error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// Helper functions for CNAB 240 generation
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

function formatDateCNAB(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString();
  return d + m + y;
}

function formatTime(date: Date): string {
  return date.toTimeString().substring(0, 8).replace(/:/g, '');
}

function getBankName(code: string): string {
  const banks: Record<string, string> = {
    '001': 'BANCO DO BRASIL',
    '341': 'ITAU UNIBANCO',
    '033': 'SANTANDER',
    '237': 'BRADESCO',
    '104': 'CAIXA ECONOMICA'
  };
  return banks[code] || 'BANCO';
}

function generateOurNumber(bankCode: string, sequence: number, item: number): string {
  return String(sequence * 1000 + item).padStart(20, '0');
}

function pad(str: string, len: number, char = ' ', left = false): string {
  const s = str.substring(0, len);
  return left ? s.padStart(len, char) : s.padEnd(len, char);
}

function generateFileHeader(p: {
  bankCode: string;
  companyDocument: string;
  companyName: string;
  bankName: string;
  fileSequence: number;
  dateStr: string;
  timeStr: string;
}): string {
  let line = '';
  line += pad(p.bankCode, 3, '0', true);      // 1-3: Banco
  line += '0000';                              // 4-7: Lote (0000 para header arquivo)
  line += '0';                                 // 8: Registro
  line += pad('', 9);                          // 9-17: Brancos
  line += '2';                                 // 18: Tipo inscrição (2=CNPJ)
  line += pad(p.companyDocument, 14, '0', true); // 19-32: CNPJ
  line += pad('', 20);                         // 33-52: Código convênio
  line += pad('', 5, '0', true);              // 53-57: Agência
  line += ' ';                                 // 58: DV agência
  line += pad('', 12, '0', true);             // 59-70: Conta
  line += ' ';                                 // 71: DV conta
  line += ' ';                                 // 72: DV ag/conta
  line += pad(p.companyName, 30);             // 73-102: Nome empresa
  line += pad(p.bankName, 30);                // 103-132: Nome banco
  line += pad('', 10);                         // 133-142: Brancos
  line += '1';                                 // 143: Código remessa
  line += p.dateStr;                           // 144-151: Data geração
  line += p.timeStr.substring(0, 6);          // 152-157: Hora geração
  line += pad(String(p.fileSequence), 6, '0', true); // 158-163: NSA
  line += '089';                               // 164-166: Versão layout
  line += pad('', 5, '0', true);              // 167-171: Densidade
  line += pad('', 20);                         // 172-191: Reservado banco
  line += pad('', 20);                         // 192-211: Reservado empresa
  line += pad('', 29);                         // 212-240: Brancos
  return line;
}

function generateBatchHeader(p: {
  bankCode: string;
  batchNumber: number;
  serviceType: string;
  companyDocument: string;
  companyName: string;
  agreementNumber: string;
  walletCode: string;
  walletVariation: string;
  dateStr: string;
}): string {
  let line = '';
  line += pad(p.bankCode, 3, '0', true);
  line += pad(String(p.batchNumber), 4, '0', true);
  line += '1';                                 // Registro
  line += 'R';                                 // Operação (R=Remessa)
  line += pad(p.serviceType, 2, '0', true);   // Tipo serviço (01=Cobrança)
  line += pad('', 2);                          // Forma lançamento
  line += '045';                               // Versão layout lote
  line += ' ';                                 // Branco
  line += '2';                                 // Tipo inscrição
  line += pad(p.companyDocument, 15, '0', true);
  line += pad(p.agreementNumber || '', 20);
  line += pad('', 5, '0', true);              // Agência
  line += ' ';
  line += pad('', 12, '0', true);             // Conta
  line += ' ';
  line += ' ';
  line += pad(p.companyName, 30);
  line += pad('', 40);                         // Mensagem 1
  line += pad('', 40);                         // Mensagem 2
  line += pad('', 8, '0', true);              // Número remessa/retorno
  line += p.dateStr;
  line += pad('', 8, '0', true);              // Data crédito
  line += pad('', 33);                         // Brancos
  return line;
}

function generateSegmentP(p: {
  bankCode: string;
  batchNumber: number;
  sequenceInBatch: number;
  agreementNumber: string;
  walletCode: string;
  ourNumber: string;
  dueDate: string;
  amount: number;
  documentNumber: string;
}): string {
  let line = '';
  line += pad(p.bankCode, 3, '0', true);
  line += pad(String(p.batchNumber), 4, '0', true);
  line += '3';                                 // Registro
  line += pad(String(p.sequenceInBatch), 5, '0', true);
  line += 'P';                                 // Segmento
  line += ' ';                                 // Branco
  line += '01';                                // Código instrução (01=Entrada)
  line += pad('', 5, '0', true);              // Agência
  line += ' ';
  line += pad('', 12, '0', true);             // Conta
  line += ' ';
  line += ' ';
  line += pad(p.ourNumber, 20);               // Nosso número
  line += pad(p.walletCode || '1', 1);        // Carteira
  line += '1';                                 // Cadastramento
  line += ' ';                                 // Documento
  line += '2';                                 // Emissão boleto
  line += '2';                                 // Distribuição
  line += pad(p.documentNumber, 15);          // Número documento
  line += p.dueDate;                          // Vencimento
  line += pad(Math.round(p.amount * 100).toString(), 15, '0', true); // Valor
  line += pad('', 5, '0', true);              // Agência cobradora
  line += ' ';
  line += '02';                                // Espécie (02=DM)
  line += 'N';                                 // Aceite
  line += pad('', 8, '0', true);              // Data emissão
  line += '0';                                 // Código juros
  line += pad('', 8, '0', true);              // Data juros
  line += pad('', 15, '0', true);             // Juros
  line += '0';                                 // Código desconto
  line += pad('', 8, '0', true);              // Data desconto
  line += pad('', 15, '0', true);             // Desconto
  line += pad('', 15, '0', true);             // IOF
  line += pad('', 15, '0', true);             // Abatimento
  line += pad('', 25);                         // Uso empresa
  line += '0';                                 // Código protesto
  line += '00';                                // Prazo protesto
  line += '0';                                 // Código baixa
  line += pad('', 3);                          // Prazo baixa
  line += '09';                                // Código moeda
  line += pad('', 10, '0', true);             // Número contrato
  line += ' ';                                 // Uso livre
  return line;
}

function generateSegmentQ(p: {
  bankCode: string;
  batchNumber: number;
  sequenceInBatch: number;
  payerName: string;
  payerDocument: string;
  payerCity: string;
  payerState: string;
  payerZip: string;
}): string {
  const docLen = p.payerDocument.replace(/\D/g, '').length;
  const tipoInscricao = docLen <= 11 ? '1' : '2';
  
  let line = '';
  line += pad(p.bankCode, 3, '0', true);
  line += pad(String(p.batchNumber), 4, '0', true);
  line += '3';
  line += pad(String(p.sequenceInBatch), 5, '0', true);
  line += 'Q';
  line += ' ';
  line += '01';                                // Instrução
  line += tipoInscricao;                       // Tipo inscrição sacado
  line += pad(p.payerDocument.replace(/\D/g, ''), 15, '0', true);
  line += pad(p.payerName, 40);
  line += pad('', 40);                         // Endereço
  line += pad('', 15);                         // Bairro
  line += pad(p.payerZip.replace(/\D/g, ''), 8, '0', true);
  line += pad(p.payerCity, 15);
  line += pad(p.payerState, 2);
  line += '0';                                 // Tipo inscrição avalista
  line += pad('', 15, '0', true);             // CNPJ/CPF avalista
  line += pad('', 40);                         // Nome avalista
  line += pad('', 3, '0', true);              // Banco correspondente
  line += pad('', 20);                         // Nosso número correspondente
  line += pad('', 8);                          // Brancos
  return line;
}

function generateBatchTrailer(p: {
  bankCode: string;
  batchNumber: number;
  recordCount: number;
  totalAmount: number;
}): string {
  let line = '';
  line += pad(p.bankCode, 3, '0', true);
  line += pad(String(p.batchNumber), 4, '0', true);
  line += '5';                                 // Registro
  line += pad('', 9);                          // Brancos
  line += pad(String(p.recordCount), 6, '0', true);
  line += pad(String(Math.round(p.totalAmount * 100)), 18, '0', true);
  line += pad('', 18, '0', true);             // Quantidade moedas
  line += pad('', 6, '0', true);              // Número aviso débito
  line += pad('', 165);                        // Brancos
  line += pad('', 10);                         // Ocorrências
  return line;
}

function generateFileTrailer(p: {
  bankCode: string;
  batchCount: number;
  recordCount: number;
}): string {
  let line = '';
  line += pad(p.bankCode, 3, '0', true);
  line += '9999';                              // Lote (9999 para trailer)
  line += '9';                                 // Registro
  line += pad('', 9);                          // Brancos
  line += pad(String(p.batchCount), 6, '0', true);
  line += pad(String(p.recordCount), 6, '0', true);
  line += pad('', 6, '0', true);              // Quantidade contas concil
  line += pad('', 205);                        // Brancos
  return line;
}
