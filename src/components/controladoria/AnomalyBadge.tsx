import React from 'react';
import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AnomalyBadgeProps {
  type: 'critical' | 'warning' | 'info';
  description: string;
  action?: { label: string; onClick: () => void };
}

export const AnomalyBadge: React.FC<AnomalyBadgeProps> = ({ 
  type, 
  description, 
  action 
}) => {
  const getStyles = () => {
    switch (type) {
      case 'critical': return 'bg-destructive/10 text-destructive border-destructive/30';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'info': return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'critical': return <AlertTriangle className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'info': return <Info className="w-4 h-4" />;
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStyles()}`}>
      {getIcon()}
      <span className="text-sm font-medium">{description}</span>
      {action && (
        <button 
          onClick={action.onClick} 
          className="ml-2 font-semibold underline hover:opacity-75"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
