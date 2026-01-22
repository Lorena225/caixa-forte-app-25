import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/formatters';

interface Row {
  id: string;
  level: number;
  label: string;
  value?: number;
  children?: Row[];
  isExpanded?: boolean;
}

interface HierarchicalTableProps {
  rows: Row[];
  columns: string[];
  formatValue?: (value: number) => string;
}

export const HierarchicalTable: React.FC<HierarchicalTableProps> = ({
  rows,
  columns,
  formatValue = (v) => formatCurrency(v),
}) => {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const renderRows = (items: Row[]): JSX.Element[] => {
    return items.map((row) => (
      <React.Fragment key={row.id}>
        <tr className={`border-t border-border ${row.level === 0 ? 'bg-muted/50 font-semibold' : ''}`}>
          <td className="px-4 py-3">
            <div 
              style={{ paddingLeft: `${row.level * 20}px` }} 
              className="flex items-center gap-2"
            >
              {row.children && row.children.length > 0 ? (
                <button 
                  onClick={() => toggleRow(row.id)} 
                  className="p-1 hover:bg-muted rounded"
                >
                  {expandedRows.has(row.id) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <div className="w-6" />
              )}
              <span>{row.label}</span>
            </div>
          </td>
          {columns.map((col, idx) => (
            <td key={idx} className="px-4 py-3 text-right font-mono">
              {idx === 0 && row.value !== undefined ? formatValue(row.value) : '-'}
            </td>
          ))}
        </tr>
        {expandedRows.has(row.id) && row.children && renderRows(row.children)}
      </React.Fragment>
    ));
  };

  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="px-4 py-3 text-left font-semibold text-foreground">Descrição</th>
            {columns.map((col, idx) => (
              <th key={idx} className="px-4 py-3 text-right font-semibold text-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{renderRows(rows)}</tbody>
      </table>
    </div>
  );
};
