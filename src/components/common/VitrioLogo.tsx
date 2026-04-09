import { cn } from '@/lib/utils';

interface VitrioLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'wordmark';
  className?: string;
  dark?: boolean;
}

const sizes = {
  xs: { icon: 20, text: 'text-sm', gap: 'gap-1.5' },
  sm: { icon: 26, text: 'text-base', gap: 'gap-2' },
  md: { icon: 34, text: 'text-xl', gap: 'gap-2.5' },
  lg: { icon: 44, text: 'text-2xl', gap: 'gap-3' },
  xl: { icon: 56, text: 'text-3xl', gap: 'gap-3.5' },
};

export function VitrioLogo({ size = 'md', variant = 'full', className, dark }: VitrioLogoProps) {
  const s = sizes[size];

  const icon = (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Vitrio"
    >
      <defs>
        <linearGradient id="vitrio-grad-a" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="vitrio-grad-b" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Hexágono base */}
      <path
        d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
        fill="url(#vitrio-grad-a)"
      />

      {/* Plano de vidro (reflexo) */}
      <path
        d="M20 2L36 11V29L20 38L4 29V11L20 2Z"
        fill="url(#vitrio-grad-b)"
        opacity="0.4"
      />

      {/* Letra V estilizada */}
      <path
        d="M12 13L20 27L28 13"
        stroke="white"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Ponto de brilho */}
      <circle cx="20" cy="13" r="1.8" fill="white" opacity="0.9" />

      {/* Linha inferior decorativa */}
      <line x1="14" y1="30" x2="26" y2="30" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );

  if (variant === 'icon') return <span className={className}>{icon}</span>;

  const wordmark = (
    <span
      className={cn(
        s.text,
        'font-bold tracking-tight select-none',
        dark ? 'text-white' : 'text-foreground'
      )}
      style={{ fontFamily: 'inherit', letterSpacing: '-0.02em' }}
    >
      vitrio
      <span
        className="inline-block rounded-full ml-0.5 align-super"
        style={{ width: '5px', height: '5px', background: 'currentColor', opacity: 0.5 }}
      />
    </span>
  );

  if (variant === 'wordmark') return <span className={cn('flex items-center', className)}>{wordmark}</span>;

  return (
    <span className={cn('flex items-center', s.gap, className)}>
      {icon}
      {wordmark}
    </span>
  );
}
