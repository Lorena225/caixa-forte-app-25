import * as React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

/**
 * Primitivos de layout de formulário — padrão único para todos os modais e
 * formulários do Vitrio. Resolvem desalinhamento, falta de respiro e hierarquia
 * fraca ao centralizar espaçamento e grid num só lugar.
 *
 * Uso:
 *   <FormBody>
 *     <FormSection title="Dados do título" description="...">
 *       <FormGrid cols={2}>
 *         <FormField label="Valor" required>...</FormField>
 *         <FormField label="Vencimento" hint="Padrão: 30 dias">...</FormField>
 *       </FormGrid>
 *     </FormSection>
 *   </FormBody>
 */

// Corpo do formulário: respiro vertical consistente entre seções
export function FormBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('space-y-6 py-1', className)}>{children}</div>;
}

// Seção: agrupa campos relacionados com título e descrição opcional
export function FormSection({
  title, description, children, className,
}: {
  title?: string; description?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// Grid responsivo: 1, 2 ou 3 colunas que colapsam no mobile
export function FormGrid({
  cols = 2, children, className,
}: {
  cols?: 1 | 2 | 3; children: React.ReactNode; className?: string;
}) {
  const colClass = cols === 1 ? 'sm:grid-cols-1' : cols === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2';
  return <div className={cn('grid grid-cols-1 gap-x-4 gap-y-4', colClass, className)}>{children}</div>;
}

// Campo: label + controle + hint/erro, com espaçamento e tipografia padronizados
export function FormField({
  label, required, hint, error, htmlFor, children, className, fullWidth,
}: {
  label?: string; required?: boolean; hint?: string; error?: string;
  htmlFor?: string; children: React.ReactNode; className?: string; fullWidth?: boolean;
}) {
  return (
    <div className={cn('space-y-1.5', fullWidth && 'sm:col-span-2', className)}>
      {label && (
        <Label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground/90 flex items-center gap-1">
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// Rodapé de ações: ação primária à direita, secundária à esquerda — sem redundância
export function FormActions({
  children, className, align = 'between',
}: {
  children: React.ReactNode; className?: string; align?: 'between' | 'end';
}) {
  return (
    <div className={cn(
      'flex flex-col-reverse sm:flex-row gap-2 sm:gap-3',
      align === 'between' ? 'sm:justify-between sm:items-center' : 'sm:justify-end',
      className,
    )}>
      {children}
    </div>
  );
}
