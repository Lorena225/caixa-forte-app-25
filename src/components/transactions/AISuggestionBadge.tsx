import { Sparkles, Brain, Lightbulb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface AISuggestionBadgeProps {
  confidence: number;
  reason: string;
  isLearned?: boolean;
  className?: string;
}

export function AISuggestionBadge({ 
  confidence, 
  reason, 
  isLearned = false,
  className 
}: AISuggestionBadgeProps) {
  const confidencePercent = Math.round(confidence * 100);
  
  const getConfidenceColor = () => {
    if (confidence >= 0.85) return 'text-emerald-500 bg-emerald-50 border-emerald-200';
    if (confidence >= 0.7) return 'text-amber-500 bg-amber-50 border-amber-200';
    return 'text-blue-500 bg-blue-50 border-blue-200';
  };
  
  const Icon = isLearned ? Brain : Sparkles;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              'gap-1 text-xs font-normal cursor-help transition-all duration-200 hover:scale-105',
              getConfidenceColor(),
              className
            )}
          >
            <Icon className="h-3 w-3 animate-pulse" />
            <span>Sugerido por IA</span>
            <span className="opacity-70">({confidencePercent}%)</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium flex items-center gap-1">
              {isLearned ? (
                <>
                  <Brain className="h-3 w-3" />
                  Aprendido nesta sessão
                </>
              ) : (
                <>
                  <Lightbulb className="h-3 w-3" />
                  Sugestão inteligente
                </>
              )}
            </p>
            <p className="text-xs text-muted-foreground">{reason}</p>
            <p className="text-xs text-muted-foreground">
              Confiança: {confidencePercent}%
            </p>
            <p className="text-xs italic text-muted-foreground/80">
              Você pode alterar manualmente se preferir
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
