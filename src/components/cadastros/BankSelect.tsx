import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
import { ChevronsUpDown, Check, AlertCircle, Building2, Loader2, Search, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BankSelectProps {
  value: BankReference | null;
  onChange: (bank: BankReference | null) => void;
  disabled?: boolean;
  onRequestBank?: () => void;
  error?: boolean;
  placeholder?: string;
  className?: string;
}

export function BankSelect({ 
  value, 
  onChange, 
  disabled, 
  onRequestBank, 
  error,
  placeholder = 'Selecione o banco (digite nome ou código)',
  className
}: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { data: banks = [], isLoading, isError, refetch } = useBanksReference();
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Ordenar bancos por display_name (alfabético pt-BR)
  const sortedBanks = useMemo(() => {
    return [...banks].sort((a, b) => a.display_name.localeCompare(b.display_name, 'pt-BR'));
  }, [banks]);

  // Limpar busca ao fechar
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const handleSelect = useCallback((bank: BankReference) => {
    onChange(bank);
    setOpen(false);
    // Retornar foco ao trigger após seleção
    setTimeout(() => triggerRef.current?.focus(), 0);
  }, [onChange]);

  const handleClear = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  }, [onChange]);

  // Atalho de teclado: Escape fecha o popover
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && open) {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }, [open]);

  // Formatar nome do banco para exibição
  const formatBankName = (bank: BankReference) => {
    const namePart = bank.display_name.split(' - ')[1] || bank.name;
    return namePart;
  };

  // Estado de erro na busca
  if (isError) {
    return (
      <div className={cn('flex items-center gap-2 p-3 rounded-md border border-destructive bg-destructive/10', className)}>
        <XCircle className="h-4 w-4 text-destructive shrink-0" />
        <span className="text-sm text-destructive">Erro ao carregar bancos</span>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => refetch()}
          className="ml-auto h-7 text-xs"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label={value ? `Banco selecionado: ${value.compe_code} ${formatBankName(value)}` : 'Selecione o banco'}
          aria-invalid={error}
          className={cn(
            'w-full justify-between h-10 text-left font-normal group',
            !value && 'text-muted-foreground',
            error && 'border-destructive focus:ring-destructive focus-visible:ring-destructive',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
          disabled={disabled || isLoading}
          onKeyDown={handleKeyDown}
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Carregando bancos...</span>
            </span>
          ) : value ? (
            <span className="flex items-center gap-2 flex-1 min-w-0">
              <Building2 className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-mono font-semibold text-foreground">{value.compe_code}</span>
              <span className="text-muted-foreground">–</span>
              <span className="truncate text-foreground">{formatBankName(value)}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <span>{placeholder}</span>
            </span>
          )}
          
          <div className="flex items-center gap-1 shrink-0">
            {value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Limpar seleção"
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                className="p-0.5 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </span>
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      
      <PopoverContent 
        className="w-[var(--radix-popover-trigger-width)] min-w-[320px] sm:min-w-[400px] p-0 z-50 bg-popover border shadow-lg" 
        align="start"
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Command shouldFilter={true} className="bg-transparent">
          <div className="flex items-center border-b px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput 
              placeholder="Digite código COMPE ou nome..." 
              className="h-11 border-0 focus:ring-0 text-sm"
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
          </div>
          
          <CommandList className="max-h-[280px] sm:max-h-[320px] overflow-y-auto">
            <CommandEmpty>
              <div className="p-4 text-center space-y-3">
                <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Nenhum banco encontrado</p>
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
                    className="mt-2 text-xs"
                  >
                    <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
                    Meu banco não está na lista
                  </Button>
                )}
              </div>
            </CommandEmpty>
            
            <CommandGroup className="p-1">
              {sortedBanks.map((bank) => {
                const isSelected = value?.id === bank.id;
                return (
                  <CommandItem
                    key={bank.id}
                    value={`${bank.compe_code} ${bank.name} ${bank.display_name} ${bank.ispb || ''}`}
                    onSelect={() => handleSelect(bank)}
                    className={cn(
                      'py-2.5 px-2 cursor-pointer rounded-md',
                      'data-[selected=true]:bg-accent',
                      isSelected && 'bg-primary/10'
                    )}
                    aria-selected={isSelected}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4 shrink-0 text-primary',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="font-mono font-semibold mr-2 shrink-0 text-foreground">
                      {bank.compe_code}
                    </span>
                    <span className="text-muted-foreground mr-1.5">–</span>
                    <span className="text-sm truncate text-foreground">
                      {formatBankName(bank)}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
            
            {/* Footer com ação de solicitar banco */}
            {onRequestBank && sortedBanks.length > 0 && (
              <div className="border-t p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onRequestBank();
                  }}
                  className="w-full justify-start text-xs text-muted-foreground hover:text-foreground"
                >
                  <AlertCircle className="h-3.5 w-3.5 mr-2" />
                  Meu banco não está na lista
                </Button>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
