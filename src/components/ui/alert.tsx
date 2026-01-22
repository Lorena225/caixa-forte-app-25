import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border-l-4 p-4 flex gap-3 [&>svg]:flex-shrink-0 [&>svg]:mt-0.5",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-l-border",
        success: "bg-success/5 text-success border-l-success [&>svg]:text-success",
        destructive: "bg-destructive/5 text-destructive border-l-destructive [&>svg]:text-destructive",
        warning: "bg-warning/5 text-warning-foreground border-l-warning [&>svg]:text-warning",
        info: "bg-info/5 text-info-foreground border-l-info [&>svg]:text-info",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("font-semibold text-sm leading-none tracking-tight mb-1", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm opacity-90 [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
