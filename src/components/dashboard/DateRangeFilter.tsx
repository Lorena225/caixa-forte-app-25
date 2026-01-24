import { useState } from 'react';
import { format, subMonths, startOfMonth, endOfMonth, subDays, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';

interface DateRangeFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  className?: string;
}

type PresetKey = 'today' | 'yesterday' | 'last7days' | 'last30days' | 'thisMonth' | 'lastMonth' | 'last3months' | 'last6months' | 'thisYear' | 'custom';

interface Preset {
  key: PresetKey;
  label: string;
  getRange: () => DateRange;
}

const presets: Preset[] = [
  {
    key: 'today',
    label: 'Hoje',
    getRange: () => {
      const today = new Date();
      return { from: today, to: today };
    },
  },
  {
    key: 'yesterday',
    label: 'Ontem',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { from: yesterday, to: yesterday };
    },
  },
  {
    key: 'last7days',
    label: 'Últimos 7 dias',
    getRange: () => ({
      from: subDays(new Date(), 6),
      to: new Date(),
    }),
  },
  {
    key: 'last30days',
    label: 'Últimos 30 dias',
    getRange: () => ({
      from: subDays(new Date(), 29),
      to: new Date(),
    }),
  },
  {
    key: 'thisMonth',
    label: 'Este mês',
    getRange: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    key: 'lastMonth',
    label: 'Mês passado',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return {
        from: startOfMonth(lastMonth),
        to: endOfMonth(lastMonth),
      };
    },
  },
  {
    key: 'last3months',
    label: 'Últimos 3 meses',
    getRange: () => ({
      from: startOfMonth(subMonths(new Date(), 2)),
      to: endOfMonth(new Date()),
    }),
  },
  {
    key: 'last6months',
    label: 'Últimos 6 meses',
    getRange: () => ({
      from: startOfMonth(subMonths(new Date(), 5)),
      to: endOfMonth(new Date()),
    }),
  },
  {
    key: 'thisYear',
    label: 'Este ano',
    getRange: () => ({
      from: startOfYear(new Date()),
      to: endOfYear(new Date()),
    }),
  },
];

export function DateRangeFilter({ dateRange, onDateRangeChange, className }: DateRangeFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('last6months');

  const handlePresetChange = (value: string) => {
    const preset = presets.find(p => p.key === value);
    if (preset) {
      setSelectedPreset(value as PresetKey);
      onDateRangeChange(preset.getRange());
    } else if (value === 'custom') {
      setSelectedPreset('custom');
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onDateRangeChange(range);
    if (range?.from && range?.to) {
      setSelectedPreset('custom');
    }
  };

  const formatDateRange = () => {
    if (!dateRange?.from) {
      return 'Selecione um período';
    }
    if (dateRange.to) {
      return `${format(dateRange.from, 'dd MMM', { locale: ptBR })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ptBR })}`;
    }
    return format(dateRange.from, 'dd MMM yyyy', { locale: ptBR });
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Preset Selector */}
      <Select value={selectedPreset} onValueChange={handlePresetChange}>
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Período" />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.key} value={preset.key}>
              {preset.label}
            </SelectItem>
          ))}
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {/* Custom Date Picker */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'justify-start text-left font-normal h-9 min-w-[220px]',
              !dateRange && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span className="truncate">{formatDateRange()}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.from}
            selected={dateRange}
            onSelect={handleCalendarSelect}
            numberOfMonths={2}
            locale={ptBR}
            className={cn('p-3 pointer-events-auto')}
          />
          <div className="border-t p-3 flex justify-end gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => {
                onDateRangeChange(undefined);
                setIsOpen(false);
              }}
            >
              Limpar
            </Button>
            <Button 
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
