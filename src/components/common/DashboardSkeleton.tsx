import { KPICardSkeleton } from "./KPICardSkeleton";
import { ChartSkeleton } from "./ChartSkeleton";
import { TableSkeleton } from "./TableSkeleton";

interface DashboardSkeletonProps {
  kpiCount?: number;
  showCharts?: boolean;
  showTable?: boolean;
}

export function DashboardSkeleton({ 
  kpiCount = 6, 
  showCharts = true, 
  showTable = true 
}: DashboardSkeletonProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* KPIs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KPICardSkeleton count={kpiCount} />
      </div>
      
      {/* Charts Section */}
      {showCharts && (
        <div className="grid gap-4 md:grid-cols-2">
          <ChartSkeleton height="280px" />
          <ChartSkeleton height="280px" />
        </div>
      )}
      
      {/* Table Section */}
      {showTable && (
        <TableSkeleton rows={8} columns={6} />
      )}
    </div>
  );
}

// Export all skeleton components
export { KPICardSkeleton } from "./KPICardSkeleton";
export { ChartSkeleton } from "./ChartSkeleton";
export { TableSkeleton } from "./TableSkeleton";
