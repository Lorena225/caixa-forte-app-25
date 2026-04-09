import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeDailySummary } from '@/hooks/hcm/useTimeTracking';

export interface PontoExportData {
  employeeName: string;
  companyName: string;
  month: number;
  year: number;
  records: TimeDailySummary[];
}

function formatTime(t?: string | null) {
  if (!t) return '-';
  return t.slice(0, 5);
}

function formatHours(h: number) {
  const signal = h < 0 ? '-' : '';
  const abs = Math.abs(h);
  const hh = Math.floor(abs);
  const mm = Math.round((abs - hh) * 60);
  return `${signal}${hh}h${mm.toString().padStart(2, '0')}`;
}

function buildRows(records: TimeDailySummary[]) {
  return records.map(r => ({
    data: format(parseISO(r.work_date + 'T12:00:00'), 'dd/MM/yyyy'),
    diaSemana: format(parseISO(r.work_date + 'T12:00:00'), 'EEE', { locale: ptBR }),
    entrada: formatTime(r.entry_1),
    saidaAlmoco: formatTime(r.exit_1),
    retornoAlmoco: formatTime(r.entry_2),
    saida: formatTime(r.exit_2),
    trabalhadas: formatHours(r.worked_hours),
    intervalo: formatHours(r.break_hours),
    banco: formatHours(r.bank_hours),
    tipo: r.is_weekend ? 'Fim de semana' : r.is_holiday ? 'Feriado' : r.absence_type ? r.absence_type : 'Normal',
  }));
}

export function exportPontoExcel({ employeeName, companyName, month, year, records }: PontoExportData) {
  const mesNome = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });
  const rows = buildRows(records);

  const headers = ['Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno', 'Saída', 'Trabalhadas', 'Intervalo', 'Banco de Horas', 'Tipo'];
  const dataRows = rows.map(r => [r.data, r.diaSemana, r.entrada, r.saidaAlmoco, r.retornoAlmoco, r.saida, r.trabalhadas, r.intervalo, r.banco, r.tipo]);

  const totalTrabalhadas = records.reduce((s, r) => s + r.worked_hours, 0);
  const totalBanco = records.reduce((s, r) => s + r.bank_hours, 0);

  const wsData = [
    [`CONTROLE DE PONTO — ${employeeName.toUpperCase()}`],
    [`Empresa: ${companyName} | Referência: ${mesNome}`],
    [],
    headers,
    ...dataRows,
    [],
    ['', '', '', '', '', 'TOTAL', formatHours(totalTrabalhadas), '', formatHours(totalBanco), ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Larguras de coluna
  ws['!cols'] = [{ wch: 12 }, { wch: 6 }, { wch: 8 }, { wch: 13 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 13 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, mesNome);
  XLSX.writeFile(wb, `ponto_${employeeName.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.xlsx`);
}

export function exportPontoPDF({ employeeName, companyName, month, year, records }: PontoExportData) {
  const mesNome = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });
  const rows = buildRows(records);

  const totalTrabalhadas = records.reduce((s, r) => s + r.worked_hours, 0);
  const totalBanco = records.reduce((s, r) => s + r.bank_hours, 0);

  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(`CONTROLE DE PONTO`, 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Colaborador: ${employeeName}`, 14, 22);
  doc.text(`Empresa: ${companyName}`, 14, 28);
  doc.text(`Referência: ${mesNome}`, 14, 34);

  autoTable(doc, {
    startY: 40,
    head: [['Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno', 'Saída', 'Trabalhadas', 'Intervalo', 'Banco', 'Tipo']],
    body: [
      ...rows.map(r => [r.data, r.diaSemana, r.entrada, r.saidaAlmoco, r.retornoAlmoco, r.saida, r.trabalhadas, r.intervalo, r.banco, r.tipo]),
      ['', '', '', '', '', 'TOTAL', formatHours(totalTrabalhadas), '', formatHours(totalBanco), ''],
    ],
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: { 9: { cellWidth: 22 } },
  });

  doc.save(`ponto_${employeeName.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.pdf`);
}
