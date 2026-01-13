import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Minus } from 'lucide-react';

interface BulkSelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  disabled?: boolean;
  tooltip?: string;
  className?: string;
  isHeader?: boolean;
}

export function BulkSelectionCheckbox({
  checked,
  indeterminate,
  onChange,
  disabled,
  tooltip,
  className,
  isHeader,
}: BulkSelectionCheckboxProps) {
  const checkbox = (
    <div 
      className={cn(
        'flex items-center justify-center',
        isHeader ? 'h-12' : 'h-full',
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        checked={indeterminate ? 'indeterminate' : checked}
        onCheckedChange={onChange}
        disabled={disabled}
        className={cn(
          disabled && 'opacity-50 cursor-not-allowed',
          'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground'
        )}
      />
    </div>
  );

  if (tooltip && disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {checkbox}
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return checkbox;
}
