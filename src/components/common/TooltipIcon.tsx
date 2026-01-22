import { useState } from 'react';
import { cn } from '@/lib/utils';

interface TooltipIconProps {
  content: string;
  position?: 'top' | 'bottom';
  className?: string;
}

export function TooltipIcon({ content, position = 'top', className }: TooltipIconProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        className={cn(
          'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold',
          'bg-blue-50 text-primary',
          'hover:bg-blue-100 transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/30'
        )}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={(e) => {
          e.stopPropagation();
          setIsVisible(!isVisible);
        }}
        aria-label="Mais informações"
        type="button"
      >
        i
      </button>
      
      {isVisible && (
        <div
          className={cn(
            'absolute z-[100] bg-gray-900 text-white text-xs rounded-lg',
            'px-3 py-2 w-56 pointer-events-none shadow-lg',
            'transition-opacity duration-200',
            position === 'top' ? 'bottom-full mb-2 left-1/2 -translate-x-1/2' : 'top-full mt-2 left-1/2 -translate-x-1/2'
          )}
          role="tooltip"
        >
          <p className="leading-relaxed text-white">{content}</p>
          <div
            className={cn(
              'absolute w-2 h-2 bg-gray-900 transform rotate-45 left-1/2 -translate-x-1/2',
              position === 'top' ? '-bottom-1' : '-top-1'
            )}
          />
        </div>
      )}
    </div>
  );
}

export default TooltipIcon;
