import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

// ======================== TYPES ========================

export interface Transaction {
  id: string;
  description: string;
  direction: 'entrada' | 'saida';
  total_amount: number;
  transaction_date: string;
  status: string;
  category?: { name: string } | null;
}

export interface HealthDiagnostic {
  status: 'excellent' | 'good' | 'attention' | 'risk';
  savingsRate: number;
  fixedCostsPercentage: number;
  projectedEndBalance: number;
}

export interface ExportReportData {
  companyName: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  saldoCaixa: number;
  contasReceber: number;
  contasPagar: number;
  totalReceitas: number;
  totalDespesas: number;
  transactions: Transaction[];
  healthDiagnostic?: HealthDiagnostic | null;
  goalsAchieved?: Array<{ name: string; target: number; current: number }>;
}

export type ExportFormat = 'pdf' | 'xlsx' | 'docx';

// ======================== PDF EXPORT ========================

export async function exportReportPDF(data: ExportReportData): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 20;

  // Helper function to add centered text
  const addCenteredText = (text: string, y: number, fontSize: number = 12, style: 'normal' | 'bold' = 'normal') => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', style);
    doc.text(text, pageWidth / 2, y, { align: 'center' });
  };

  // Helper to add section title
  const addSectionTitle = (title: string, y: number) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 33, 33);
    doc.text(title, margin, y);
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.5);
    doc.line(margin, y + 2, pageWidth - margin, y + 2);
    return y + 12;
  };

  // ===== HEADER =====
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 45, 'F');
  
  doc.setTextColor(255, 255, 255);
  addCenteredText('RELATÓRIO FINANCEIRO', 18, 18, 'bold');
  addCenteredText(data.companyName, 28, 12);
  addCenteredText(`Período: ${data.period}`, 38, 10);

  yPosition = 60;
  doc.setTextColor(33, 33, 33);

  // ===== RESUMO EXECUTIVO =====
  yPosition = addSectionTitle('Resumo Executivo', yPosition);

  // KPI Cards
  const kpiData = [
    { label: 'Saldo em Caixa', value: formatCurrency(data.saldoCaixa), color: [34, 197, 94] as [number, number, number] },
    { label: 'Contas a Receber', value: formatCurrency(data.contasReceber), color: [59, 130, 246] as [number, number, number] },
    { label: 'Contas a Pagar', value: formatCurrency(data.contasPagar), color: [239, 68, 68] as [number, number, number] },
  ];

  const cardWidth = (pageWidth - margin * 2 - 20) / 3;
  kpiData.forEach((kpi, index) => {
    const x = margin + (cardWidth + 10) * index;
    
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPosition, cardWidth, 30, 3, 3, 'F');
    
    doc.setDrawColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.setLineWidth(1);
    doc.line(x, yPosition, x, yPosition + 30);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 8, yPosition + 10);
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 8, yPosition + 22);
  });

  yPosition += 45;

  // ===== DIAGNÓSTICO DE SAÚDE FINANCEIRA =====
  if (data.healthDiagnostic) {
    yPosition = addSectionTitle('Diagnóstico de Saúde Financeira', yPosition);

    const statusLabels = {
      excellent: 'Excelente',
      good: 'Boa',
      attention: 'Atenção',
      risk: 'Risco',
    };
    
    const statusColors = {
      excellent: [34, 197, 94] as [number, number, number],
      good: [59, 130, 246] as [number, number, number],
      attention: [245, 158, 11] as [number, number, number],
      risk: [239, 68, 68] as [number, number, number],
    };

    const color = statusColors[data.healthDiagnostic.status];
    
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(margin, yPosition, 80, 25, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Status: ${statusLabels[data.healthDiagnostic.status]}`, margin + 8, yPosition + 15);

    doc.setTextColor(33, 33, 33);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const healthInfo = [
      `Taxa de Poupança: ${data.healthDiagnostic.savingsRate.toFixed(1)}%`,
      `Custos Fixos: ${data.healthDiagnostic.fixedCostsPercentage.toFixed(1)}% da receita`,
      `Projeção Fim do Mês: ${formatCurrency(data.healthDiagnostic.projectedEndBalance)}`,
    ];
    
    healthInfo.forEach((info, i) => {
      doc.text(info, margin + 90, yPosition + 8 + (i * 8));
    });

    yPosition += 35;
  }

  // ===== RECEITAS VS DESPESAS =====
  yPosition = addSectionTitle('Receitas vs Despesas', yPosition);

  const saldo = data.totalReceitas - data.totalDespesas;
  const saldoPositivo = saldo >= 0;
  const maxValue = Math.max(data.totalReceitas, data.totalDespesas) || 1;
  const barMaxWidth = pageWidth - margin * 2 - 80;

  // Receitas bar
  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);
  doc.text('Receitas', margin, yPosition + 8);
  
  doc.setFillColor(34, 197, 94);
  const receitasWidth = Math.max((data.totalReceitas / maxValue) * barMaxWidth, 5);
  doc.roundedRect(margin + 55, yPosition + 2, receitasWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(34, 197, 94);
  doc.text(formatCurrency(data.totalReceitas), margin + 60 + receitasWidth, yPosition + 8);

  yPosition += 18;

  // Despesas bar
  doc.setTextColor(33, 33, 33);
  doc.text('Despesas', margin, yPosition + 8);
  
  doc.setFillColor(239, 68, 68);
  const despesasWidth = Math.max((data.totalDespesas / maxValue) * barMaxWidth, 5);
  doc.roundedRect(margin + 55, yPosition + 2, despesasWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(239, 68, 68);
  doc.text(formatCurrency(data.totalDespesas), margin + 60 + despesasWidth, yPosition + 8);

  yPosition += 25;

  // Saldo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(saldoPositivo ? 34 : 239, saldoPositivo ? 197 : 68, saldoPositivo ? 94 : 68);
  doc.text(`Saldo do Período: ${formatCurrency(saldo)}`, margin, yPosition);

  yPosition += 20;

  // ===== TRANSAÇÕES =====
  if (data.transactions.length > 0) {
    yPosition = addSectionTitle('Transações do Período', yPosition);

    const tableData = data.transactions.slice(0, 20).map(t => [
      format(new Date(t.transaction_date), 'dd/MM/yyyy'),
      t.description.substring(0, 35) + (t.description.length > 35 ? '...' : ''),
      t.category?.name || '-',
      t.direction === 'entrada' ? 'Receita' : 'Despesa',
      formatCurrency(t.total_amount),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
      },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 55 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin, right: margin },
    });
  }

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Save the PDF
  const fileName = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

// ======================== EXCEL EXPORT ========================

export async function exportReportExcel(data: ExportReportData): Promise<void> {
  const workbook = XLSX.utils.book_new();
  
  // ===== SHEET 1: RESUMO =====
  const resumoData = [
    ['RELATÓRIO FINANCEIRO'],
    [data.companyName],
    [`Período: ${data.period}`],
    [],
    ['RESUMO EXECUTIVO'],
    ['Indicador', 'Valor'],
    ['Saldo em Caixa', data.saldoCaixa],
    ['Contas a Receber', data.contasReceber],
    ['Contas a Pagar', data.contasPagar],
    ['Total Receitas', data.totalReceitas],
    ['Total Despesas', data.totalDespesas],
    ['Saldo do Período', data.totalReceitas - data.totalDespesas],
    [],
    ['DIAGNÓSTICO DE SAÚDE'],
  ];

  if (data.healthDiagnostic) {
    const statusLabels = {
      excellent: 'Excelente',
      good: 'Boa',
      attention: 'Atenção',
      risk: 'Risco',
    };
    resumoData.push(
      ['Status Geral', statusLabels[data.healthDiagnostic.status]],
      ['Taxa de Poupança (%)', data.healthDiagnostic.savingsRate],
      ['Custos Fixos (%)', data.healthDiagnostic.fixedCostsPercentage],
      ['Projeção Fim do Mês', data.healthDiagnostic.projectedEndBalance]
    );
  }

  const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
  resumoSheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

  // ===== SHEET 2: TRANSAÇÕES =====
  const transacoesHeaders = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status'];
  const transacoesRows = data.transactions.map(t => [
    format(new Date(t.transaction_date), 'dd/MM/yyyy'),
    t.description,
    t.category?.name || '-',
    t.direction === 'entrada' ? 'Receita' : 'Despesa',
    t.total_amount,
    t.status,
  ]);

  const transacoesData = [transacoesHeaders, ...transacoesRows];
  const transacoesSheet = XLSX.utils.aoa_to_sheet(transacoesData);
  transacoesSheet['!cols'] = [
    { wch: 12 },
    { wch: 40 },
    { wch: 20 },
    { wch: 12 },
    { wch: 15 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, transacoesSheet, 'Transações');

  // ===== SHEET 3: TOTAIS POR CATEGORIA =====
  const categorias = new Map<string, { receitas: number; despesas: number }>();
  
  data.transactions.forEach(t => {
    const cat = t.category?.name || 'Sem Categoria';
    const current = categorias.get(cat) || { receitas: 0, despesas: 0 };
    if (t.direction === 'entrada') {
      current.receitas += t.total_amount;
    } else {
      current.despesas += t.total_amount;
    }
    categorias.set(cat, current);
  });

  const categoriasHeaders = ['Categoria', 'Receitas', 'Despesas', 'Saldo'];
  const categoriasRows = Array.from(categorias.entries()).map(([cat, vals]) => [
    cat,
    vals.receitas,
    vals.despesas,
    vals.receitas - vals.despesas,
  ]);

  const categoriasData = [categoriasHeaders, ...categoriasRows];
  const categoriasSheet = XLSX.utils.aoa_to_sheet(categoriasData);
  categoriasSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, categoriasSheet, 'Por Categoria');

  // Save
  const fileName = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
}

// ======================== WORD EXPORT ========================

export async function exportReportWord(data: ExportReportData): Promise<void> {
  const saldo = data.totalReceitas - data.totalDespesas;
  
  const statusLabels = {
    excellent: 'Excelente',
    good: 'Boa',
    attention: 'Atenção',
    risk: 'Risco',
  };

  const children: (Paragraph | Table)[] = [
    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: 'RELATÓRIO FINANCEIRO',
          bold: true,
          size: 36,
          color: '3B82F6',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),

    // Company Name
    new Paragraph({
      children: [
        new TextRun({
          text: data.companyName,
          size: 28,
          color: '374151',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),

    // Period
    new Paragraph({
      children: [
        new TextRun({
          text: `Período: ${data.period}`,
          size: 22,
          color: '6B7280',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),

    // Executive Summary Header
    new Paragraph({
      text: 'Resumo Executivo',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    }),

    // KPI Table
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            createTableCell('Indicador', true),
            createTableCell('Valor', true),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Saldo em Caixa'),
            createTableCell(formatCurrency(data.saldoCaixa)),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Contas a Receber'),
            createTableCell(formatCurrency(data.contasReceber)),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Contas a Pagar'),
            createTableCell(formatCurrency(data.contasPagar)),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Total Receitas'),
            createTableCell(formatCurrency(data.totalReceitas)),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Total Despesas'),
            createTableCell(formatCurrency(data.totalDespesas)),
          ],
        }),
        new TableRow({
          children: [
            createTableCell('Saldo do Período', true),
            createTableCell(formatCurrency(saldo), true, saldo >= 0 ? '22C55E' : 'EF4444'),
          ],
        }),
      ],
    }),
  ];

  // Health Diagnostic Section
  if (data.healthDiagnostic) {
    children.push(
      new Paragraph({
        text: 'Diagnóstico de Saúde Financeira',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Status Geral: ', bold: true }),
          new TextRun({
            text: statusLabels[data.healthDiagnostic.status],
            bold: true,
            color: data.healthDiagnostic.status === 'excellent' || data.healthDiagnostic.status === 'good'
              ? '22C55E'
              : data.healthDiagnostic.status === 'attention'
              ? 'F59E0B'
              : 'EF4444',
          }),
        ],
        spacing: { after: 100 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Taxa de Poupança: ' }),
          new TextRun({ text: `${data.healthDiagnostic.savingsRate.toFixed(1)}%` }),
        ],
        spacing: { after: 100 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Custos Fixos: ' }),
          new TextRun({ text: `${data.healthDiagnostic.fixedCostsPercentage.toFixed(1)}% da receita` }),
        ],
        spacing: { after: 100 },
      }),

      new Paragraph({
        children: [
          new TextRun({ text: 'Projeção para o Fim do Mês: ' }),
          new TextRun({ text: formatCurrency(data.healthDiagnostic.projectedEndBalance) }),
        ],
        spacing: { after: 200 },
      })
    );
  }

  // Goals Section
  if (data.goalsAchieved && data.goalsAchieved.length > 0) {
    children.push(
      new Paragraph({
        text: 'Metas Atingidas no Período',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );

    data.goalsAchieved.forEach(goal => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '✓ ', color: '22C55E' }),
            new TextRun({ text: goal.name, bold: true }),
            new TextRun({ text: ` - Meta: ${formatCurrency(goal.target)}, Alcançado: ${formatCurrency(goal.current)}` }),
          ],
          spacing: { after: 100 },
        })
      );
    });
  }

  // Footer
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Relatório gerado em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
          size: 18,
          color: '9CA3AF',
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 600 },
    })
  );

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const fileName = `relatorio-financeiro-${format(new Date(), 'yyyy-MM-dd')}.docx`;
  saveAs(blob, fileName);
}

// Helper function for Word tables
function createTableCell(text: string, bold = false, color?: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold,
            color: color || '374151',
          }),
        ],
      }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'E5E7EB' },
    },
  });
}

// ======================== UNIFIED EXPORT FUNCTION ========================

export async function exportReport(format: ExportFormat, data: ExportReportData): Promise<void> {
  switch (format) {
    case 'pdf':
      await exportReportPDF(data);
      break;
    case 'xlsx':
      await exportReportExcel(data);
      break;
    case 'docx':
      await exportReportWord(data);
      break;
    default:
      throw new Error(`Formato não suportado: ${format}`);
  }
}
