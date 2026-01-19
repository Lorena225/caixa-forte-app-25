/**
 * Design System Tokens
 * Centralized design tokens for consistent styling across the application.
 * These values mirror CSS variables defined in index.css and tailwind.config.ts
 */

export const designTokens = {
  colors: {
    // Brand / Primary
    primary: {
      DEFAULT: 'hsl(217, 91%, 40%)',
      foreground: 'hsl(0, 0%, 100%)',
    },
    // Secondary
    secondary: {
      DEFAULT: 'hsl(220, 14%, 96%)',
      foreground: 'hsl(220, 25%, 20%)',
    },
    // Semantic
    success: {
      DEFAULT: 'hsl(142, 76%, 36%)',
      foreground: 'hsl(0, 0%, 100%)',
    },
    destructive: {
      DEFAULT: 'hsl(0, 84%, 55%)',
      foreground: 'hsl(0, 0%, 100%)',
    },
    warning: {
      DEFAULT: 'hsl(38, 92%, 50%)',
      foreground: 'hsl(0, 0%, 10%)',
    },
    info: {
      DEFAULT: 'hsl(199, 89%, 48%)',
      foreground: 'hsl(0, 0%, 100%)',
    },
    // Muted / Background
    muted: {
      DEFAULT: 'hsl(220, 14%, 96%)',
      foreground: 'hsl(220, 10%, 45%)',
    },
    accent: {
      DEFAULT: 'hsl(220, 14%, 96%)',
      foreground: 'hsl(220, 25%, 20%)',
    },
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(220, 25%, 10%)',
    card: {
      DEFAULT: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(220, 25%, 10%)',
    },
    popover: {
      DEFAULT: 'hsl(0, 0%, 100%)',
      foreground: 'hsl(220, 25%, 10%)',
    },
    border: 'hsl(220, 13%, 91%)',
    input: 'hsl(220, 13%, 91%)',
    ring: 'hsl(217, 91%, 40%)',
  },

  typography: {
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"JetBrains Mono", "Fira Code", Consolas, monospace',
    },
    fontSize: {
      xs: '0.75rem',     // 12px
      sm: '0.875rem',    // 14px
      base: '1rem',      // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem',  // 36px
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  spacing: {
    px: '1px',
    0: '0',
    0.5: '0.125rem',
    1: '0.25rem',
    1.5: '0.375rem',
    2: '0.5rem',
    2.5: '0.625rem',
    3: '0.75rem',
    3.5: '0.875rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    7: '1.75rem',
    8: '2rem',
    9: '2.25rem',
    10: '2.5rem',
    11: '2.75rem',
    12: '3rem',
    14: '3.5rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
    28: '7rem',
    32: '8rem',
  },

  shadows: {
    sm: '0 1px 2px 0 hsl(220 25% 10% / 0.05)',
    DEFAULT: '0 1px 3px 0 hsl(220 25% 10% / 0.1), 0 1px 2px -1px hsl(220 25% 10% / 0.1)',
    md: '0 4px 6px -1px hsl(220 25% 10% / 0.1), 0 2px 4px -2px hsl(220 25% 10% / 0.1)',
    lg: '0 10px 15px -3px hsl(220 25% 10% / 0.1), 0 4px 6px -4px hsl(220 25% 10% / 0.1)',
    xl: '0 20px 25px -5px hsl(220 25% 10% / 0.1), 0 8px 10px -6px hsl(220 25% 10% / 0.1)',
    '2xl': '0 25px 50px -12px hsl(220 25% 10% / 0.25)',
    widget: '0 8px 30px hsl(220 25% 10% / 0.12)',
    widgetHover: '0 12px 40px hsl(220 25% 10% / 0.18)',
    inner: 'inset 0 2px 4px 0 hsl(220 25% 10% / 0.05)',
    none: 'none',
  },

  transitions: {
    fast: '150ms ease',
    normal: '200ms ease',
    slow: '300ms ease-out',
    spring: '300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
    bounce: '500ms cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },

  radii: {
    none: '0',
    sm: '0.375rem',    // 6px
    DEFAULT: '0.5rem', // 8px
    md: '0.5rem',      // 8px
    lg: '0.625rem',    // 10px
    xl: '0.75rem',     // 12px
    '2xl': '1rem',     // 16px
    '3xl': '1.5rem',   // 24px
    full: '9999px',
  },

  zIndex: {
    auto: 'auto',
    0: 0,
    10: 10,
    20: 20,
    30: 30,
    40: 40,
    dropdown: 50,
    sticky: 60,
    fixed: 70,
    modalBackdrop: 80,
    modal: 100,
    popover: 110,
    tooltip: 120,
    overlay: 200,
    copilot: 250,
  },

  copilot: {
    width: {
      collapsed: '56px',
      expanded: '380px',
      expandedMobile: '100%',
    },
    height: {
      collapsed: '56px',
      expanded: '520px',
      expandedMobile: '70vh',
    },
    position: {
      right: '24px',
      rightMobile: '16px',
      bottom: '24px',
      bottomMobile: '16px',
    },
    maxWidth: '420px',
    minHeight: '400px',
  },

  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type DesignTokens = typeof designTokens;
