import { memo } from 'react';

/**
 * Skip Links Component - WCAG 2.1 AA Compliance
 * Provides keyboard-accessible skip navigation for screen readers
 */
export const SkipLinks = memo(function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="skip-link"
      >
        Pular para conteúdo principal
      </a>
      <a
        href="#main-navigation"
        className="skip-link"
      >
        Pular para navegação
      </a>
      <a
        href="#search"
        className="skip-link"
      >
        Pular para busca
      </a>
    </div>
  );
});

export default SkipLinks;
