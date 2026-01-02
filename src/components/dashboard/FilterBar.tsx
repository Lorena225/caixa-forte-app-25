import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format, subDays, startOfMonth, startOfQuarter, startOfYear, subMonths, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Filter, Save, X, ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useBranches } from '@/hooks/useDashboardData';
import { useCostCenters, useWallets, useCounterparties, useDimensions, useDimensionValues } from '@/hooks/useCompanyData';

export interface DashboardFilters {
  fromDate: Date;
  toDate: Date;
  branchIds: string[];
  costCenterIds: string[];
  walletIds: string[];
  customerIds: string[];
  supplierIds: string[];
  dimensionFilters: Record<string, string[]>;
  status: string;
  dateField: 'due_date' | 'paid_date' | 'transaction_date' | 'issue_date';
}

const datePresets = [
  { label: 'Hoje', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Ontem', getValue: () => ({ from: subDays(new Date(), 1), to: subDays(new Date(), 1) }) },
  { label: '7 dias', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: '30 dias', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'MTD', getValue: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: 'QTD', getValue: () => ({ from: startOfQuarter(new Date()), to: new Date() }) },
  { label: 'YTD', getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
  { label: '12 meses', getValue: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
  { label: 'Ano anterior', getValue: () => ({ from: startOfYear(subYears(new Date(), 1)), to: new Date(new Date().getFullYear() - 1, new Date().getMonth(), new Date().getDate()) }) },
];

const defaultFilters: DashboardFilters = {
  fromDate: startOfMonth(new Date()),
  toDate: new Date(),
  branchIds: [],
  costCenterIds: [],
  walletIds: [],
  customerIds: [],
  supplierIds: [],
  dimensionFilters: {},
  status: 'all',
  dateField: 'due_date',
};

interface FilterBarProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: DashboardFilters) => void;
  showDateField?: boolean;
  showStatus?: boolean;
  compact?: boolean;
}

export function FilterBar({ 
  filters, 
  onFiltersChange, 
  showDateField = false,
  showStatus = false,
  compact = false 
}: FilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Data sources
  const { data: branches = [] } = useBranches();
  const { data: costCenters = [] } = useCostCenters();
  const { data: wallets = [] } = useWallets();
  const { data: counterparties = [] } = useCounterparties();
  const { data: dimensions = [] } = useDimensions();
  const { data: dimensionValues = [] } = useDimensionValues();

  const customers = useMemo(() => 
    counterparties.filter(c => c.is_client === true),
    [counterparties]
  );
  
  const suppliers = useMemo(() => 
    counterparties.filter(c => c.is_supplier === true),
    [counterparties]
  );

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    params.set('from', format(filters.fromDate, 'yyyy-MM-dd'));
    params.set('to', format(filters.toDate, 'yyyy-MM-dd'));
    if (filters.branchIds.length) params.set('branch', filters.branchIds.join(','));
    if (filters.costCenterIds.length) params.set('cc', filters.costCenterIds.join(','));
    if (filters.walletIds.length) params.set('wallet', filters.walletIds.join(','));
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.dateField !== 'due_date') params.set('dateField', filters.dateField);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const handleDatePreset = (preset: typeof datePresets[0]) => {
    const { from, to } = preset.getValue();
    onFiltersChange({ ...filters, fromDate: from, toDate: to });
  };

  const handleReset = () => {
    onFiltersChange(defaultFilters);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.branchIds.length) count++;
    if (filters.costCenterIds.length) count++;
    if (filters.walletIds.length) count++;
    if (filters.customerIds.length) count++;
    if (filters.supplierIds.length) count++;
    if (filters.status !== 'all') count++;
    Object.values(filters.dimensionFilters).forEach(v => { if (v.length) count++; });
    return count;
  }, [filters]);

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Main Filter Row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(filters.fromDate, 'dd/MM/yy', { locale: ptBR })}
                {' - '}
                {format(filters.toDate, 'dd/MM/yy', { locale: ptBR })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="p-3 border-b">
                <div className="flex flex-wrap gap-1">
                  {datePresets.map((preset) => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleDatePreset(preset)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="flex">
                <Calendar
                  mode="single"
                  selected={filters.fromDate}
                  onSelect={(date) => date && onFiltersChange({ ...filters, fromDate: date })}
                  locale={ptBR}
                />
                <Calendar
                  mode="single"
                  selected={filters.toDate}
                  onSelect={(date) => date && onFiltersChange({ ...filters, toDate: date })}
                  locale={ptBR}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Quick Filters */}
        {!compact && (
          <>
            {/* Branches */}
            {branches.length > 0 && (
              <Select
                value={filters.branchIds[0] || '__all__'}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  branchIds: value === '__all__' ? [] : [value] 
                })}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Filial" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Cost Centers */}
            {costCenters.length > 0 && (
              <Select
                value={filters.costCenterIds[0] || '__all__'}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  costCenterIds: value === '__all__' ? [] : [value] 
                })}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Centro de Custo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {costCenters.map((cc) => (
                    <SelectItem key={cc.id} value={cc.id}>{cc.code} - {cc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Wallets */}
            {wallets.length > 0 && (
              <Select
                value={filters.walletIds[0] || '__all__'}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  walletIds: value === '__all__' ? [] : [value] 
                })}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Carteira" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
                  {wallets.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </>
        )}

        {/* Status Filter */}
        {showStatus && (
          <Select
            value={filters.status}
            onValueChange={(value) => onFiltersChange({ ...filters, status: value })}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Em Aberto</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
              <SelectItem value="overdue">Vencidos</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Date Field */}
        {showDateField && (
          <Select
            value={filters.dateField}
            onValueChange={(value: DashboardFilters['dateField']) => 
              onFiltersChange({ ...filters, dateField: value })
            }
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">Vencimento</SelectItem>
              <SelectItem value="paid_date">Pagamento</SelectItem>
              <SelectItem value="transaction_date">Lançamento</SelectItem>
              <SelectItem value="issue_date">Emissão</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Expand/Collapse More Filters */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <Filter className="h-4 w-4" />
          Mais filtros
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
          <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
        </Button>

        {/* Reset */}
        <Button variant="ghost" size="sm" className="h-9" onClick={handleReset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Expanded Filters */}
      <Collapsible open={isExpanded}>
        <CollapsibleContent className="pt-4 border-t space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Customers */}
            {customers.length > 0 && (
              <Select
                value={filters.customerIds[0] || '__all__'}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  customerIds: value === '__all__' ? [] : [value] 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Suppliers */}
            {suppliers.length > 0 && (
              <Select
                value={filters.supplierIds[0] || '__all__'}
                onValueChange={(value) => onFiltersChange({ 
                  ...filters, 
                  supplierIds: value === '__all__' ? [] : [value] 
                })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todos</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Dynamic Dimensions */}
            {dimensions.map((dim) => {
              const values = dimensionValues.filter(v => v.dimension_id === dim.id);
              if (!values.length) return null;
              
              return (
                <Select
                  key={dim.id}
                  value={filters.dimensionFilters[dim.id]?.[0] || '__all__'}
                  onValueChange={(value) => onFiltersChange({ 
                    ...filters, 
                    dimensionFilters: {
                      ...filters.dimensionFilters,
                      [dim.id]: value === '__all__' ? [] : [value]
                    }
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={dim.name} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {values.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.code} - {v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })}
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.branchIds.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Filial: {branches.find(b => b.id === filters.branchIds[0])?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ ...filters, branchIds: [] })}
                  />
                </Badge>
              )}
              {filters.costCenterIds.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  CC: {costCenters.find(c => c.id === filters.costCenterIds[0])?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ ...filters, costCenterIds: [] })}
                  />
                </Badge>
              )}
              {filters.walletIds.length > 0 && (
                <Badge variant="secondary" className="gap-1">
                  Carteira: {wallets.find(w => w.id === filters.walletIds[0])?.name}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => onFiltersChange({ ...filters, walletIds: [] })}
                  />
                </Badge>
              )}
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function useFilters(): [DashboardFilters, (filters: DashboardFilters) => void] {
  const [searchParams] = useSearchParams();
  
  const [filters, setFilters] = useState<DashboardFilters>(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    
    return {
      ...defaultFilters,
      fromDate: from ? new Date(from) : defaultFilters.fromDate,
      toDate: to ? new Date(to) : defaultFilters.toDate,
      branchIds: searchParams.get('branch')?.split(',').filter(Boolean) || [],
      costCenterIds: searchParams.get('cc')?.split(',').filter(Boolean) || [],
      walletIds: searchParams.get('wallet')?.split(',').filter(Boolean) || [],
      status: searchParams.get('status') || 'all',
      dateField: (searchParams.get('dateField') as DashboardFilters['dateField']) || 'due_date',
    };
  });

  return [filters, setFilters];
}
