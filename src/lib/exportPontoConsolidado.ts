import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { TimeDailySummary } from '@/hooks/hcm/useTimeTracking';
import type { EmployeeProfile } from '@/hooks/hcm/useEmployees';

export interface ConsolidadoRow {
  employee: EmployeeProfile;
  records: TimeDailySummary[];
}

function fmtH(h: number) {
  const s = h < 0 ? '-' : '';
  const a = Math.abs(h);
  return `${s}${Math.floor(a)}h${Math.round((a % 1) * 60).toString().padStart(2, '0')}`;
}

export function exportConsolidadoExcel(
  rows: ConsolidadoRow[],
  month: number,
  year: number,
  companyName = 'Empresa'
) {
  const mesNome = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });
  const wb = XLSX.utils.book_new();

  // Aba RESUMO
  const resumo: (string | number)[][] = [
    [`ESPELHO DE PONTO CONSOLIDADO — ${companyName.toUpperCase()}`],
    [`Referência: ${mesNome}   |   Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`],
    [],
    ['Colaborador', 'Contrato', 'Dias trabalhados', 'Total horas', 'Esperado', 'Banco de horas', 'Faltas'],
  ];

  for (const { employee: emp, records } of rows) {
    const diasTrab = records.filter(r => r.worked_hours > 0).length;
    const totalH = records.reduce((s, r) => s + r.worked_hours, 0);
    const esperado = records.filter(r => !r.is_weekend && !r.is_holiday).length * (emp.weekly_hours / 5);
    const banco = records.reduce((s, r) => s + r.bank_hours, 0);
    const faltas = records.filter(r => !r.is_weekend && !r.is_holiday && r.worked_hours === 0 && !r.absence_type).length;
    resumo.push([emp.full_name, emp.contract_type.toUpperCase(), diasTrab, fmtH(totalH), fmtH(esperado), fmtH(banco), faltas]);
  }

  const wsResumo = XLSX.utils.aoa_to_sheet(resumo);
  wsResumo['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 15 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

  // Uma aba por colaborador
  for (const { employee: emp, records } of rows) {
    const header = ['Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno', 'Saída', 'Trabalhadas', 'Banco', 'Obs'];
    const dataRows = records.map(r => {
      const d = parseISO(r.work_date + 'T12:00:00');
      return [
        format(d, 'dd/MM/yyyy'),
        format(d, 'EEE', { locale: ptBR }),
        r.entry_1?.slice(0, 5) || '-',
        r.exit_1?.slice(0, 5) || '-',
        r.entry_2?.slice(0, 5) || '-',
        r.exit_2?.slice(0, 5) || '-',
        fmtH(r.worked_hours),
        fmtH(r.bank_hours),
        r.is_weekend ? 'Fim semana' : r.is_holiday ? 'Feriado' : r.absence_type || '',
      ];
    });
    const totalH = records.reduce((s, r) => s + r.worked_hours, 0);
    const totalBanco = records.reduce((s, r) => s + r.bank_hours, 0);

    const wsData = [
      [`${emp.full_name} — ${mesNome}`],
      [`CPF: ${emp.cpf || '-'}   |   Cargo: ${(emp as any).cargo?.nome || '-'}   |   Contrato: ${emp.contract_type.toUpperCase()}`],
      [],
      header,
      ...dataRows,
      [],
      ['', '', '', '', '', 'TOTAL', fmtH(totalH), fmtH(totalBanco), ''],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 12 }, { wch: 5 }, { wch: 8 }, { wch: 13 }, { wch: 10 }, { wch: 8 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    const sheetName = emp.full_name.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  XLSX.writeFile(wb, `ponto_consolidado_${companyName.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.xlsx`);
}

export function exportConsolidadoPDF(
  rows: ConsolidadoRow[],
  month: number,
  year: number,
  companyName = 'Empresa'
) {
  const mesNome = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR });
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ESPELHO DE PONTO CONSOLIDADO', 14, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyName}   |   ${mesNome}   |   Gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 22);

  // Tabela resumo
  autoTable(doc, {
    startY: 28,
    head: [['Colaborador', 'Contrato', 'Dias trab.', 'Total horas', 'Esperado', 'Banco', 'Faltas']],
    body: rows.map(({ employee: emp, records }) => {
      const diasTrab = records.filter(r => r.worked_hours > 0).length;
      const totalH = records.reduce((s, r) => s + r.worked_hours, 0);
      const esperado = records.filter(r => !r.is_weekend && !r.is_holiday).length * (emp.weekly_hours / 5);
      const banco = records.reduce((s, r) => s + r.bank_hours, 0);
      const faltas = records.filter(r => !r.is_weekend && !r.is_holiday && r.worked_hours === 0 && !r.absence_type).length;
      return [emp.full_name, emp.contract_type.toUpperCase(), diasTrab, fmtH(totalH), fmtH(esperado), fmtH(banco), faltas];
    }),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [99, 102, 241] },
    alternateRowStyles: { fillColor: [245, 247, 250] },
  });

  // Detalhe por colaborador
  for (const { employee: emp, records } of rows) {
    doc.addPage();
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(emp.full_name, 14, 15);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CPF: ${emp.cpf || '-'}   |   ${mesNome}   |   ${emp.contract_type.toUpperCase()}`, 14, 22);

    const totalH = records.reduce((s, r) => s + r.worked_hours, 0);
    const totalBanco = records.reduce((s, r) => s + r.bank_hours, 0);

    autoTable(doc, {
      startY: 27,
      head: [['Data', 'Dia', 'Entrada', 'Saída Almoço', 'Retorno', 'Saída', 'Trabalhadas', 'Banco', 'Obs']],
      body: [
        ...records.map(r => {
          const d = parseISO(r.work_date + 'T12:00:00');
          return [
            format(d, 'dd/MM/yyyy'),
            format(d, 'EEE', { locale: ptBR }),
            r.entry_1?.slice(0, 5) || '-',
            r.exit_1?.slice(0, 5) || '-',
            r.entry_2?.slice(0, 5) || '-',
            r.exit_2?.slice(0, 5) || '-',
            fmtH(r.worked_hours),
            fmtH(r.bank_hours),
            r.is_weekend ? 'Fim semana' : r.is_holiday ? 'Feriado' : r.absence_type || '',
          ];
        }),
        ['', '', '', '', '', 'TOTAL', fmtH(totalH), fmtH(totalBanco), ''],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [99, 102, 241] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });
  }

  doc.save(`ponto_consolidado_${companyName.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2, '0')}.pdf`);
}
