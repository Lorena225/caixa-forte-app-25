import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  FileSpreadsheet, 
  FileType, 
  Download, 
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { exportReport, type ExportFormat, type ExportReportData } from '@/utils/reportExport';

interface ReportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportData: Omit<ExportReportData, 'period' | 'periodStart' | 'periodEnd'>;
  healthDiagnostic?: ExportReportData['healthDiagnostic'];
  goalsAchieved?: ExportReportData['goalsAchieved'];
}

type PeriodOption = 'current-month' | 'last-3-months' | 'custom';

const formatOptions: Array<{
  value: ExportFormat;
  label: string;
  description: string;
  icon: typeof FileText;
  color: string;
}> = [
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Relatório visual com gráficos',
    icon: FileText,
    color: 'text-red-500',
  },
  {
    value: 'xlsx',
    label: 'Excel',
    description: 'Planilha com dados detalhados',
    icon: FileSpreadsheet,
    color: 'text-green-600',
  },
  {
    value: 'docx',
    label: 'Word',
    description: 'Documento para relatórios formais',
    icon: FileType,
    color: 'text-blue-600',
  },
];

export function ReportExportDialog({
  open,
  onOpenChange,
  reportData,
  healthDiagnostic,
  goalsAchieved,
}: ReportExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf');
  const [periodOption, setPeriodOption] = useState<PeriodOption>('current-month');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isExporting, setIsExporting] = useState(false);

  const getPeriodDates = (): { start: Date; end: Date; label: string } => {
    const now = new Date();
    
    switch (periodOption) {
      case 'current-month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
        };
      case 'last-3-months':
        return {
          start: startOfMonth(subMonths(now, 2)),
          end: endOfMonth(now),
          label: `${format(subMonths(now, 2), 'MMMM', { locale: ptBR })} a ${format(now, "MMMM 'de' yyyy", { locale: ptBR })}`,
        };
      case 'custom':
        return {
          start: customDateRange?.from || startOfMonth(now),
          end: customDateRange?.to || endOfMonth(now),
          label: customDateRange?.from && customDateRange?.to
            ? `${format(customDateRange.from, 'dd/MM/yyyy')} a ${format(customDateRange.to, 'dd/MM/yyyy')}`
            : 'Período personalizado',
        };
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
          label: format(now, "MMMM 'de' yyyy", { locale: ptBR }),
        };
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    const toastId = toast.loading('Gerando arquivo...', {
      description: 'Preparando seu relatório para download',
    });

    try {
      const periodDates = getPeriodDates();
      
      // Filter transactions by period
      const filteredTransactions = reportData.transactions.filter(t => {
        const transactionDate = new Date(t.transaction_date);
        return transactionDate >= periodDates.start && transactionDate <= periodDates.end;
      });

      // Recalculate totals based on filtered transactions
      const totalReceitas = filteredTransactions
        .filter(t => t.direction === 'entrada')
        .reduce((sum, t) => sum + t.total_amount, 0);

      const totalDespesas = filteredTransactions
        .filter(t => t.direction === 'saida')
        .reduce((sum, t) => sum + t.total_amount, 0);

      const exportData: ExportReportData = {
        ...reportData,
        transactions: filteredTransactions,
        totalReceitas,
        totalDespesas,
        period: periodDates.label,
        periodStart: periodDates.start,
        periodEnd: periodDates.end,
        healthDiagnostic,
        goalsAchieved,
      };

      await exportReport(selectedFormat, exportData);

      toast.dismiss(toastId);
      toast.success('Download concluído com sucesso!', {
        description: `Relatório ${selectedFormat.toUpperCase()} gerado com ${filteredTransactions.length} transações`,
        icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.dismiss(toastId);
      toast.error('Erro ao gerar relatório', {
        description: 'Tente novamente em alguns instantes.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Central de Exportação
          </DialogTitle>
          <DialogDescription>
            Escolha o formato e o período para gerar seu relatório financeiro
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Format Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Formato do Relatório</Label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedFormat === option.value;
                
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedFormat(option.value)}
                    className={cn(
                      'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                      'hover:border-primary/50 hover:bg-accent/50',
                      isSelected
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border bg-card'
                    )}
                  >
                    <Icon className={cn('h-8 w-8', option.color)} />
                    <span className="font-semibold text-sm">{option.label}</span>
                    <span className="text-xs text-muted-foreground text-center leading-tight">
                      {option.description}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="absolute top-2 right-2 h-4 w-4 text-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Period Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período de Análise</Label>
            <RadioGroup
              value={periodOption}
              onValueChange={(value) => setPeriodOption(value as PeriodOption)}
              className="space-y-2"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="current-month" id="current-month" />
                <Label htmlFor="current-month" className="flex-1 cursor-pointer">
                  <span className="font-medium">Mês Atual</span>
                  <span className="block text-xs text-muted-foreground">
                    {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="last-3-months" id="last-3-months" />
                <Label htmlFor="last-3-months" className="flex-1 cursor-pointer">
                  <span className="font-medium">Últimos 3 Meses</span>
                  <span className="block text-xs text-muted-foreground">
                    {format(subMonths(new Date(), 2), 'MMMM', { locale: ptBR })} a {format(new Date(), 'MMMM', { locale: ptBR })}
                  </span>
                </Label>
              </div>
              
              <div className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="flex-1 cursor-pointer">
                  <span className="font-medium">Período Personalizado</span>
                </Label>
              </div>
            </RadioGroup>

            {/* Custom Date Range Picker */}
            {periodOption === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !customDateRange && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customDateRange?.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, 'dd/MM/yyyy')} -{' '}
                          {format(customDateRange.to, 'dd/MM/yyyy')}
                        </>
                      ) : (
                        format(customDateRange.from, 'dd/MM/yyyy')
                      )
                    ) : (
                      'Selecione o período'
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange?.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full h-12 text-base"
          >
            {isExporting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Gerando {selectedFormat.toUpperCase()}...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Exportar como {selectedFormat.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
