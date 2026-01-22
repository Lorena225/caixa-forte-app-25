import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm text-foreground",
          "ring-offset-background transition-all duration-200",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "hover:border-border/80 hover:bg-muted/30",
          "focus:border-2 focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
          "focus-visible:outline-none",
          "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
