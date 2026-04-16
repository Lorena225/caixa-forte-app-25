import jsPDF from 'jspdf';
import type { PayrollPeriod, PayrollEntry } from '@/hooks/hcm/usePayroll';

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
];

function moeda(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function linha(doc: jsPDF, y: number): number {
  doc.setDrawColor(220, 220, 220);
  doc.line(14, y, 196, y);
  return y + 1;
}

function holeritePorFuncionario(
  doc: jsPDF,
  entry: PayrollEntry,
  period: PayrollPeriod,
  empresaNome: string,
  isFirst: boolean,
): void {
  if (!isFirst) doc.addPage();

  const nomeFuncionario = entry.employee?.full_name ?? 'Funcionário';
  const matricula = entry.employee?.registration_number ?? '—';
  const mesAno = `${MESES[(period.reference_month ?? 1) - 1]} / ${period.reference_year}`;

  let y = 14;

  // ── Cabeçalho ──────────────────────────────────────────────────────────────
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(14, y, 182, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('HOLERITE DE PAGAMENTO', 105, y + 8, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(mesAno, 105, y + 14, { align: 'center' });
  y += 22;

  // ── Dados da empresa ───────────────────────────────────────────────────────
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(empresaNome.toUpperCase(), 14, y);
  y += 5;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Competência: ' + mesAno, 14, y);
  if (period.payment_date) {
    const dtPgto = new Date(period.payment_date + 'T00:00:00');
    doc.text('Data de Pagamento: ' + dtPgto.toLocaleDateString('pt-BR'), 105, y);
  }
  y += 8;
  y = linha(doc, y) + 4;

  // ── Dados do funcionário ───────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('FUNCIONÁRIO', 14, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(nomeFuncionario, 14, y);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Matrícula: ' + matricula, 14, y + 5);
  doc.text('Dias Trabalhados: ' + (entry.worked_days ?? 0), 105, y + 5);
  y += 14;
  y = linha(doc, y) + 4;

  // ── Tabela de proventos e descontos ────────────────────────────────────────
  const colDesc  = 14;
  const colTipo  = 130;
  const colValor = 196;

  // Cabeçalho da tabela
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y - 3, 182, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('DESCRIÇÃO', colDesc, y + 3);
  doc.text('TIPO', colTipo, y + 3);
  doc.text('VALOR', colValor, y + 3, { align: 'right' });
  y += 9;
  y = linha(doc, y) + 2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  const itens: { desc: string; tipo: 'Provento' | 'Desconto'; valor: number }[] = [];

  // Proventos
  itens.push({ desc: 'Salário Base', tipo: 'Provento', valor: entry.salary_amount ?? entry.base_salary });
  if ((entry.overtime_50_amount ?? 0) > 0)
    itens.push({ desc: `Hora Extra 50% (${(entry.overtime_50_hours ?? 0).toFixed(1)}h)`, tipo: 'Provento', valor: entry.overtime_50_amount });
  if ((entry.overtime_100_amount ?? 0) > 0)
    itens.push({ desc: `Hora Extra 100% (${(entry.overtime_100_hours ?? 0).toFixed(1)}h)`, tipo: 'Provento', valor: entry.overtime_100_amount });
  if ((entry.night_amount ?? 0) > 0)
    itens.push({ desc: `Adicional Noturno (${(entry.night_hours ?? 0).toFixed(1)}h)`, tipo: 'Provento', valor: entry.night_amount });
  if ((entry.commission_amount ?? 0) > 0)
    itens.push({ desc: 'Comissões', tipo: 'Provento', valor: entry.commission_amount });
  if ((entry.bonus_amount ?? 0) > 0)
    itens.push({ desc: 'Bônus', tipo: 'Provento', valor: entry.bonus_amount });

  // Descontos
  itens.push({ desc: 'INSS', tipo: 'Desconto', valor: entry.inss_amount });
  itens.push({ desc: 'IRRF', tipo: 'Desconto', valor: entry.irrf_amount });

  for (const item of itens) {
    if (item.valor === 0) continue;
    const isDesconto = item.tipo === 'Desconto';
    doc.setTextColor(30, 41, 59);
    doc.text(item.desc, colDesc, y);
    doc.setTextColor(isDesconto ? 185 : 22, isDesconto ? 28 : 163, isDesconto ? 28 : 74);
    doc.text(item.tipo, colTipo, y);
    doc.text((isDesconto ? '- ' : '+ ') + moeda(item.valor), colValor, y, { align: 'right' });
    y += 7;
  }

  y += 2;
  y = linha(doc, y) + 4;

  // ── Totais ─────────────────────────────────────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  doc.text('Total de Proventos:', colDesc, y);
  doc.text(moeda(entry.total_earnings), colValor, y, { align: 'right' });
  y += 6;
  doc.text('Total de Descontos:', colDesc, y);
  doc.setTextColor(185, 28, 28);
  doc.text('- ' + moeda(entry.total_deductions), colValor, y, { align: 'right' });
  y += 6;
  doc.setTextColor(30, 41, 59);
  doc.text('FGTS (encargo empresa):', colDesc, y);
  doc.setTextColor(100, 116, 139);
  doc.text(moeda(entry.fgts_amount), colValor, y, { align: 'right' });
  y += 8;

  // Salário líquido em destaque
  doc.setFillColor(22, 163, 74); // green-600
  doc.rect(14, y - 4, 182, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SALÁRIO LÍQUIDO', 20, y + 4);
  doc.text(moeda(entry.net_salary), colValor, y + 4, { align: 'right' });
  y += 18;

  // ── Rodapé ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Tabela INSS: Portaria MPS nº 1.730/2024 | Tabela IRRF: IN RFB 2.178/2024 | Documento gerado pelo sistema Vitrio',
    105,
    285,
    { align: 'center' },
  );
}

export async function gerarHoleritePDF(
  period: PayrollPeriod,
  entries: PayrollEntry[],
  empresaNome: string,
): Promise<void> {
  if (entries.length === 0) {
    throw new Error('Nenhum funcionário calculado neste período.');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  entries.forEach((entry, idx) => {
    holeritePorFuncionario(doc, entry, period, empresaNome, idx === 0);
  });

  const mesAno = `${MESES[(period.reference_month ?? 1) - 1]}_${period.reference_year}`;
  doc.save(`Holerites_${mesAno}.pdf`);
}
