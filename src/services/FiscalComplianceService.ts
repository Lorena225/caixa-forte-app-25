// =====================================================
// FISCAL COMPLIANCE SERVICE
// Brazilian Fiscal Obligations & Government Integration
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface Invoice {
  id: string;
  company_id: string;
  number: string;
  series: string;
  issue_date: string;
  operation_type: 'entrada' | 'saida';
  cfop: string;
  nature_of_operation: string;
  
  // Emitente
  issuer: {
    cnpj: string;
    ie: string;
    razao_social: string;
    nome_fantasia?: string;
    endereco: Address;
    crt: '1' | '2' | '3'; // Simples, Simples excesso, Regime normal
  };
  
  // Destinatário
  recipient: {
    cpf_cnpj: string;
    ie?: string;
    razao_social: string;
    endereco: Address;
    indicador_ie: '1' | '2' | '9'; // Contribuinte, Isento, Não contribuinte
  };
  
  // Items
  items: InvoiceItem[];
  
  // Totais
  totals: {
    valor_produtos: number;
    valor_frete: number;
    valor_seguro: number;
    valor_desconto: number;
    valor_ipi: number;
    valor_pis: number;
    valor_cofins: number;
    valor_icms: number;
    valor_icms_st: number;
    valor_total: number;
  };
  
  // Transporte
  transport?: {
    modalidade: '0' | '1' | '2' | '3' | '4' | '9';
    transportadora?: {
      cnpj?: string;
      razao_social?: string;
      ie?: string;
      endereco?: string;
      municipio?: string;
      uf?: string;
    };
  };
  
  // Pagamento
  payment: {
    forma: string;
    valor: number;
    indicador: '0' | '1'; // À vista, A prazo
  }[];
  
  // Informações adicionais
  additional_info?: string;
}

export interface Address {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
  codigo_pais?: string;
  pais?: string;
  telefone?: string;
}

export interface InvoiceItem {
  numero: number;
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  
  // ICMS
  icms: {
    origem: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
    cst: string;
    aliquota?: number;
    valor?: number;
    base_calculo?: number;
    reducao_base?: number;
  };
  
  // PIS
  pis: {
    cst: string;
    aliquota?: number;
    valor?: number;
    base_calculo?: number;
  };
  
  // COFINS
  cofins: {
    cst: string;
    aliquota?: number;
    valor?: number;
    base_calculo?: number;
  };
  
  // IPI (se aplicável)
  ipi?: {
    cst: string;
    aliquota?: number;
    valor?: number;
    base_calculo?: number;
  };
}

export interface Period {
  year: number;
  month: number;
  company_id: string;
}

export interface NFeXML {
  xml: string;
  chave: string;
  digest_value: string;
  version: string;
}

export interface SubmissionResult {
  success: boolean;
  protocolo?: string;
  chave?: string;
  status_code: string;
  status_message: string;
  data_autorizacao?: string;
  numero_recibo?: string;
  errors?: Array<{ code: string; message: string }>;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    message: string;
  }>;
}

export interface EFDFile {
  content: string;
  filename: string;
  period: string;
  type: 'EFD_CONTRIBUICOES' | 'EFD_ICMS_IPI';
  hash: string;
  record_count: number;
  generated_at: string;
}

export interface REINFFile {
  content: string;
  filename: string;
  period: string;
  events: REINFEvent[];
  generated_at: string;
}

export interface REINFEvent {
  tipo: string;
  id: string;
  data_evento: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
}

export interface eSocialFile {
  content: string;
  filename: string;
  period: string;
  events: eSocialEvent[];
  generated_at: string;
}

export interface eSocialEvent {
  tipo: string;
  id: string;
  trabalhador_cpf?: string;
  data_evento: string;
  status: 'pending' | 'sent' | 'accepted' | 'rejected';
}

export interface NFeDocument {
  xml: string;
  chave: string;
  ambiente: '1' | '2'; // Produção, Homologação
  uf_emitente: string;
}

export interface AuthorizationCode {
  success: boolean;
  protocolo?: string;
  chave?: string;
  data_autorizacao?: string;
  status: string;
  motivo: string;
}

export interface StatusNFe {
  chave: string;
  status: 'autorizada' | 'cancelada' | 'inutilizada' | 'denegada' | 'rejeitada';
  protocolo_cancelamento?: string;
  data_cancelamento?: string;
  motivo_cancelamento?: string;
}

export interface NFEvent {
  tipo: string;
  seq: number;
  data: string;
  protocolo: string;
  descricao: string;
}

// =====================================================
// CFOP VALIDATION TABLE
// =====================================================

const VALID_CFOPS: Record<string, string> = {
  // Entrada - Compra
  '1101': 'Compra para industrialização',
  '1102': 'Compra para comercialização',
  '1111': 'Compra para industrialização de mercadoria recebida anteriormente em consignação',
  '1116': 'Compra para industrialização originada de encomenda para recebimento futuro',
  '1117': 'Compra para comercialização originada de encomenda para recebimento futuro',
  '1120': 'Compra para industrialização em que a mercadoria foi remetida pelo fornecedor ao industrializador',
  '1121': 'Compra para comercialização em que a mercadoria foi remetida pelo fornecedor ao armazém geral',
  '1122': 'Compra para industrialização em que a mercadoria foi remetida pelo fornecedor ao depósito fechado',
  '1124': 'Industrialização efetuada por outra empresa',
  '1125': 'Industrialização efetuada por outra empresa quando a mercadoria remetida para utilização no processo',
  '1126': 'Compra para utilização na prestação de serviço sujeita ao ICMS',
  '1128': 'Compra para utilização na prestação de serviço sujeita ao ISSQN',
  '1151': 'Transferência para industrialização',
  '1152': 'Transferência para comercialização',
  '1153': 'Transferência de energia elétrica para distribuição',
  '1154': 'Transferência para utilização na prestação de serviço',
  // Saída - Venda
  '5101': 'Venda de produção do estabelecimento',
  '5102': 'Venda de mercadoria adquirida ou recebida de terceiros',
  '5103': 'Venda de produção do estabelecimento efetuada fora do estabelecimento',
  '5104': 'Venda de mercadoria adquirida ou recebida de terceiros efetuada fora do estabelecimento',
  '5105': 'Venda de produção do estabelecimento que não deva por ele transitar',
  '5106': 'Venda de mercadoria adquirida ou recebida de terceiros que não deva por ele transitar',
  '5109': 'Venda de produção do estabelecimento destinada à Zona Franca de Manaus',
  '5110': 'Venda de mercadoria adquirida ou recebida de terceiros destinada à Zona Franca de Manaus',
  '5111': 'Venda de produção do estabelecimento remetida anteriormente em consignação industrial',
  '5112': 'Venda de mercadoria adquirida ou recebida de terceiros remetida anteriormente em consignação',
  '5113': 'Venda de produção do estabelecimento remetida anteriormente em consignação mercantil',
  '5114': 'Venda de mercadoria adquirida ou recebida de terceiros remetida anteriormente em consignação mercantil',
  '5115': 'Venda de mercadoria adquirida ou recebida de terceiros recebida anteriormente em consignação',
  '5116': 'Venda de produção do estabelecimento originada de encomenda para entrega futura',
  '5117': 'Venda de mercadoria adquirida ou recebida de terceiros originada de encomenda para entrega futura',
  '5118': 'Venda de produção do estabelecimento entregue ao destinatário por conta e ordem do adquirente',
  '5119': 'Venda de mercadoria adquirida ou recebida de terceiros entregue ao destinatário por conta e ordem',
  '5120': 'Venda de mercadoria adquirida ou recebida de terceiros entregue ao destinatário pelo vendedor',
  '5122': 'Venda de produção do estabelecimento remetida para industrialização por conta e ordem',
  '5123': 'Venda de mercadoria adquirida ou recebida de terceiros remetida para industrialização',
  '5124': 'Industrialização efetuada para outra empresa',
  '5125': 'Industrialização efetuada para outra empresa quando a mercadoria recebida para utilização',
  // Interestadual
  '6101': 'Venda de produção do estabelecimento',
  '6102': 'Venda de mercadoria adquirida ou recebida de terceiros',
  '6103': 'Venda de produção do estabelecimento efetuada fora do estabelecimento',
  '6104': 'Venda de mercadoria adquirida ou recebida de terceiros efetuada fora do estabelecimento',
  '6105': 'Venda de produção do estabelecimento que não deva por ele transitar',
  '6106': 'Venda de mercadoria adquirida ou recebida de terceiros que não deva por ele transitar',
  '6107': 'Venda de produção do estabelecimento destinada a não contribuinte',
  '6108': 'Venda de mercadoria adquirida ou recebida de terceiros destinada a não contribuinte',
  '6109': 'Venda de produção do estabelecimento destinada à Zona Franca de Manaus',
  '6110': 'Venda de mercadoria adquirida ou recebida de terceiros destinada à Zona Franca de Manaus',
  // Exterior
  '7101': 'Venda de produção do estabelecimento',
  '7102': 'Venda de mercadoria adquirida ou recebida de terceiros',
};

// =====================================================
// NCM VALIDATION (simplified - first 2 digits = chapter)
// =====================================================

const NCM_CHAPTERS: Record<string, string> = {
  '01': 'Animais vivos',
  '02': 'Carnes e miudezas',
  '03': 'Peixes e crustáceos',
  '04': 'Leite e laticínios',
  '05': 'Outros produtos de origem animal',
  '06': 'Plantas vivas',
  '07': 'Produtos hortícolas',
  '08': 'Frutas',
  '09': 'Café, chá, mate e especiarias',
  '10': 'Cereais',
  '11': 'Produtos da indústria de moagem',
  '12': 'Sementes e frutos oleaginosos',
  '15': 'Gorduras e óleos',
  '16': 'Preparações de carne',
  '17': 'Açúcares',
  '18': 'Cacau e suas preparações',
  '19': 'Preparações de cereais',
  '20': 'Preparações de produtos hortícolas',
  '21': 'Preparações alimentícias diversas',
  '22': 'Bebidas',
  '23': 'Resíduos de indústrias alimentares',
  '24': 'Tabaco',
  '25': 'Sal, enxofre, terras e pedras',
  '26': 'Minérios, escórias e cinzas',
  '27': 'Combustíveis minerais',
  '28': 'Produtos químicos inorgânicos',
  '29': 'Produtos químicos orgânicos',
  '30': 'Produtos farmacêuticos',
  '31': 'Adubos e fertilizantes',
  '32': 'Extratos tanantes e tintoriais',
  '33': 'Óleos essenciais e cosméticos',
  '34': 'Sabões e ceras',
  '35': 'Matérias albuminoides',
  '36': 'Pólvoras e explosivos',
  '37': 'Produtos fotográficos',
  '38': 'Produtos diversos das indústrias químicas',
  '39': 'Plásticos',
  '40': 'Borracha',
  '41': 'Peles e couros',
  '42': 'Obras de couro',
  '44': 'Madeira',
  '47': 'Pastas de madeira',
  '48': 'Papel e cartão',
  '49': 'Produtos de edição e impressos',
  '50': 'Seda',
  '51': 'Lã e pelos finos',
  '52': 'Algodão',
  '53': 'Outras fibras têxteis vegetais',
  '54': 'Filamentos sintéticos',
  '55': 'Fibras sintéticas descontínuas',
  '56': 'Pastas e feltros',
  '57': 'Tapetes e revestimentos',
  '58': 'Tecidos especiais',
  '59': 'Tecidos impregnados',
  '60': 'Tecidos de malha',
  '61': 'Vestuário de malha',
  '62': 'Vestuário exceto malha',
  '63': 'Outros artefatos têxteis',
  '64': 'Calçados',
  '65': 'Chapéus',
  '66': 'Guarda-chuvas',
  '67': 'Penas e flores artificiais',
  '68': 'Obras de pedra',
  '69': 'Produtos cerâmicos',
  '70': 'Vidro',
  '71': 'Pérolas e pedras preciosas',
  '72': 'Ferro fundido e aço',
  '73': 'Obras de ferro e aço',
  '74': 'Cobre',
  '75': 'Níquel',
  '76': 'Alumínio',
  '78': 'Chumbo',
  '79': 'Zinco',
  '80': 'Estanho',
  '81': 'Outros metais comuns',
  '82': 'Ferramentas',
  '83': 'Obras diversas de metais',
  '84': 'Máquinas e aparelhos mecânicos',
  '85': 'Máquinas e aparelhos elétricos',
  '86': 'Veículos ferroviários',
  '87': 'Veículos automóveis',
  '88': 'Aeronaves',
  '89': 'Embarcações',
  '90': 'Instrumentos ópticos e médicos',
  '91': 'Aparelhos de relojoaria',
  '92': 'Instrumentos musicais',
  '93': 'Armas e munições',
  '94': 'Móveis',
  '95': 'Brinquedos e jogos',
  '96': 'Obras diversas',
  '97': 'Objetos de arte',
};

// =====================================================
// FISCAL COMPLIANCE SERVICE CLASS
// =====================================================

export class FiscalComplianceService {
  private companyId: string;
  private ambiente: '1' | '2' = '2'; // Default: Homologação

  constructor(companyId: string, ambiente?: '1' | '2') {
    this.companyId = companyId;
    this.ambiente = ambiente || '2';
  }

  // =====================================================
  // NF-e GENERATION
  // =====================================================

  async generateNFe(invoice: Invoice): Promise<NFeXML> {
    // Validate invoice before generating
    const validation = await this.validateNFe(invoice);
    if (!validation.valid && validation.errors.some(e => e.severity === 'error')) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Generate access key (44 digits)
    const chave = this.generateAccessKey(invoice);
    
    // Build XML structure
    const xml = this.buildNFeXML(invoice, chave);
    
    // Calculate digest
    const digest_value = await this.calculateDigest(xml);

    // Log generation
    await this.logFiscalOperation('nfe_generation', {
      chave,
      numero: invoice.number,
      serie: invoice.series,
      valor: invoice.totals.valor_total,
    });

    return {
      xml,
      chave,
      digest_value,
      version: '4.00',
    };
  }

  private generateAccessKey(invoice: Invoice): string {
    const now = new Date();
    const uf = this.getUFCode(invoice.issuer.endereco.uf);
    const aamm = `${now.getFullYear().toString().slice(2)}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const cnpj = invoice.issuer.cnpj.replace(/\D/g, '');
    const mod = '55'; // NF-e
    const serie = invoice.series.padStart(3, '0');
    const numero = invoice.number.padStart(9, '0');
    const tipoEmissao = '1'; // Normal
    const codigoNumerico = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    const baseChave = `${uf}${aamm}${cnpj}${mod}${serie}${numero}${tipoEmissao}${codigoNumerico}`;
    const dv = this.calculateMod11(baseChave);
    
    return `${baseChave}${dv}`;
  }

  private calculateMod11(value: string): string {
    const weights = [2, 3, 4, 5, 6, 7, 8, 9];
    let sum = 0;
    let weightIndex = 0;
    
    for (let i = value.length - 1; i >= 0; i--) {
      sum += parseInt(value[i]) * weights[weightIndex];
      weightIndex = (weightIndex + 1) % 8;
    }
    
    const remainder = sum % 11;
    const dv = remainder < 2 ? 0 : 11 - remainder;
    return dv.toString();
  }

  private getUFCode(uf: string): string {
    const codes: Record<string, string> = {
      'AC': '12', 'AL': '27', 'AP': '16', 'AM': '13', 'BA': '29',
      'CE': '23', 'DF': '53', 'ES': '32', 'GO': '52', 'MA': '21',
      'MT': '51', 'MS': '50', 'MG': '31', 'PA': '15', 'PB': '25',
      'PR': '41', 'PE': '26', 'PI': '22', 'RJ': '33', 'RN': '24',
      'RS': '43', 'RO': '11', 'RR': '14', 'SC': '42', 'SP': '35',
      'SE': '28', 'TO': '17',
    };
    return codes[uf] || '35';
  }

  private buildNFeXML(invoice: Invoice, chave: string): string {
    // Simplified XML structure
    return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFe${chave}">
    <ide>
      <cUF>${this.getUFCode(invoice.issuer.endereco.uf)}</cUF>
      <cNF>${chave.slice(35, 43)}</cNF>
      <natOp>${invoice.nature_of_operation}</natOp>
      <mod>55</mod>
      <serie>${invoice.series}</serie>
      <nNF>${invoice.number}</nNF>
      <dhEmi>${new Date().toISOString()}</dhEmi>
      <tpNF>${invoice.operation_type === 'saida' ? '1' : '0'}</tpNF>
      <idDest>1</idDest>
      <cMunFG>${invoice.issuer.endereco.codigo_municipio}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${chave.slice(-1)}</cDV>
      <tpAmb>${this.ambiente}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>CaixaForte 1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${invoice.issuer.cnpj.replace(/\D/g, '')}</CNPJ>
      <xNome>${invoice.issuer.razao_social}</xNome>
      <xFant>${invoice.issuer.nome_fantasia || invoice.issuer.razao_social}</xFant>
      <enderEmit>
        <xLgr>${invoice.issuer.endereco.logradouro}</xLgr>
        <nro>${invoice.issuer.endereco.numero}</nro>
        <xBairro>${invoice.issuer.endereco.bairro}</xBairro>
        <cMun>${invoice.issuer.endereco.codigo_municipio}</cMun>
        <xMun>${invoice.issuer.endereco.municipio}</xMun>
        <UF>${invoice.issuer.endereco.uf}</UF>
        <CEP>${invoice.issuer.endereco.cep.replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
      </enderEmit>
      <IE>${invoice.issuer.ie.replace(/\D/g, '')}</IE>
      <CRT>${invoice.issuer.crt}</CRT>
    </emit>
    <dest>
      <${invoice.recipient.cpf_cnpj.length > 11 ? 'CNPJ' : 'CPF'}>${invoice.recipient.cpf_cnpj.replace(/\D/g, '')}</${invoice.recipient.cpf_cnpj.length > 11 ? 'CNPJ' : 'CPF'}>
      <xNome>${invoice.recipient.razao_social}</xNome>
      <enderDest>
        <xLgr>${invoice.recipient.endereco.logradouro}</xLgr>
        <nro>${invoice.recipient.endereco.numero}</nro>
        <xBairro>${invoice.recipient.endereco.bairro}</xBairro>
        <cMun>${invoice.recipient.endereco.codigo_municipio}</cMun>
        <xMun>${invoice.recipient.endereco.municipio}</xMun>
        <UF>${invoice.recipient.endereco.uf}</UF>
        <CEP>${invoice.recipient.endereco.cep.replace(/\D/g, '')}</CEP>
        <cPais>1058</cPais>
        <xPais>Brasil</xPais>
      </enderDest>
      <indIEDest>${invoice.recipient.indicador_ie}</indIEDest>
      ${invoice.recipient.ie ? `<IE>${invoice.recipient.ie.replace(/\D/g, '')}</IE>` : ''}
    </dest>
    ${invoice.items.map((item, idx) => this.buildItemXML(item, idx + 1)).join('\n')}
    <total>
      <ICMSTot>
        <vBC>${invoice.totals.valor_icms > 0 ? invoice.totals.valor_produtos.toFixed(2) : '0.00'}</vBC>
        <vICMS>${invoice.totals.valor_icms.toFixed(2)}</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCPUFDest>0.00</vFCPUFDest>
        <vICMSUFDest>0.00</vICMSUFDest>
        <vICMSUFRemet>0.00</vICMSUFRemet>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>${invoice.totals.valor_icms_st.toFixed(2)}</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${invoice.totals.valor_produtos.toFixed(2)}</vProd>
        <vFrete>${invoice.totals.valor_frete.toFixed(2)}</vFrete>
        <vSeg>${invoice.totals.valor_seguro.toFixed(2)}</vSeg>
        <vDesc>${invoice.totals.valor_desconto.toFixed(2)}</vDesc>
        <vII>0.00</vII>
        <vIPI>${invoice.totals.valor_ipi.toFixed(2)}</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>${invoice.totals.valor_pis.toFixed(2)}</vPIS>
        <vCOFINS>${invoice.totals.valor_cofins.toFixed(2)}</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${invoice.totals.valor_total.toFixed(2)}</vNF>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>${invoice.transport?.modalidade || '9'}</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>${invoice.payment[0]?.indicador || '0'}</indPag>
        <tPag>${invoice.payment[0]?.forma || '01'}</tPag>
        <vPag>${invoice.payment[0]?.valor?.toFixed(2) || invoice.totals.valor_total.toFixed(2)}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>${invoice.additional_info || ''}</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;
  }

  private buildItemXML(item: InvoiceItem, numero: number): string {
    return `    <det nItem="${numero}">
      <prod>
        <cProd>${item.codigo}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${item.descricao}</xProd>
        <NCM>${item.ncm.replace(/\D/g, '')}</NCM>
        <CFOP>${item.cfop}</CFOP>
        <uCom>${item.unidade}</uCom>
        <qCom>${item.quantidade.toFixed(4)}</qCom>
        <vUnCom>${item.valor_unitario.toFixed(10)}</vUnCom>
        <vProd>${item.valor_total.toFixed(2)}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${item.unidade}</uTrib>
        <qTrib>${item.quantidade.toFixed(4)}</qTrib>
        <vUnTrib>${item.valor_unitario.toFixed(10)}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      <imposto>
        <ICMS>
          <ICMS00>
            <orig>${item.icms.origem}</orig>
            <CST>${item.icms.cst}</CST>
            <modBC>3</modBC>
            <vBC>${(item.icms.base_calculo || item.valor_total).toFixed(2)}</vBC>
            <pICMS>${(item.icms.aliquota || 0).toFixed(2)}</pICMS>
            <vICMS>${(item.icms.valor || 0).toFixed(2)}</vICMS>
          </ICMS00>
        </ICMS>
        <PIS>
          <PISAliq>
            <CST>${item.pis.cst}</CST>
            <vBC>${(item.pis.base_calculo || item.valor_total).toFixed(2)}</vBC>
            <pPIS>${(item.pis.aliquota || 0).toFixed(2)}</pPIS>
            <vPIS>${(item.pis.valor || 0).toFixed(2)}</vPIS>
          </PISAliq>
        </PIS>
        <COFINS>
          <COFINSAliq>
            <CST>${item.cofins.cst}</CST>
            <vBC>${(item.cofins.base_calculo || item.valor_total).toFixed(2)}</vBC>
            <pCOFINS>${(item.cofins.aliquota || 0).toFixed(2)}</pCOFINS>
            <vCOFINS>${(item.cofins.valor || 0).toFixed(2)}</vCOFINS>
          </COFINSAliq>
        </COFINS>
      </imposto>
    </det>`;
  }

  private async calculateDigest(xml: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(xml);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
  }

  // =====================================================
  // NF-e SUBMISSION
  // =====================================================

  async submitNFe(nfeXml: string): Promise<SubmissionResult> {
    try {
      // In production: submit to SEFAZ via edge function
      const { data, error } = await supabase.functions.invoke('fiscal-emit', {
        body: {
          action: 'submit_nfe',
          xml: nfeXml,
          ambiente: this.ambiente,
        },
      });

      if (error) {
        return {
          success: false,
          status_code: '999',
          status_message: error.message,
          errors: [{ code: 'SUBMIT_ERROR', message: error.message }],
        };
      }

      return data as SubmissionResult;
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        status_code: '999',
        status_message: msg,
        errors: [{ code: 'EXCEPTION', message: msg }],
      };
    }
  }

  // =====================================================
  // NF-e VALIDATION
  // =====================================================

  async validateNFe(invoice: Invoice | string): Promise<ValidationResult> {
    const errors: ValidationResult['errors'] = [];
    const warnings: ValidationResult['warnings'] = [];

    // If XML string, parse basic validation
    if (typeof invoice === 'string') {
      if (!invoice.includes('<NFe')) {
        errors.push({ field: 'xml', code: 'INVALID_XML', message: 'XML inválido', severity: 'error' });
      }
      return { valid: errors.length === 0, errors, warnings };
    }

    // Validate issuer
    if (!invoice.issuer.cnpj || invoice.issuer.cnpj.replace(/\D/g, '').length !== 14) {
      errors.push({ field: 'issuer.cnpj', code: 'INVALID_CNPJ', message: 'CNPJ do emitente inválido', severity: 'error' });
    }
    if (!invoice.issuer.ie) {
      errors.push({ field: 'issuer.ie', code: 'MISSING_IE', message: 'Inscrição Estadual obrigatória', severity: 'error' });
    }

    // Validate recipient
    const cpfCnpj = invoice.recipient.cpf_cnpj.replace(/\D/g, '');
    if (cpfCnpj.length !== 11 && cpfCnpj.length !== 14) {
      errors.push({ field: 'recipient.cpf_cnpj', code: 'INVALID_CPF_CNPJ', message: 'CPF/CNPJ do destinatário inválido', severity: 'error' });
    }

    // Validate items
    if (!invoice.items || invoice.items.length === 0) {
      errors.push({ field: 'items', code: 'NO_ITEMS', message: 'NF-e deve ter pelo menos um item', severity: 'error' });
    }

    for (const item of invoice.items) {
      if (!this.validateNCM(item.ncm)) {
        errors.push({ field: `item.${item.numero}.ncm`, code: 'INVALID_NCM', message: `NCM inválido: ${item.ncm}`, severity: 'error' });
      }
      if (!this.validateCFOP(item.cfop)) {
        errors.push({ field: `item.${item.numero}.cfop`, code: 'INVALID_CFOP', message: `CFOP inválido: ${item.cfop}`, severity: 'error' });
      }
      if (item.valor_total <= 0) {
        errors.push({ field: `item.${item.numero}.valor_total`, code: 'INVALID_VALUE', message: 'Valor do item deve ser maior que zero', severity: 'error' });
      }
    }

    // Validate totals
    const itemsTotal = invoice.items.reduce((sum, item) => sum + item.valor_total, 0);
    if (Math.abs(itemsTotal - invoice.totals.valor_produtos) > 0.01) {
      warnings.push({ field: 'totals.valor_produtos', message: 'Soma dos itens difere do total de produtos' });
    }

    return { valid: errors.filter(e => e.severity === 'error').length === 0, errors, warnings };
  }

  // =====================================================
  // EFD CONTRIBUIÇÕES
  // =====================================================

  async generateEFDContribuicoes(period: Period): Promise<EFDFile> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', period.company_id)
      .gte('transaction_date', `${period.year}-${period.month.toString().padStart(2, '0')}-01`)
      .lte('transaction_date', `${period.year}-${period.month.toString().padStart(2, '0')}-31`);

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', period.company_id)
      .maybeSingle();

    const lines: string[] = [];
    let recordCount = 0;

    // Registro 0000 - Abertura
    lines.push(this.buildEFDRecord('0000', [
      '016', // Versão layout
      '0', // Tipo escrituração
      `01${period.month.toString().padStart(2, '0')}${period.year}`, // Data inicial
      `${this.getLastDayOfMonth(period.year, period.month)}${period.month.toString().padStart(2, '0')}${period.year}`, // Data final
      company?.name || '',
      company?.cnpj?.replace(/\D/g, '') || '',
      '', // UF
      '', // Município
      '', // Suframa
      '1', // Ind natureza PJ
      '0', // Ind atividade
    ]));
    recordCount++;

    // Registro 0001 - Abertura Bloco 0
    lines.push(this.buildEFDRecord('0001', ['0']));
    recordCount++;

    // Add transaction records (simplified)
    for (const tx of transactions || []) {
      if (tx.direction === 'saida') {
        lines.push(this.buildEFDRecord('A100', [
          '0', // Indicador
          tx.id,
          tx.transaction_date.replace(/-/g, ''),
          tx.total_amount.toFixed(2),
          '0.00', // PIS
          '0.00', // COFINS
        ]));
        recordCount++;
      }
    }

    // Registro 9999 - Encerramento
    lines.push(this.buildEFDRecord('9999', [recordCount.toString()]));

    const content = lines.join('\r\n');
    const hash = await this.calculateDigest(content);

    await this.logFiscalOperation('efd_contribuicoes', { period, record_count: recordCount });

    return {
      content,
      filename: `EFD_CONTRIBUICOES_${period.year}${period.month.toString().padStart(2, '0')}.txt`,
      period: `${period.month.toString().padStart(2, '0')}/${period.year}`,
      type: 'EFD_CONTRIBUICOES',
      hash,
      record_count: recordCount,
      generated_at: new Date().toISOString(),
    };
  }

  // =====================================================
  // EFD ICMS/IPI
  // =====================================================

  async generateEFDICMS(period: Period): Promise<EFDFile> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', period.company_id)
      .gte('transaction_date', `${period.year}-${period.month.toString().padStart(2, '0')}-01`)
      .lte('transaction_date', `${period.year}-${period.month.toString().padStart(2, '0')}-31`);

    const { data: company } = await supabase
      .from('companies')
      .select('*')
      .eq('id', period.company_id)
      .maybeSingle();

    const lines: string[] = [];
    let recordCount = 0;

    // Registro 0000 - Abertura
    lines.push(this.buildEFDRecord('0000', [
      '017', // Versão layout
      '0', // Finalidade
      `01${period.month.toString().padStart(2, '0')}${period.year}`,
      `${this.getLastDayOfMonth(period.year, period.month)}${period.month.toString().padStart(2, '0')}${period.year}`,
      company?.name || '',
      company?.cnpj?.replace(/\D/g, '') || '',
      '', // CPF
      '', // UF
      '', // IE
      '', // Código Município
      '', // IM
      '', // Suframa
      '0', // Perfil
      '1', // Ind atividade
    ]));
    recordCount++;

    // Add more blocks as needed...

    // Registro 9999 - Encerramento
    lines.push(this.buildEFDRecord('9999', [recordCount.toString()]));

    const content = lines.join('\r\n');
    const hash = await this.calculateDigest(content);

    await this.logFiscalOperation('efd_icms', { period, record_count: recordCount });

    return {
      content,
      filename: `EFD_ICMS_IPI_${period.year}${period.month.toString().padStart(2, '0')}.txt`,
      period: `${period.month.toString().padStart(2, '0')}/${period.year}`,
      type: 'EFD_ICMS_IPI',
      hash,
      record_count: recordCount,
      generated_at: new Date().toISOString(),
    };
  }

  private buildEFDRecord(registro: string, campos: string[]): string {
    return `|${registro}|${campos.join('|')}|`;
  }

  private getLastDayOfMonth(year: number, month: number): string {
    const lastDay = new Date(year, month, 0).getDate();
    return lastDay.toString().padStart(2, '0');
  }

  // =====================================================
  // REINF
  // =====================================================

  async generateREINF(period: Period): Promise<REINFFile> {
    const events: REINFEvent[] = [];

    // R-1000 - Informações do Contribuinte
    events.push({
      tipo: 'R-1000',
      id: `ID${Date.now()}`,
      data_evento: new Date().toISOString(),
      status: 'pending',
    });

    // R-2010 - Retenção Contribuição Previdenciária - Serviços Tomados
    const { data: payments } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', period.company_id)
      .eq('direction', 'saida')
      .gte('transaction_date', `${period.year}-${period.month.toString().padStart(2, '0')}-01`)
      .lte('transaction_date', `${period.year}-${period.month.toString().padStart(2, '0')}-31`);

    if (payments && payments.length > 0) {
      events.push({
        tipo: 'R-2010',
        id: `ID${Date.now()}R2010`,
        data_evento: new Date().toISOString(),
        status: 'pending',
      });
    }

    // R-2099 - Fechamento dos Eventos Periódicos
    events.push({
      tipo: 'R-2099',
      id: `ID${Date.now()}R2099`,
      data_evento: new Date().toISOString(),
      status: 'pending',
    });

    const content = JSON.stringify({ period, events }, null, 2);

    await this.logFiscalOperation('reinf', { period, events: events.length });

    return {
      content,
      filename: `REINF_${period.year}${period.month.toString().padStart(2, '0')}.json`,
      period: `${period.month.toString().padStart(2, '0')}/${period.year}`,
      events,
      generated_at: new Date().toISOString(),
    };
  }

  // =====================================================
  // eSocial
  // =====================================================

  async generateeSocial(period: Period): Promise<eSocialFile> {
    const events: eSocialEvent[] = [];

    // S-1200 - Remuneração de trabalhador vinculado ao RGPS
    const { data: funcionarios } = await supabase
      .from('funcionarios')
      .select('*')
      .eq('company_id', period.company_id)
      .eq('status', 'ativo');

    for (const func of funcionarios || []) {
      events.push({
        tipo: 'S-1200',
        id: `ID${Date.now()}${func.id}`,
        trabalhador_cpf: func.cpf,
        data_evento: new Date().toISOString(),
        status: 'pending',
      });
    }

    // S-1299 - Fechamento dos Eventos Periódicos
    events.push({
      tipo: 'S-1299',
      id: `ID${Date.now()}S1299`,
      data_evento: new Date().toISOString(),
      status: 'pending',
    });

    const content = JSON.stringify({ period, events }, null, 2);

    await this.logFiscalOperation('esocial', { period, events: events.length });

    return {
      content,
      filename: `ESOCIAL_${period.year}${period.month.toString().padStart(2, '0')}.json`,
      period: `${period.month.toString().padStart(2, '0')}/${period.year}`,
      events,
      generated_at: new Date().toISOString(),
    };
  }

  // =====================================================
  // VALIDATION METHODS
  // =====================================================

  validateCFOP(cfop: string): boolean {
    const cleaned = cfop.replace(/\D/g, '');
    return cleaned.length === 4 && VALID_CFOPS.hasOwnProperty(cleaned);
  }

  validateNCM(ncm: string): boolean {
    const cleaned = ncm.replace(/\D/g, '');
    if (cleaned.length !== 8) return false;
    const chapter = cleaned.substring(0, 2);
    return NCM_CHAPTERS.hasOwnProperty(chapter);
  }

  validateCFO(document: { cfop?: string; ncm?: string }): boolean {
    let valid = true;
    if (document.cfop && !this.validateCFOP(document.cfop)) valid = false;
    if (document.ncm && !this.validateNCM(document.ncm)) valid = false;
    return valid;
  }

  // =====================================================
  // LOGGING
  // =====================================================

  private async logFiscalOperation(operation: string, details: Record<string, unknown>): Promise<void> {
    try {
      // Log to audit_logs table
      await supabase.from('audit_logs').insert({
        company_id: this.companyId,
        action: `fiscal_${operation}`,
        table_name: 'fiscal_documents',
        new_values: details,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Failed to log fiscal operation:', error);
    }
  }
}

// =====================================================
// GOVERNMENT INTEGRATION CLASS
// =====================================================

export class GovernmentIntegration {
  private ambiente: '1' | '2';

  constructor(ambiente: '1' | '2' = '2') {
    this.ambiente = ambiente;
  }

  async submitNFeToReceita(nfe: NFeDocument): Promise<AuthorizationCode> {
    try {
      const { data, error } = await supabase.functions.invoke('fiscal-emit', {
        body: {
          action: 'authorize_nfe',
          xml: nfe.xml,
          chave: nfe.chave,
          ambiente: nfe.ambiente || this.ambiente,
          uf: nfe.uf_emitente,
        },
      });

      if (error) {
        return {
          success: false,
          status: '999',
          motivo: error.message,
        };
      }

      return data as AuthorizationCode;
    } catch (error) {
      return {
        success: false,
        status: '999',
        motivo: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  async queryCancelledNFe(nfeKey: string): Promise<StatusNFe> {
    try {
      const { data, error } = await supabase.functions.invoke('fiscal-emit', {
        body: {
          action: 'query_nfe',
          chave: nfeKey,
          ambiente: this.ambiente,
        },
      });

      if (error) {
        return {
          chave: nfeKey,
          status: 'rejeitada',
        };
      }

      return data as StatusNFe;
    } catch {
      return {
        chave: nfeKey,
        status: 'rejeitada',
      };
    }
  }

  async downloadEventsByNFe(nfeKey: string): Promise<NFEvent[]> {
    try {
      const { data, error } = await supabase.functions.invoke('fiscal-emit', {
        body: {
          action: 'get_events',
          chave: nfeKey,
          ambiente: this.ambiente,
        },
      });

      if (error || !data) return [];
      return data.events || [];
    } catch {
      return [];
    }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function getCFOPDescription(cfop: string): string {
  return VALID_CFOPS[cfop.replace(/\D/g, '')] || 'CFOP não encontrado';
}

export function getNCMChapter(ncm: string): string {
  const chapter = ncm.replace(/\D/g, '').substring(0, 2);
  return NCM_CHAPTERS[chapter] || 'Capítulo não encontrado';
}