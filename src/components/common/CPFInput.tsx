import { forwardRef, useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

// CPF validation algorithm
function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;
  
  return true;
}

// Format CPF: 000.000.000-00
function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  
  if (cleaned.length <= 3) return cleaned;
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
  if (cleaned.length <= 9) return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
  return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
}

interface CPFInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (sanitized: string, formatted: string, isValid: boolean) => void;
  showValidation?: boolean;
}

export const CPFInput = forwardRef<HTMLInputElement, CPFInputProps>(
  ({ value = '', onChange, showValidation = true, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(() => formatCPF(value));
    const [touched, setTouched] = useState(false);
    
    const sanitized = internalValue.replace(/\D/g, '');
    const isValid = sanitized.length === 11 && isValidCPF(sanitized);
    const showStatus = showValidation && touched && sanitized.length > 0;
    
    useEffect(() => {
      setInternalValue(formatCPF(value));
    }, [value]);
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCPF(e.target.value);
      const sanitizedValue = formatted.replace(/\D/g, '');
      setInternalValue(formatted);
      onChange?.(sanitizedValue, formatted, sanitizedValue.length === 11 && isValidCPF(sanitizedValue));
    }, [onChange]);
    
    return (
      <div className="relative">
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          value={internalValue}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder="000.000.000-00"
          maxLength={14}
          className={cn(
            showStatus && !isValid && 'border-destructive focus-visible:ring-destructive',
            showStatus && isValid && 'border-green-500 focus-visible:ring-green-500',
            'pr-10',
            className
          )}
          {...props}
        />
        {showStatus && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {isValid ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-destructive" />
            )}
          </div>
        )}
      </div>
    );
  }
);

CPFInput.displayName = 'CPFInput';

export { isValidCPF, formatCPF };
