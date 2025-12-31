import * as XLSX from 'xlsx';
import type { ImportTemplate, TemplateColumn } from './types';

/**
 * Generate an Excel template file from a template definition
 */
export function generateTemplate(template: ImportTemplate): Blob {
  const workbook = XLSX.utils.book_new();
  
  // 1. Create DATA sheet with headers
  const headers = template.columns_json.map(col => col.label);
  const dataSheet = XLSX.utils.aoa_to_sheet([headers]);
  
  // Add sample data if available
  if (template.sample_data_json && template.sample_data_json.length > 0) {
    template.sample_data_json.forEach((sample, index) => {
      const row = template.columns_json.map(col => sample[col.name] ?? '');
      XLSX.utils.sheet_add_aoa(dataSheet, [row], { origin: index + 1 });
    });
  }
  
  // Set column widths
  const colWidths = template.columns_json.map(col => ({
    wch: Math.max(col.label.length, 15)
  }));
  dataSheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, dataSheet, 'DADOS');
  
  // 2. Create INSTRUCTIONS sheet
  const instructionsData: string[][] = [
    ['INSTRUÇÕES DE PREENCHIMENTO'],
    [''],
    [`Modelo: ${template.name}`],
    [`Descrição: ${template.description}`],
    [''],
    ['COLUNAS:'],
  ];
  
  template.columns_json.forEach(col => {
    const required = col.required ? '(OBRIGATÓRIO)' : '(opcional)';
    let info = `• ${col.label} ${required}`;
    
    if (col.description) {
      info += ` - ${col.description}`;
    }
    
    if (col.type === 'enum' && col.options) {
      info += ` [Valores aceitos: ${col.options.join(', ')}]`;
    }
    
    if (col.type === 'date') {
      info += ' [Formato: dd/mm/aaaa ou aaaa-mm-dd]';
    }
    
    if (col.type === 'currency') {
      info += ' [Formato: 1500,00 ou R$ 1.500,00]';
    }
    
    if (col.type === 'boolean') {
      info += ' [Valores: SIM/NÃO ou S/N]';
    }
    
    if (col.default !== undefined) {
      info += ` [Padrão: ${col.default}]`;
    }
    
    instructionsData.push([info]);
  });
  
  instructionsData.push(['']);
  instructionsData.push(['DICAS:']);
  
  template.instructions_json.forEach(instruction => {
    instructionsData.push([`• ${instruction}`]);
  });
  
  instructionsData.push(['']);
  instructionsData.push(['IMPORTANTE:']);
  instructionsData.push(['• Não altere os nomes das colunas na aba DADOS']);
  instructionsData.push(['• Preencha a partir da linha 2 (linha 1 é o cabeçalho)']);
  instructionsData.push(['• A coluna "Chave Externa" ajuda a evitar duplicatas em importações futuras']);
  
  const instructionsSheet = XLSX.utils.aoa_to_sheet(instructionsData);
  instructionsSheet['!cols'] = [{ wch: 100 }];
  
  XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'INSTRUÇÕES');
  
  // 3. Create DICTIONARY sheet
  const dictionaryData: string[][] = [
    ['Campo', 'Nome Técnico', 'Tipo', 'Obrigatório', 'Descrição', 'Valores Aceitos'],
  ];
  
  template.columns_json.forEach(col => {
    dictionaryData.push([
      col.label,
      col.name,
      getTypeLabel(col.type),
      col.required ? 'Sim' : 'Não',
      col.description || '-',
      col.options ? col.options.join(', ') : getTypeHint(col.type),
    ]);
  });
  
  const dictionarySheet = XLSX.utils.aoa_to_sheet(dictionaryData);
  dictionarySheet['!cols'] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
    { wch: 30 },
  ];
  
  XLSX.utils.book_append_sheet(workbook, dictionarySheet, 'DICIONÁRIO');
  
  // Generate file
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

function getTypeLabel(type: TemplateColumn['type']): string {
  const labels: Record<TemplateColumn['type'], string> = {
    text: 'Texto',
    date: 'Data',
    currency: 'Moeda',
    decimal: 'Decimal',
    integer: 'Inteiro',
    boolean: 'Sim/Não',
    enum: 'Lista',
  };
  return labels[type];
}

function getTypeHint(type: TemplateColumn['type']): string {
  const hints: Record<TemplateColumn['type'], string> = {
    text: 'Texto livre',
    date: 'dd/mm/aaaa',
    currency: '1.500,00 ou 1500.00',
    decimal: '10,5 ou 10.5',
    integer: 'Número inteiro',
    boolean: 'SIM, NÃO, S, N',
    enum: 'Ver lista de valores',
  };
  return hints[type];
}

/**
 * Download a template file
 */
export function downloadTemplate(template: ImportTemplate): void {
  const blob = generateTemplate(template);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modelo_${template.entity}_v${template.version}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
