import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-input bg-background px-4 py-3 text-sm text-foreground",
        "ring-offset-background transition-all duration-200 resize-y",
        "placeholder:text-muted-foreground",
        "hover:border-border/80 hover:bg-muted/30",
        "focus:border-2 focus:border-primary focus:bg-background focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
        "focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-muted disabled:resize-none",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
