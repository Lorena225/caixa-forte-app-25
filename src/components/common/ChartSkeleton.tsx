import { forwardRef } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface ChartSkeletonProps {
  height?: string;
  title?: boolean;
}

export const ChartSkeleton = forwardRef<HTMLDivElement, ChartSkeletonProps>(
  function ChartSkeleton({ height = "300px", title = true }, ref) {
    return (
      <Card ref={ref} className="animate-pulse">
        {title && (
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-56 mt-1" />
          </CardHeader>
        )}
        <CardContent>
          <div 
            className="flex items-end justify-between gap-2 px-4"
            style={{ height }}
          >
            {/* Barras simulando um gráfico de barras */}
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton 
                key={i}
                className="w-full rounded-t-sm"
                style={{ 
                  height: `${Math.random() * 60 + 30}%`,
                  animationDelay: `${i * 50}ms`
                }}
              />
            ))}
          </div>
          {/* Eixo X simulado */}
          <div className="flex justify-between mt-3 px-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-3 w-8" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);

ChartSkeleton.displayName = "ChartSkeleton";
