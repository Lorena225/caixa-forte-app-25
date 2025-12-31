// OFX Parser - Parses Open Financial Exchange files
export interface OFXTransaction {
  fitId: string;
  type: 'CREDIT' | 'DEBIT' | 'OTHER';
  datePosted: Date;
  amount: number;
  name?: string;
  memo?: string;
  checkNum?: string;
}

export interface OFXAccount {
  bankId?: string;
  branchId?: string;
  accountId: string;
  accountType?: string;
}

export interface OFXStatement {
  account: OFXAccount;
  currency: string;
  startDate?: Date;
  endDate?: Date;
  transactions: OFXTransaction[];
  ledgerBalance?: number;
  availableBalance?: number;
}

function parseOFXDate(dateStr: string): Date {
  // OFX dates can be: YYYYMMDD, YYYYMMDDHHMMSS, YYYYMMDDHHMMSS.XXX[TZ]
  const cleanDate = dateStr.replace(/\[.*\]/, '').trim();
  
  const year = parseInt(cleanDate.substring(0, 4));
  const month = parseInt(cleanDate.substring(4, 6)) - 1;
  const day = parseInt(cleanDate.substring(6, 8));
  
  let hours = 0, minutes = 0, seconds = 0;
  if (cleanDate.length >= 14) {
    hours = parseInt(cleanDate.substring(8, 10));
    minutes = parseInt(cleanDate.substring(10, 12));
    seconds = parseInt(cleanDate.substring(12, 14));
  }
  
  return new Date(year, month, day, hours, minutes, seconds);
}

function extractTag(content: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}>([^<]+)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function extractBlock(content: string, tagName: string): string | null {
  const startTag = `<${tagName}>`;
  const endTag = `</${tagName}>`;
  
  const startIdx = content.indexOf(startTag);
  if (startIdx === -1) return null;
  
  const endIdx = content.indexOf(endTag, startIdx);
  if (endIdx === -1) {
    // OFX can have unclosed tags, try to find the next major tag
    const nextTagMatch = content.substring(startIdx + startTag.length).match(/<[A-Z]+>/);
    if (nextTagMatch) {
      return content.substring(startIdx + startTag.length, startIdx + startTag.length + (nextTagMatch.index || 0));
    }
    return content.substring(startIdx + startTag.length);
  }
  
  return content.substring(startIdx + startTag.length, endIdx);
}

function extractAllBlocks(content: string, tagName: string): string[] {
  const blocks: string[] = [];
  const regex = new RegExp(`<${tagName}>([\\s\\S]*?)(?=<${tagName}>|<\\/${tagName}>|$)`, 'gi');
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    blocks.push(match[1]);
  }
  
  return blocks;
}

export function parseOFX(content: string): OFXStatement {
  // Remove XML declaration and SGML headers
  let cleanContent = content
    .replace(/^[\s\S]*?<OFX>/i, '<OFX>')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Extract bank transaction list
  const stmtTrnRs = extractBlock(cleanContent, 'STMTTRNRS') || 
                    extractBlock(cleanContent, 'CCSTMTTRNRS') || // Credit card
                    cleanContent;
  
  // Extract account info
  const bankAcctFrom = extractBlock(stmtTrnRs, 'BANKACCTFROM') || 
                       extractBlock(stmtTrnRs, 'CCACCTFROM') || '';
  
  const account: OFXAccount = {
    bankId: extractTag(bankAcctFrom, 'BANKID') || undefined,
    branchId: extractTag(bankAcctFrom, 'BRANCHID') || undefined,
    accountId: extractTag(bankAcctFrom, 'ACCTID') || 'UNKNOWN',
    accountType: extractTag(bankAcctFrom, 'ACCTTYPE') || undefined,
  };

  // Extract currency
  const stmtRs = extractBlock(stmtTrnRs, 'STMTRS') || 
                 extractBlock(stmtTrnRs, 'CCSTMTRS') || stmtTrnRs;
  const currency = extractTag(stmtRs, 'CURDEF') || 'BRL';

  // Extract transaction list
  const bankTranList = extractBlock(stmtRs, 'BANKTRANLIST') || '';
  const startDateStr = extractTag(bankTranList, 'DTSTART');
  const endDateStr = extractTag(bankTranList, 'DTEND');

  // Parse transactions
  const transactionBlocks = extractAllBlocks(bankTranList, 'STMTTRN');
  const transactions: OFXTransaction[] = transactionBlocks.map(block => {
    const trnType = extractTag(block, 'TRNTYPE') || 'OTHER';
    const datePostedStr = extractTag(block, 'DTPOSTED');
    const amountStr = extractTag(block, 'TRNAMT');
    
    return {
      fitId: extractTag(block, 'FITID') || `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: trnType as 'CREDIT' | 'DEBIT' | 'OTHER',
      datePosted: datePostedStr ? parseOFXDate(datePostedStr) : new Date(),
      amount: amountStr ? parseFloat(amountStr.replace(',', '.')) : 0,
      name: extractTag(block, 'NAME') || undefined,
      memo: extractTag(block, 'MEMO') || undefined,
      checkNum: extractTag(block, 'CHECKNUM') || undefined,
    };
  });

  // Extract balances
  const ledgerBal = extractBlock(stmtRs, 'LEDGERBAL');
  const availBal = extractBlock(stmtRs, 'AVAILBAL');

  return {
    account,
    currency,
    startDate: startDateStr ? parseOFXDate(startDateStr) : undefined,
    endDate: endDateStr ? parseOFXDate(endDateStr) : undefined,
    transactions,
    ledgerBalance: ledgerBal ? parseFloat(extractTag(ledgerBal, 'BALAMT') || '0') : undefined,
    availableBalance: availBal ? parseFloat(extractTag(availBal, 'BALAMT') || '0') : undefined,
  };
}

export function generateTransactionHash(transaction: OFXTransaction, accountId: string): string {
  const str = `${accountId}|${transaction.fitId}|${transaction.datePosted.toISOString().split('T')[0]}|${transaction.amount}|${transaction.name || ''}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
