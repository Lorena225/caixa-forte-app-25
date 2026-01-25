import { ReactNode, useState, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, MoreVertical, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BulkSelectionCheckbox } from '@/components/bulk/BulkSelectionCheckbox';
import { BulkActionsBar, BulkAction } from '@/components/bulk/BulkActionsBar';
import { useBulkSelection } from '@/hooks/useBulkSelection';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  cell?: (item: T) => ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  sortable?: boolean;
}

interface DataTableWithSelectionProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  mobileActions?: (item: T) => { label: string; onClick: () => void; icon?: ReactNode; variant?: 'default' | 'destructive' }[];
  pageSize?: number;
  // Bulk selection props
  enableSelection?: boolean;
  bulkActions?: BulkAction[];
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkStatusChange?: (ids: string[], status: string) => Promise<void>;
  canSelect?: (item: T) => boolean;
}

export function DataTableWithSelection<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  mobileActions,
  pageSize,
  enableSelection = false,
  bulkActions = [],
  canSelect = () => true,
}: DataTableWithSelectionProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const bulkSelection = useBulkSelection({
    data,
    canSelect,
    persistSelection: false,
  });

  // Pagination logic
  const totalPages = pageSize ? Math.ceil(data.length / pageSize) : 1;
  const paginatedData = pageSize 
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  const handleRowClick = useCallback((item: T, e: React.MouseEvent) => {
    // Don't trigger row click if clicking on checkbox
    if ((e.target as HTMLElement).closest('[data-checkbox]')) {
      return;
    }
    onRowClick?.(item);
  }, [onRowClick]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Responsive Table Container */}
      <div className="table-container rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {enableSelection && (
                <TableHead className="w-12">
                  <div data-checkbox>
                    <BulkSelectionCheckbox
                      checked={bulkSelection.isAllSelected}
                      indeterminate={bulkSelection.isPartialSelected}
                      onChange={bulkSelection.toggleAll}
                      isHeader
                    />
                  </div>
                </TableHead>
              )}
              {columns.map((col) => (
                <TableHead 
                  key={col.key} 
                  className={cn(
                    'text-xs font-medium',
                    col.className,
                    col.hideOnMobile && 'hidden sm:table-cell'
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
              {mobileActions && (
                <TableHead className="w-10 sm:hidden" />
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item) => (
              <TableRow
                key={item.id}
                className={cn(
                  'text-sm',
                  onRowClick && 'cursor-pointer hover:bg-muted/50',
                  bulkSelection.isSelected(item.id) && 'bg-primary/5'
                )}
                onClick={(e) => handleRowClick(item, e)}
              >
                {enableSelection && (
                  <TableCell className="w-12" data-checkbox>
                    <BulkSelectionCheckbox
                      checked={bulkSelection.isSelected(item.id)}
                      onChange={() => bulkSelection.toggleItem(item.id)}
                      disabled={!canSelect(item)}
                      tooltip={!canSelect(item) ? "Item não pode ser selecionado" : undefined}
                    />
                  </TableCell>
                )}
                {columns.map((col) => (
                  <TableCell 
                    key={col.key} 
                    className={cn(
                      col.className,
                      col.hideOnMobile && 'hidden sm:table-cell'
                    )}
                  >
                    {col.render
                      ? col.render(item)
                      : col.cell
                        ? col.cell(item)
                        : (item as any)[col.key]}
                  </TableCell>
                ))}
                {mobileActions && (
                  <TableCell className="w-10 p-2 sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {mobileActions(item).map((action, idx) => (
                          <DropdownMenuItem
                            key={idx}
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick();
                            }}
                            className={cn(
                              action.variant === 'destructive' && 'text-destructive'
                            )}
                          >
                            {action.icon && <span className="mr-2">{action.icon}</span>}
                            {action.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs text-muted-foreground">
            Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, data.length)} de {data.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {enableSelection && (
        <BulkActionsBar
          selectedCount={bulkSelection.count}
          onClearSelection={bulkSelection.deselectAll}
          actions={bulkActions}
          isProcessing={isProcessing}
        />
      )}
    </div>
  );
}
