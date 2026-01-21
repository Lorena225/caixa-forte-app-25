import React, { memo, useCallback, CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualizedListProps<T> {
  items: T[];
  height?: number;
  itemHeight?: number;
  width?: string | number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  className?: string;
  overscanCount?: number;
  isLoading?: boolean;
  loadingItemCount?: number;
}

/**
 * Virtualized List Component
 * Custom implementation that only renders visible items + buffer
 * For large lists (1000+ items), consider using react-window directly
 */
export function VirtualizedList<T>({
  items,
  height = 400,
  itemHeight = 60,
  renderItem,
  className,
  overscanCount = 5,
  isLoading = false,
  loadingItemCount = 10,
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const itemCount = isLoading ? loadingItemCount : items.length;
  const totalHeight = itemCount * itemHeight;

  // Calculate visible range
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscanCount);
  const endIndex = Math.min(
    itemCount - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscanCount
  );

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const style: CSSProperties = {
      position: 'absolute',
      top: i * itemHeight,
      height: itemHeight,
      left: 0,
      right: 0,
    };

    if (isLoading) {
      visibleItems.push(
        <div key={i} style={style} className="px-4 py-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
      );
    } else {
      const item = items[i];
      if (item !== undefined) {
        visibleItems.push(
          <React.Fragment key={i}>
            {renderItem(item, i, style)}
          </React.Fragment>
        );
      }
    }
  }

  if (itemCount === 0 && !isLoading) {
    return (
      <div 
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ height }}
      >
        Nenhum item encontrado
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto relative", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

interface VariableHeightListProps<T> {
  items: T[];
  height?: number;
  getItemHeight: (index: number) => number;
  renderItem: (item: T, index: number, style: CSSProperties) => ReactNode;
  className?: string;
  overscanCount?: number;
}

/**
 * Variable Height Virtualized List
 * For items with dynamic heights
 */
export function VariableHeightList<T>({
  items,
  height = 400,
  getItemHeight,
  renderItem,
  className,
  overscanCount = 5,
}: VariableHeightListProps<T>) {
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Calculate item positions
  const itemPositions = React.useMemo(() => {
    const positions: number[] = [];
    let currentTop = 0;
    for (let i = 0; i < items.length; i++) {
      positions.push(currentTop);
      currentTop += getItemHeight(i);
    }
    return positions;
  }, [items.length, getItemHeight]);

  const totalHeight = itemPositions.length > 0
    ? itemPositions[itemPositions.length - 1] + getItemHeight(items.length - 1)
    : 0;

  // Find visible range using binary search
  const findStartIndex = () => {
    let low = 0;
    let high = items.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (itemPositions[mid] < scrollTop) {
        low = mid + 1;
      } else {
        high = mid;
      }
    }
    return Math.max(0, low - overscanCount);
  };

  const startIndex = findStartIndex();
  const endIndex = (() => {
    let i = startIndex;
    while (i < items.length && itemPositions[i] < scrollTop + height) {
      i++;
    }
    return Math.min(items.length - 1, i + overscanCount);
  })();

  const visibleItems = [];
  for (let i = startIndex; i <= endIndex; i++) {
    const style: CSSProperties = {
      position: 'absolute',
      top: itemPositions[i],
      height: getItemHeight(i),
      left: 0,
      right: 0,
    };
    visibleItems.push(
      <React.Fragment key={i}>
        {renderItem(items[i], i, style)}
      </React.Fragment>
    );
  }

  if (items.length === 0) {
    return (
      <div 
        className={cn("flex items-center justify-center text-muted-foreground", className)}
        style={{ height }}
      >
        Nenhum item encontrado
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-auto relative", className)}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems}
      </div>
    </div>
  );
}

// Memoized wrapper for table rows
interface VirtualizedTableRowProps {
  style: CSSProperties;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export const VirtualizedTableRow = memo(function VirtualizedTableRow({
  style,
  children,
  className,
  onClick,
}: VirtualizedTableRowProps) {
  return (
    <div
      style={style}
      className={cn(
        "flex items-center border-b border-border hover:bg-muted/50 transition-colors",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
});

// Pre-built virtualized table component
interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string | number;
  render?: (item: T, index: number) => ReactNode;
  className?: string;
}

interface VirtualizedTableProps<T> {
  items: T[];
  columns: Column<T>[];
  height?: number;
  rowHeight?: number;
  onRowClick?: (item: T, index: number) => void;
  className?: string;
  isLoading?: boolean;
}

export function VirtualizedTable<T extends Record<string, unknown>>({
  items,
  columns,
  height = 400,
  rowHeight = 48,
  onRowClick,
  className,
  isLoading = false,
}: VirtualizedTableProps<T>) {
  const renderItem = useCallback(
    (item: T, index: number, style: CSSProperties) => (
      <VirtualizedTableRow
        style={style}
        onClick={onRowClick ? () => onRowClick(item, index) : undefined}
      >
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className={cn("px-3 py-2 truncate", column.className)}
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.render
              ? column.render(item, index)
              : String(item[column.key as keyof T] ?? '')}
          </div>
        ))}
      </VirtualizedTableRow>
    ),
    [columns, onRowClick]
  );

  return (
    <div className={cn("border rounded-lg overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center bg-muted/50 border-b border-border font-medium">
        {columns.map((column) => (
          <div
            key={String(column.key)}
            className={cn("px-3 py-3 truncate text-sm", column.className)}
            style={{ width: column.width || 'auto', flex: column.width ? 'none' : 1 }}
          >
            {column.header}
          </div>
        ))}
      </div>
      
      {/* Body */}
      <VirtualizedList
        items={items}
        height={height - 48} // Subtract header height
        itemHeight={rowHeight}
        renderItem={renderItem}
        isLoading={isLoading}
      />
    </div>
  );
}

export default VirtualizedList;
