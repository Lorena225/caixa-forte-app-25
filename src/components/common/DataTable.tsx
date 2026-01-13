import { ReactNode, useState } from 'react';
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

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
  className?: string;
  /** Hide this column on mobile (< sm breakpoint) */
  hideOnMobile?: boolean;
  /** Column is sortable */
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  /** Enable row actions in a kebab menu on mobile */
  mobileActions?: (item: T) => { label: string; onClick: () => void; icon?: ReactNode; variant?: 'default' | 'destructive' }[];
  /** Page size for pagination */
  pageSize?: number;
}

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyMessage = 'Nenhum registro encontrado',
  onRowClick,
  mobileActions,
  pageSize,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  
  // Pagination logic
  const totalPages = pageSize ? Math.ceil(data.length / pageSize) : 1;
  const paginatedData = pageSize 
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

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

  // Separate visible columns for mobile vs desktop
  const visibleColumns = columns.filter(col => !col.hideOnMobile);
  const hasHiddenColumns = columns.some(col => col.hideOnMobile);

  return (
    <div className="space-y-4">
      {/* Responsive Table Container */}
      <div className="table-container rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
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
              {/* Mobile Actions Column */}
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
                  onRowClick && 'cursor-pointer hover:bg-muted/50'
                )}
                onClick={() => onRowClick?.(item)}
              >
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
                      : (item as any)[col.key]}
                  </TableCell>
                ))}
                {/* Mobile Actions Cell */}
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
    </div>
  );
}
