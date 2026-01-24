import { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  delay?: number;
  glass?: boolean;
}

const sizeClasses = {
  sm: 'col-span-1 row-span-1',
  md: 'col-span-1 lg:col-span-2 row-span-1',
  lg: 'col-span-1 lg:col-span-2 row-span-2',
  xl: 'col-span-1 lg:col-span-3 row-span-1',
};

export const BentoGrid = memo(function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6',
        'auto-rows-[minmax(180px,auto)]',
        className
      )}
    >
      {children}
    </div>
  );
});

export const BentoCard = memo(function BentoCard({
  children,
  className,
  size = 'sm',
  delay = 0,
  glass = false,
}: BentoCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.5, 
        delay,
        ease: [0.25, 0.46, 0.45, 0.94] 
      }}
      whileHover={{ 
        y: -4,
        transition: { duration: 0.2 }
      }}
      className={cn(
        sizeClasses[size],
        'group relative overflow-hidden',
        'rounded-2xl border transition-all duration-300',
        glass ? [
          'bg-white/5 backdrop-blur-xl',
          'border-white/10',
          'shadow-lg shadow-black/5',
          'hover:bg-white/10 hover:border-white/20',
        ] : [
          'bg-card border-border/50',
          'shadow-sm hover:shadow-lg',
          'hover:border-primary/20',
        ],
        className
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={cn(
        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300',
        'bg-gradient-to-br from-primary/5 via-transparent to-transparent'
      )} />
      
      {/* Content */}
      <div className="relative z-10 h-full p-5 lg:p-6">
        {children}
      </div>
    </motion.div>
  );
});

export default BentoGrid;
