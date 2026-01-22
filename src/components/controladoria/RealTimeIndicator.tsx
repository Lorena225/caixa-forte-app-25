import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface RealTimeIndicatorProps {
  label: string;
  value: number | string;
  unit?: string;
  format?: 'currency' | 'percentage' | 'number';
  change?: number;
  status?: 'normal' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
}

export const RealTimeIndicator: React.FC<RealTimeIndicatorProps> = ({
  label,
  value,
  unit = '',
  format = 'currency',
  change = 0,
  status = 'normal',
  trend = 'stable',
}) => {
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'critical': return 'text-destructive bg-destructive/10';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-destructive" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

  const formatValue = () => {
    if (format === 'currency') {
      const num = typeof value === 'number' ? value : 0;
      return formatCurrency(num);
    }
    if (format === 'percentage') {
      return `${typeof value === 'number' ? value.toFixed(1) : value}%`;
    }
    return value;
  };

  return (
    <div className={`rounded-lg p-4 ${getStatusColor(status)}`}>
      <p className="text-sm font-medium text-muted-foreground mb-2">{label}</p>
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-2xl font-bold text-foreground font-mono">
            {formatValue()}
            {unit && <span className="text-sm text-muted-foreground ml-1">{unit}</span>}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {getTrendIcon()}
          <span className={`text-sm font-medium ${change >= 0 ? 'text-green-600' : 'text-destructive'}`}>
            {change >= 0 ? '+' : ''}{change.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
};
