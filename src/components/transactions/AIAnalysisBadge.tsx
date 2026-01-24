import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AIAnalysisBadgeProps {
  confidence?: number;
  reason?: string;
  className?: string;
}

export function AIAnalysisBadge({ confidence = 0.85, reason, className }: AIAnalysisBadgeProps) {
  const confidencePercent = Math.round(confidence * 100);
  const confidenceColor = confidence >= 0.8 
    ? 'text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
    : confidence >= 0.6
    ? 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-950 dark:border-yellow-800'
    : 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs gap-1 cursor-help animate-in fade-in-50 duration-300',
              confidenceColor,
              className
            )}
          >
            <Sparkles className="h-3 w-3" />
            <span>IA {confidencePercent}%</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1">
              <Sparkles className="h-3 w-3" />
              Analisado por IA
            </p>
            {reason && (
              <p className="text-xs text-muted-foreground">{reason}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Confiança: {confidencePercent}%
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
