import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        mono: ["JetBrains Mono", "SF Mono", "Monaco", "Courier New", "monospace"],
      },
      fontSize: {
        // Typography Scale
        xs: ["0.75rem", { lineHeight: "1rem" }], // 12px
        sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        base: ["0.875rem", { lineHeight: "1.3125rem" }], // 14px / 21px
        lg: ["1rem", { lineHeight: "1.5rem" }], // 16px / 24px
        xl: ["1.125rem", { lineHeight: "1.625rem" }], // 18px / 26px
        "2xl": ["1.25rem", { lineHeight: "1.75rem" }], // 20px / 28px
        "3xl": ["1.5rem", { lineHeight: "2rem" }], // 24px / 32px
        "4xl": ["2rem", { lineHeight: "2.5rem" }], // 32px / 40px
        "5xl": ["2.5rem", { lineHeight: "3rem" }], // 40px / 48px
      },
      spacing: {
        "4.5": "1.125rem",
        "13": "3.25rem",
        "15": "3.75rem",
        "18": "4.5rem",
        "22": "5.5rem",
        "sidebar": "16rem", // 256px
        "sidebar-collapsed": "4rem", // 64px
        "header": "4rem", // 64px
      },
      screens: {
        "xs": "475px",
        "3xl": "1920px",
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Primary
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          dark: "hsl(var(--primary-dark))",
          light: "hsl(var(--primary-light))",
        },
        
        // Secondary
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        
        // Destructive
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
          dark: "hsl(var(--destructive-dark))",
          light: "hsl(var(--destructive-light))",
        },
        
        // Success
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          dark: "hsl(var(--success-dark))",
          light: "hsl(var(--success-light))",
        },
        
        // Warning
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          dark: "hsl(var(--warning-dark))",
          light: "hsl(var(--warning-light))",
        },
        
        // Info
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
          dark: "hsl(var(--info-dark))",
          light: "hsl(var(--info-light))",
        },
        
        // Muted
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        
        // Accent
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        
        // Popover
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        // Card
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        
        // Sidebar
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
          muted: "hsl(var(--sidebar-muted))",
        },
        
        // Gray Scale
        gray: {
          50: "hsl(var(--gray-50))",
          100: "hsl(var(--gray-100))",
          200: "hsl(var(--gray-200))",
          300: "hsl(var(--gray-300))",
          400: "hsl(var(--gray-400))",
          500: "hsl(var(--gray-500))",
          600: "hsl(var(--gray-600))",
          700: "hsl(var(--gray-700))",
          800: "hsl(var(--gray-800))",
          900: "hsl(var(--gray-900))",
        },
        
        // Menu Category Colors
        menu: {
          inicio: "hsl(var(--menu-inicio))",
          favoritos: "hsl(var(--menu-favoritos))",
          operacoes: "hsl(var(--menu-operacoes))",
          catalogo: "hsl(var(--menu-catalogo))",
          compras: "hsl(var(--menu-compras))",
          financeiro: "hsl(var(--menu-financeiro))",
          contabil: "hsl(var(--menu-contabil))",
          relatorios: "hsl(var(--menu-relatorios))",
          cadastros: "hsl(var(--menu-cadastros))",
          ia: "hsl(var(--menu-ia))",
          servicos: "hsl(var(--menu-servicos))",
          integracoes: "hsl(var(--menu-integracoes))",
          config: "hsl(var(--menu-config))",
        },
        
        // Finance
        finance: {
          positive: "hsl(var(--finance-positive))",
          "positive-foreground": "hsl(var(--finance-positive-foreground))",
          negative: "hsl(var(--finance-negative))",
          "negative-foreground": "hsl(var(--finance-negative-foreground))",
          neutral: "hsl(var(--finance-neutral))",
          overdue: "hsl(var(--finance-overdue))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        card: "var(--shadow-card)",
        sidebar: "var(--shadow-sidebar)",
        focus: "var(--focus-ring)",
      },
      maxWidth: {
        "8xl": "88rem",
        "screen-3xl": "1920px",
      },
      minHeight: {
        "screen-safe": "100dvh",
      },
      height: {
        "screen-safe": "100dvh",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "slide-in-right": {
          from: { transform: "translateX(100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-in-left": {
          from: { transform: "translateX(-100%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        "slide-up": {
          from: { transform: "translateY(10px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "pulse-slow": "pulse-slow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
