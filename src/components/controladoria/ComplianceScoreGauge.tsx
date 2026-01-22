import React from 'react';
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface ComplianceScoreGaugeProps {
  score: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}

export const ComplianceScoreGauge: React.FC<ComplianceScoreGaugeProps> = ({
  score,
  label = 'Score de Compliance',
  size = 'md',
  showStatus = true,
}) => {
  const clampedScore = Math.max(0, Math.min(100, score));
  
  const getStatus = () => {
    if (clampedScore >= 80) return { text: 'Excelente', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
    if (clampedScore >= 60) return { text: 'Bom', color: 'text-yellow-600', bg: 'bg-yellow-100', icon: AlertCircle };
    return { text: 'Atenção', color: 'text-destructive', bg: 'bg-destructive/10', icon: XCircle };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  const sizeMap = {
    sm: { container: 'w-24 h-24', text: 'text-xl', stroke: 6 },
    md: { container: 'w-32 h-32', text: 'text-3xl', stroke: 8 },
    lg: { container: 'w-40 h-40', text: 'text-4xl', stroke: 10 },
  };

  const { container, text, stroke } = sizeMap[size];
  
  // Calculate stroke dasharray for the progress arc
  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  const progressLength = (clampedScore / 100) * circumference * 0.75; // 75% of circle (270 degrees)

  const getStrokeColor = () => {
    if (clampedScore >= 80) return 'stroke-green-500';
    if (clampedScore >= 60) return 'stroke-yellow-500';
    return 'stroke-destructive';
  };

  return (
    <div className="flex flex-col items-center">
      {label && (
        <p className="text-sm font-medium text-muted-foreground mb-3">{label}</p>
      )}
      
      <div className={`relative ${container}`}>
        <svg className="w-full h-full transform -rotate-[135deg]" viewBox="0 0 120 120">
          {/* Background arc */}
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            className="stroke-muted"
            strokeWidth={stroke}
            strokeDasharray={`${circumference * 0.75} ${circumference}`}
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <circle 
            cx="60" 
            cy="60" 
            r={radius} 
            fill="none" 
            className={getStrokeColor()}
            strokeWidth={stroke}
            strokeDasharray={`${progressLength} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
          />
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`${text} font-bold ${status.color} font-mono`}>
            {Math.round(clampedScore)}%
          </span>
        </div>
      </div>
      
      {showStatus && (
        <div className={`mt-3 px-4 py-2 rounded-full ${status.bg} flex items-center gap-2`}>
          <StatusIcon className={`w-4 h-4 ${status.color}`} />
          <span className={`text-sm font-semibold ${status.color}`}>{status.text}</span>
        </div>
      )}
    </div>
  );
};
