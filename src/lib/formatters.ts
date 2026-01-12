import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(date: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy', { locale: ptBR });
}

export function formatDateTime(date: string | Date): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

export function formatMonth(month: number): string {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return months[month - 1] || '';
}

export function formatShortMonth(month: number): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return months[month - 1] || '';
}

export function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    rascunho: 'Rascunho',
    lancado: 'Lançado',
    pago: 'Pago',
    cancelado: 'Cancelado',
  };
  return labels[status] || status;
}

export function getStatusColor(status: string, isOverdue?: boolean): string {
  if (isOverdue && status !== 'pago') return 'status-overdue';
  const colors: Record<string, string> = {
    rascunho: 'status-draft',
    lancado: 'status-pending',
    pago: 'status-paid',
    cancelado: 'status-draft',
  };
  return colors[status] || '';
}
