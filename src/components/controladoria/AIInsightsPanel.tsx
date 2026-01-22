import React from 'react';
import { AlertCircle, TrendingUp, AlertTriangle, Award, ChevronRight } from 'lucide-react';

interface Insight {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  icon: string;
  action?: { label: string; target: string };
}

interface AIInsightsPanelProps {
  insights: Insight[];
  isLoading?: boolean;
  onActionClick?: (action: { label: string; target: string }) => void;
  maxItems?: number;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  insights = [],
  isLoading = false,
  onActionClick,
  maxItems = 3,
}) => {
  const displayedInsights = insights.slice(0, maxItems);

  const getIconComponent = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      TrendingUp: <TrendingUp className="w-5 h-5" />,
      AlertCircle: <AlertCircle className="w-5 h-5" />,
      AlertTriangle: <AlertTriangle className="w-5 h-5" />,
      Award: <Award className="w-5 h-5" />,
    };
    return iconMap[iconName] || <AlertCircle className="w-5 h-5" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-4 border-destructive bg-destructive/10';
      case 'warning': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'info': return 'border-l-4 border-primary bg-primary/10';
      default: return 'border-l-4 border-muted bg-muted';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📌';
    }
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 animate-pulse">
        <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (displayedInsights.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-6 text-center text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
        <p>Nenhum insight disponível no momento</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <span className="text-xl">🧠</span> Insights da IA
        </h3>
      </div>
      <div className="divide-y divide-border">
        {displayedInsights.map((insight) => (
          <div 
            key={insight.id} 
            className={`p-4 ${getSeverityColor(insight.severity)} hover:opacity-90 transition-opacity`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-lg">
                {getSeverityIcon(insight.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground text-sm">{insight.title}</h4>
                <p className="text-muted-foreground text-sm mt-1">{insight.description}</p>
                {insight.action && (
                  <button 
                    onClick={() => onActionClick?.(insight.action!)} 
                    className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    {insight.action.label} <ChevronRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
