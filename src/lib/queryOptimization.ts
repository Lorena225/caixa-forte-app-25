/**
 * Query Optimization Utilities
 * Best practices for Supabase queries in enterprise ERP
 */

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

// Maximum records per query (Supabase default limit is 1000)
export const MAX_PAGE_SIZE = 1000;
export const DEFAULT_PAGE_SIZE = 50;

// Valid table names from the database
type TableName = keyof Database['public']['Tables'];

/**
 * Pagination interface
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Date range filter interface
 */
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

/**
 * Build optimized select query with only necessary fields
 */
export function buildSelectFields(fields: string[]): string {
  return fields.join(', ');
}

/**
 * Common field sets for different entities
 */
export const SelectFields = {
  // Transaction list - minimal fields
  transactionsList: buildSelectFields([
    'id',
    'description',
    'amount',
    'due_date',
    'paid_date',
    'status',
    'direction',
    'counterparty:counterparties(id, name)',
    'account:accounts(id, name)',
    'wallet:wallets(id, name)',
  ]),

  // Transaction detail - all fields
  transactionDetail: '*',

  // Dashboard KPIs - aggregated
  dashboardKPIs: buildSelectFields([
    'id',
    'amount',
    'status',
    'direction',
    'due_date',
    'paid_date',
  ]),

  // Counterparty list
  counterpartyList: buildSelectFields([
    'id',
    'name',
    'document',
    'email',
    'phone',
    'is_active',
  ]),

  // Account list
  accountList: buildSelectFields([
    'id',
    'code',
    'name',
    'category_type',
    'is_active',
    'parent_id',
  ]),

  // Wallet list
  walletList: buildSelectFields([
    'id',
    'name',
    'initial_balance',
    'is_active',
    'bank_name',
  ]),
};

/**
 * Apply pagination to a select query
 * Must be called after .select()
 */
export function applyPagination(
  params: PaginationParams
): { from: number; to: number } {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, params.pageSize || DEFAULT_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { from, to };
}

/**
 * Apply date range filter - returns filter conditions
 */
export function getDateRangeConditions(
  filter: DateRangeFilter,
  dateColumn: string = 'created_at'
): { column: string; operator: 'gte' | 'lte'; value: string }[] {
  const conditions: { column: string; operator: 'gte' | 'lte'; value: string }[] = [];

  if (filter.startDate) {
    conditions.push({ column: dateColumn, operator: 'gte', value: filter.startDate });
  }

  if (filter.endDate) {
    conditions.push({ column: dateColumn, operator: 'lte', value: filter.endDate });
  }

  return conditions;
}

/**
 * Build cursor-based pagination params (more efficient for large datasets)
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit?: number;
  direction?: 'forward' | 'backward';
}

export function getCursorPaginationParams(
  params: CursorPaginationParams
): {
  limit: number;
  ascending: boolean;
  cursorFilter?: { operator: 'gt' | 'lt'; value: string };
} {
  const limit = Math.min(MAX_PAGE_SIZE, params.limit || DEFAULT_PAGE_SIZE);
  const ascending = params.direction === 'backward';

  return {
    limit,
    ascending,
    cursorFilter: params.cursor
      ? { operator: ascending ? 'gt' : 'lt', value: params.cursor }
      : undefined,
  };
}

/**
 * Batch loading utility for avoiding N+1 queries
 */
export async function batchLoad<T, K extends string | number>(
  ids: K[],
  loader: (ids: K[]) => Promise<T[]>,
  getKey: (item: T) => K,
  batchSize: number = 100
): Promise<Map<K, T>> {
  const result = new Map<K, T>();
  const uniqueIds = [...new Set(ids)];

  for (let i = 0; i < uniqueIds.length; i += batchSize) {
    const batch = uniqueIds.slice(i, i + batchSize);
    const items = await loader(batch);
    
    for (const item of items) {
      result.set(getKey(item), item);
    }
  }

  return result;
}

/**
 * Parallel query execution with error handling
 */
export async function executeParallelQueries<T extends Record<string, () => Promise<unknown>>>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const keys = Object.keys(queries);
  const promises = keys.map(key => queries[key]());
  
  const results = await Promise.all(
    promises.map(p => p.catch(e => ({ error: e })))
  );

  const output: Record<string, unknown> = {};
  keys.forEach((key, index) => {
    const result = results[index];
    if (result && typeof result === 'object' && 'error' in result) {
      console.error(`Query ${key} failed:`, result.error);
      output[key] = null;
    } else {
      output[key] = result;
    }
  });

  return output as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

/**
 * Debounced query execution for search/filter inputs
 */
export function createDebouncedQuery<T extends (...args: unknown[]) => Promise<unknown>>(
  queryFn: T,
  delay: number = 300
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: { resolve: (value: unknown) => void; reject: (error: unknown) => void } | null = null;

  return ((...args: Parameters<T>) => {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        if (pendingPromise) {
          pendingPromise.reject(new Error('Query cancelled'));
        }
      }

      pendingPromise = { resolve, reject };

      timeoutId = setTimeout(async () => {
        try {
          const result = await queryFn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          timeoutId = null;
          pendingPromise = null;
        }
      }, delay);
    });
  }) as T;
}

/**
 * Query result transformer for consistent data shaping
 */
export function transformQueryResult<T, R>(
  data: T[] | null,
  transformer: (item: T) => R
): R[] {
  if (!data) return [];
  return data.map(transformer);
}

/**
 * Safe count query for transactions table
 */
export async function getTransactionsCount(
  companyId: string
): Promise<number> {
  const { count } = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  return count || 0;
}

/**
 * Safe count query for counterparties table
 */
export async function getCounterpartiesCount(
  companyId: string
): Promise<number> {
  const { count } = await supabase
    .from('counterparties')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId);

  return count || 0;
}

/**
 * Optimized aggregation queries for specific tables
 */
export const AggregationQueries = {
  /**
   * Sum transaction total_amounts by status
   */
  async sumTransactionsByStatus(
    companyId: string
  ): Promise<Record<string, number>> {
    const { data } = await supabase
      .from('transactions')
      .select('status, total_amount')
      .eq('company_id', companyId);

    if (!data) return {};

    return data.reduce((acc, row) => {
      const status = row.status || 'unknown';
      acc[status] = (acc[status] || 0) + (row.total_amount || 0);
      return acc;
    }, {} as Record<string, number>);
  },

  /**
   * Count transactions by month
   */
  async countTransactionsByMonth(
    companyId: string,
    year: number
  ): Promise<Record<number, number>> {
    const { data } = await supabase
      .from('transactions')
      .select('id, created_at')
      .eq('company_id', companyId)
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);

    if (!data) return {};

    return data.reduce((acc, row) => {
      const month = new Date(row.created_at).getMonth() + 1;
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
  },

  /**
   * Sum audit logs by action type
   */
  async countAuditLogsByAction(
    companyId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Record<string, number>> {
    let query = supabase
      .from('audit_logs')
      .select('action')
      .eq('company_id', companyId);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data } = await query;

    if (!data) return {};

    return data.reduce((acc, row) => {
      const action = row.action as string;
      acc[action] = (acc[action] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  },
};

/**
 * Query hints for common optimization patterns
 */
export const QueryOptimizationHints = {
  // Always filter by company_id first (uses composite index)
  COMPANY_ID_FIRST: 'Always include company_id in WHERE clause first',
  
  // Use specific date ranges, not open-ended
  DATE_RANGE_BOUNDED: 'Always bound date ranges to prevent full table scans',
  
  // Limit results for lists
  ALWAYS_PAGINATE: 'Always use pagination for list queries',
  
  // Select only needed fields
  SELECT_SPECIFIC: 'Select only the fields you need, avoid SELECT *',
  
  // Use eager loading for related data
  EAGER_LOAD: 'Use joins for related data instead of N+1 queries',
  
  // Order by indexed columns
  ORDER_BY_INDEX: 'Order by columns that have indexes (created_at, status)',
};
