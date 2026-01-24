import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';

interface Transaction {
  id: string;
  description: string;
  direction: 'entrada' | 'saida';
  total_amount: number;
  transaction_date: string;
  status: string;
  category?: { name: string } | null;
}

interface ExportData {
  companyName: string;
  period: string;
  saldoCaixa: number;
  contasReceber: number;
  contasPagar: number;
  totalReceitas: number;
  totalDespesas: number;
  transactions: Transaction[];
  categoriesData?: { name: string; value: number }[];
}

export async function exportMonthlyReportPDF(data: ExportData): Promise<void> {
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
  addCenteredText('RELATÓRIO FINANCEIRO MENSAL', 18, 18, 'bold');
  addCenteredText(data.companyName, 28, 12);
  addCenteredText(`Período: ${data.period}`, 38, 10);

  yPosition = 60;
  doc.setTextColor(33, 33, 33);

  // ===== RESUMO EXECUTIVO =====
  yPosition = addSectionTitle('Resumo Executivo', yPosition);

  // KPI Cards simulation
  const kpiData = [
    { label: 'Saldo em Caixa', value: formatCurrency(data.saldoCaixa), color: [34, 197, 94] },
    { label: 'Contas a Receber', value: formatCurrency(data.contasReceber), color: [59, 130, 246] },
    { label: 'Contas a Pagar', value: formatCurrency(data.contasPagar), color: [239, 68, 68] },
  ];

  const cardWidth = (pageWidth - margin * 2 - 20) / 3;
  kpiData.forEach((kpi, index) => {
    const x = margin + (cardWidth + 10) * index;
    
    // Card background
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, yPosition, cardWidth, 30, 3, 3, 'F');
    
    // Card border
    doc.setDrawColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.setLineWidth(1);
    doc.line(x, yPosition, x, yPosition + 30);
    
    // Label
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 8, yPosition + 10);
    
    // Value
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.text(kpi.value, x + 8, yPosition + 22);
  });

  yPosition += 45;

  // ===== RECEITAS VS DESPESAS =====
  yPosition = addSectionTitle('Receitas vs Despesas', yPosition);

  const saldo = data.totalReceitas - data.totalDespesas;
  const saldoPositivo = saldo >= 0;

  // Simple bar visualization
  const maxValue = Math.max(data.totalReceitas, data.totalDespesas);
  const barMaxWidth = pageWidth - margin * 2 - 80;

  // Receitas bar
  doc.setFontSize(10);
  doc.setTextColor(33, 33, 33);
  doc.text('Receitas', margin, yPosition + 8);
  
  doc.setFillColor(34, 197, 94);
  const receitasWidth = (data.totalReceitas / maxValue) * barMaxWidth;
  doc.roundedRect(margin + 55, yPosition + 2, receitasWidth, 10, 2, 2, 'F');
  
  doc.setTextColor(34, 197, 94);
  doc.text(formatCurrency(data.totalReceitas), margin + 60 + receitasWidth, yPosition + 8);

  yPosition += 18;

  // Despesas bar
  doc.setTextColor(33, 33, 33);
  doc.text('Despesas', margin, yPosition + 8);
  
  doc.setFillColor(239, 68, 68);
  const despesasWidth = (data.totalDespesas / maxValue) * barMaxWidth;
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

  // ===== ÚLTIMAS TRANSAÇÕES =====
  yPosition = addSectionTitle('Últimas 10 Transações', yPosition);

  const tableData = data.transactions.slice(0, 10).map(t => [
    format(new Date(t.transaction_date), 'dd/MM/yyyy'),
    t.description.substring(0, 30) + (t.description.length > 30 ? '...' : ''),
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
      1: { cellWidth: 50 },
      2: { cellWidth: 35 },
      3: { cellWidth: 25 },
      4: { cellWidth: 30, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  });

  // ===== FOOTER =====
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    // Footer text
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Gerado automaticamente em ${format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
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
  const fileName = `relatorio-mensal-${format(new Date(), 'yyyy-MM')}.pdf`;
  doc.save(fileName);
}
