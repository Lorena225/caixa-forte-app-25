import { forwardRef, useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

// CNPJ validation algorithm
function isValidCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Weights for validation
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  // Validate first digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned[i]) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned[12])) return false;
  
  // Validate second digit
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned[i]) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned[13])) return false;
  
  return true;
}

// Format CNPJ: 00.000.000/0000-00
function formatCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 5) return `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
  if (cleaned.length <= 8) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
  if (cleaned.length <= 12) return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
  return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
}

interface CNPJInputProps extends Omit<React.ComponentPropsWithoutRef<typeof Input>, 'onChange' | 'value'> {
  value?: string;
  onChange?: (sanitized: string, formatted: string, isValid: boolean) => void;
  showValidation?: boolean;
}

export const CNPJInput = forwardRef<HTMLInputElement, CNPJInputProps>(
  ({ value = '', onChange, showValidation = true, className, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(() => formatCNPJ(value));
    const [touched, setTouched] = useState(false);
    
    const sanitized = internalValue.replace(/\D/g, '');
    const isValid = sanitized.length === 14 && isValidCNPJ(sanitized);
    const showStatus = showValidation && touched && sanitized.length > 0;
    
    useEffect(() => {
      setInternalValue(formatCNPJ(value));
    }, [value]);
    
    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatCNPJ(e.target.value);
      const sanitizedValue = formatted.replace(/\D/g, '');
      setInternalValue(formatted);
      onChange?.(sanitizedValue, formatted, sanitizedValue.length === 14 && isValidCNPJ(sanitizedValue));
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
          placeholder="00.000.000/0000-00"
          maxLength={18}
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

CNPJInput.displayName = 'CNPJInput';

export { isValidCNPJ, formatCNPJ };
