import { memo, useState, useCallback } from 'react';
import { Search, Command } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GlobalSearchProps {
  className?: string;
  onOpen?: () => void;
}

export const GlobalSearch = memo(function GlobalSearch({ className, onOpen }: GlobalSearchProps) {
  const handleClick = useCallback(() => {
    // Dispatch event to open command palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
    onOpen?.();
  }, [onOpen]);

  return (
    <Button
      variant="outline"
      onClick={handleClick}
      className={cn(
        'relative h-10 justify-start gap-2 px-3',
        'text-muted-foreground hover:text-foreground',
        'bg-muted/30 hover:bg-muted/50 border-border/50',
        'transition-all duration-200',
        'w-10 sm:w-48 lg:w-64',
        className
      )}
      aria-label="Buscar (Ctrl+K)"
    >
      <Search className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span className="hidden sm:inline-flex flex-1 text-left text-sm truncate">
        Buscar...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        <Command className="h-3 w-3" />K
      </kbd>
    </Button>
  );
});

export default GlobalSearch;
