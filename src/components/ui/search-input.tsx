import * as React from "react";
import { Search, X } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  onClear?: () => void;
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, ...props }, ref) => {
    const hasValue = Boolean(value && String(value).length > 0);

    const handleClear = () => {
      if (onClear) {
        onClear();
      }
    };

    return (
      <div className="relative">
        <Search 
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none",
            "transition-colors duration-200"
          )} 
        />
        <input
          type="text"
          ref={ref}
          value={value}
          onChange={onChange}
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-muted/50 pl-10 pr-10 py-2 text-sm text-foreground",
            "ring-offset-background transition-all duration-200",
            "placeholder:text-muted-foreground",
            "hover:border-border/80 hover:bg-background hover:shadow-sm",
            "focus:border-2 focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)] focus:pl-[39px]",
            "focus-visible:outline-none",
            "disabled:cursor-not-allowed disabled:opacity-60",
            className,
          )}
          {...props}
        />
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className={cn(
              "absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4",
              "text-muted-foreground cursor-pointer",
              "transition-colors duration-200",
              "hover:text-primary"
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";

export { SearchInput };
