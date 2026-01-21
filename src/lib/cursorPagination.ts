import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

/**
 * Cursor-based pagination utilities
 * More efficient than offset pagination for large datasets
 */

export interface CursorPaginationResult<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalEstimate?: number;
}

export interface CursorPaginationOptions {
  cursor?: string | null;
  limit?: number;
  direction?: 'forward' | 'backward';
  orderColumn?: string;
  orderDirection?: 'asc' | 'desc';
}

type TransactionStatus = Database['public']['Enums']['transaction_status'];

/**
 * Specialized cursor pagination for transactions
 */
export async function fetchTransactionsWithCursor(
  companyId: string,
  options: CursorPaginationOptions & {
    txDirection?: 'entrada' | 'saida';
    status?: TransactionStatus;
    fromDate?: string;
    toDate?: string;
  } = {}
): Promise<CursorPaginationResult<Record<string, unknown>>> {
  const {
    cursor = null,
    limit = 50,
    direction: cursorDirection = 'forward',
    orderColumn = 'due_date',
    orderDirection = 'desc',
    txDirection,
    status,
    fromDate,
    toDate,
  } = options;

  const fetchLimit = limit + 1;

  let query = supabase
    .from('transactions')
    .select(`
      id, description, direction, total_amount, due_date, paid_date, status, document_number,
      counterparty:counterparty_id(id, name),
      account:account_id(id, code, name),
      wallet:wallet_id(id, name)
    `)
    .eq('company_id', companyId)
    .neq('status', 'cancelado' as TransactionStatus)
    .order(orderColumn as 'due_date', { ascending: orderDirection === 'asc' })
    .limit(fetchLimit);

  // Apply filters
  if (txDirection) {
    query = query.eq('direction', txDirection);
  }
  
  if (status) {
    query = query.eq('status', status);
  }

  if (fromDate) {
    query = query.gte('due_date', fromDate);
  }

  if (toDate) {
    query = query.lte('due_date', toDate);
  }

  // Apply cursor
  if (cursor) {
    if (cursorDirection === 'forward') {
      if (orderDirection === 'desc') {
        query = query.lt('due_date', cursor);
      } else {
        query = query.gt('due_date', cursor);
      }
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = data || [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  const firstItem = resultItems[0];
  const lastItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems as unknown as Record<string, unknown>[],
    nextCursor: hasMore && lastItem ? String(lastItem.due_date) : null,
    prevCursor: cursor && firstItem ? String(firstItem.due_date) : null,
    hasNextPage: hasMore,
    hasPrevPage: !!cursor,
  };
}

/**
 * Cursor pagination for counterparties
 */
export async function fetchCounterpartiesWithCursor(
  companyId: string,
  options: CursorPaginationOptions & {
    type?: 'cliente' | 'fornecedor' | 'ambos';
    searchTerm?: string;
  } = {}
): Promise<CursorPaginationResult<Record<string, unknown>>> {
  const {
    cursor = null,
    limit = 50,
    direction: cursorDirection = 'forward',
    orderColumn = 'name',
    orderDirection = 'asc',
    type,
    searchTerm,
  } = options;

  const fetchLimit = limit + 1;

  let query = supabase
    .from('counterparties')
    .select('id, name, type, document, email, phone, is_active')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order(orderColumn as 'name', { ascending: orderDirection === 'asc' })
    .limit(fetchLimit);

  if (type) {
    query = query.eq('type', type);
  }

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`);
  }

  if (cursor) {
    if (cursorDirection === 'forward') {
      if (orderDirection === 'asc') {
        query = query.gt('name', cursor);
      } else {
        query = query.lt('name', cursor);
      }
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = data || [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  const firstItem = resultItems[0];
  const lastItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems as unknown as Record<string, unknown>[],
    nextCursor: hasMore && lastItem ? String(lastItem.name) : null,
    prevCursor: cursor && firstItem ? String(firstItem.name) : null,
    hasNextPage: hasMore,
    hasPrevPage: !!cursor,
  };
}

/**
 * Cursor pagination for audit logs
 */
export async function fetchAuditLogsWithCursor(
  companyId: string,
  options: CursorPaginationOptions & {
    tableName?: string;
    action?: string;
    userId?: string;
  } = {}
): Promise<CursorPaginationResult<Record<string, unknown>>> {
  const {
    cursor = null,
    limit = 50,
    direction: cursorDirection = 'forward',
    tableName,
    action,
    userId,
  } = options;

  const fetchLimit = limit + 1;

  let query = supabase
    .from('audit_logs')
    .select('id, table_name, action, record_id, old_data, new_data, user_id, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(fetchLimit);

  if (tableName) {
    query = query.eq('table_name', tableName);
  }

  if (action) {
    query = query.eq('action', action);
  }

  if (userId) {
    query = query.eq('user_id', userId);
  }

  if (cursor) {
    if (cursorDirection === 'forward') {
      query = query.lt('created_at', cursor);
    }
  }

  const { data, error } = await query;

  if (error) throw error;

  const items = data || [];
  const hasMore = items.length > limit;
  const resultItems = hasMore ? items.slice(0, limit) : items;

  const firstItem = resultItems[0];
  const lastItem = resultItems[resultItems.length - 1];

  return {
    items: resultItems as unknown as Record<string, unknown>[],
    nextCursor: hasMore && lastItem ? String(lastItem.created_at) : null,
    prevCursor: cursor && firstItem ? String(firstItem.created_at) : null,
    hasNextPage: hasMore,
    hasPrevPage: !!cursor,
  };
}

/**
 * React hook state for cursor pagination
 */
export function createCursorPaginationState<T>() {
  return {
    items: [] as T[],
    cursor: null as string | null,
    hasNextPage: false,
    hasPrevPage: false,
    isLoading: false,
    error: null as Error | null,
  };
}
