import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface ComparisonChartProps {
  label: string;
  current: number;
  previous: number;
  format?: 'currency' | 'percentage' | 'number';
}

export const ComparisonChart: React.FC<ComparisonChartProps> = ({
  label,
  current,
  previous,
  format = 'currency',
}) => {
  const variation = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = variation >= 0;

  const formatValue = (value: number) => {
    if (format === 'currency') return formatCurrency(value);
    if (format === 'percentage') return `${value.toFixed(1)}%`;
    return value.toLocaleString('pt-BR');
  };

  const maxValue = Math.max(current, previous) * 1.1;
  const currentPercent = maxValue > 0 ? (current / maxValue) * 100 : 0;
  const previousPercent = maxValue > 0 ? (previous / maxValue) * 100 : 0;

  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground">{label}</h4>
        <div className={`flex items-center gap-1 ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {isPositive ? '+' : ''}{variation.toFixed(1)}%
          </span>
        </div>
      </div>
      
      <div className="space-y-3">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-muted-foreground">Atual</span>
            <span className="text-sm font-semibold font-mono">{formatValue(current)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              style={{ width: `${currentPercent}%` }} 
              className="bg-primary h-2 rounded-full transition-all duration-500"
            />
          </div>
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm text-muted-foreground">Anterior</span>
            <span className="text-sm font-semibold font-mono">{formatValue(previous)}</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              style={{ width: `${previousPercent}%` }} 
              className="bg-muted-foreground/40 h-2 rounded-full transition-all duration-500"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Variação</span>
          <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : 'text-destructive'}`}>
            {formatValue(current - previous)}
          </span>
        </div>
      </div>
    </div>
  );
};
