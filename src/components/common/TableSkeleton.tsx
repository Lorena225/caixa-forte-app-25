import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ 
  rows = 5, 
  columns = 5, 
  showHeader = true 
}: TableSkeletonProps) {
  return (
    <Card className="animate-pulse">
      {showHeader && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </CardHeader>
      )}
      <CardContent className="p-0">
        <div className="border-t">
          {/* Header da tabela */}
          <div className="flex items-center gap-4 p-3 border-b bg-muted/30">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton 
                key={i} 
                className="h-4 flex-1" 
                style={{ maxWidth: i === 0 ? '200px' : '100px' }}
              />
            ))}
          </div>
          
          {/* Linhas da tabela */}
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div 
              key={rowIndex} 
              className="flex items-center gap-4 p-3 border-b last:border-b-0"
              style={{ animationDelay: `${rowIndex * 50}ms` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={colIndex} 
                  className="h-4 flex-1"
                  style={{ 
                    maxWidth: colIndex === 0 ? '200px' : colIndex === columns - 1 ? '80px' : '100px'
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
