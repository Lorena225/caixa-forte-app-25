import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useBanksReference, type BankReference } from '@/hooks/useBanksReference';
import { ChevronsUpDown, Check, AlertCircle, Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankSelectProps {
  value: BankReference | null;
  onChange: (bank: BankReference | null) => void;
  disabled?: boolean;
  onRequestBank?: () => void;
  error?: boolean;
}

export function BankSelect({ value, onChange, disabled, onRequestBank, error }: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const { data: banks = [], isLoading } = useBanksReference();

  // Ordenar bancos por display_name
  const sortedBanks = useMemo(() => {
    return [...banks].sort((a, b) => a.display_name.localeCompare(b.display_name, 'pt-BR'));
  }, [banks]);

  const handleSelect = (bank: BankReference) => {
    onChange(bank);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Selecione o banco"
          className={cn(
            'w-full justify-between h-10 text-left font-normal',
            !value && 'text-muted-foreground',
            error && 'border-destructive focus:ring-destructive'
          )}
          disabled={disabled}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando bancos...
            </span>
          ) : value ? (
            <span className="flex items-center gap-2 truncate">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-mono font-medium">{value.compe_code}</span>
              <span className="truncate">– {value.display_name.split(' - ')[1] || value.name}</span>
            </span>
          ) : (
            'Selecione o banco (digite nome ou código)'
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[400px] p-0 z-50" align="start">
        <Command shouldFilter={true}>
          <CommandInput placeholder="Buscar por código COMPE ou nome do banco..." className="h-10" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              <div className="p-4 text-center space-y-3">
                <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Nenhum banco encontrado</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Verifique o nome ou código informado.
                  </p>
                </div>
                {onRequestBank && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOpen(false);
                      onRequestBank();
                    }}
                    className="mt-2"
                  >
                    Meu banco não está na lista
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {sortedBanks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={`${bank.compe_code} ${bank.name} ${bank.display_name} ${bank.ispb || ''}`}
                  onSelect={() => handleSelect(bank)}
                  className="py-2.5"
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value?.id === bank.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="font-mono font-medium mr-2 shrink-0">{bank.compe_code}</span>
                  <span className="text-sm truncate">
                    – {bank.display_name.split(' - ')[1] || bank.name}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
