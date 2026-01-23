import { memo } from 'react';

/**
 * Skip Links Component - WCAG 2.1 AA Compliance
 * Provides keyboard-accessible skip navigation for screen readers
 */
export const SkipLinks = memo(function SkipLinks() {
  return (
    <div className="sr-only">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded"
      >
        Pular para conteúdo principal
      </a>
      <a
        href="#main-navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded"
      >
        Pular para navegação
      </a>
      <a
        href="#search"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded"
      >
        Pular para busca
      </a>
    </div>
  );
});

export default SkipLinks;
