import { supabase } from '@/integrations/supabase/client';

export interface CreditProfile {
  id: string;
  company_id: string;
  counterparty_id: string;
  credit_score: number;
  credit_rating: string;
  credit_limit: number;
  credit_utilized: number;
  credit_available: number;
  utilization_rate: number;
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  default_probability: number;
  expected_loss: number;
  scoring_factors: ScoringFactors;
  collection_status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CLOSED';
  last_collection_action: string | null;
  last_collection_date: string | null;
  next_collection_date: string | null;
  last_score_update: string;
  last_limit_review: string;
  created_at: string;
  updated_at: string;
  counterparty?: {
    name: string;
    document: string;
    email: string;
  };
}

export interface ScoringFactors {
  payment_history_score: number;
  dso_days: number;
  on_time_payment_rate: number;
  total_invoiced: number;
  total_paid: number;
  days_in_overdue: number;
  years_as_customer: number;
  external_score?: number;
  documents_complete?: boolean;
  revenue_estimate?: number;
  calculated_at: string;
}

export interface ScoreHistoryEntry {
  id: string;
  score_date: string;
  credit_score: number;
  credit_rating: string;
  credit_limit: number;
  risk_level: string;
  change_reason: string;
  scoring_factors: ScoringFactors;
}

export interface CreditLimitRequest {
  id: string;
  credit_profile_id: string;
  current_limit: number;
  requested_limit: number;
  change_percentage: number;
  request_reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  expires_at: string;
}

export interface CollectionAction {
  id: string;
  credit_profile_id: string;
  transaction_id: string | null;
  action_type: string;
  days_overdue: number;
  scheduled_for: string;
  executed_at: string | null;
  status: string;
  result_data: Record<string, unknown> | null;
  error_message: string | null;
}

export interface PortfolioSummary {
  total_customers: number;
  total_credit_limit: number;
  total_utilized: number;
  average_utilization: number;
  customers_low_risk: number;
  customers_medium_risk: number;
  customers_high_risk: number;
  customers_critical_risk: number;
  customers_aaa: number;
  customers_aa: number;
  customers_a: number;
  customers_bbb: number;
  customers_bb: number;
  customers_b: number;
  customers_ccc: number;
  customers_cc: number;
  customers_c: number;
  customers_d: number;
  total_expected_loss: number;
  weighted_avg_default_prob: number;
}

export interface LossProvision {
  id: string;
  provision_date: string;
  period_start: string;
  period_end: string;
  total_exposure: number;
  total_expected_loss: number;
  provision_rate: number;
  provision_amount: number;
  breakdown_by_risk: Record<string, { count: number; exposure: number; expected_loss: number }>;
  breakdown_by_aging: Record<string, number>;
  posted_to_accounting: boolean;
}

// Helper function to execute queries on tables not yet in types
async function executeQuery(table: string, operation: 'select' | 'insert' | 'update' | 'delete', options: {
  select?: string;
  data?: Record<string, unknown>;
  filters?: Record<string, unknown>;
  order?: { column: string; ascending?: boolean };
  limit?: number;
  single?: boolean;
}): Promise<unknown> {
  const client = supabase as unknown as {
    from: (table: string) => {
      select: (columns?: string) => unknown;
      insert: (data: unknown) => unknown;
      update: (data: unknown) => unknown;
      delete: () => unknown;
    };
  };
  
  let query: unknown = client.from(table);
  
  if (operation === 'select') {
    query = (query as { select: (c?: string) => unknown }).select(options.select || '*');
  } else if (operation === 'insert' && options.data) {
    query = (query as { insert: (d: unknown) => { select: (c?: string) => { single: () => unknown } } }).insert(options.data).select().single();
  } else if (operation === 'update' && options.data) {
    query = (query as { update: (d: unknown) => unknown }).update(options.data);
  }
  
  // Apply filters
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      query = (query as { eq: (k: string, v: unknown) => unknown }).eq(key, value);
    }
  }
  
  // Apply ordering
  if (options.order) {
    query = (query as { order: (c: string, o: { ascending: boolean }) => unknown }).order(options.order.column, { ascending: options.order.ascending ?? true });
  }
  
  // Apply limit
  if (options.limit) {
    query = (query as { limit: (n: number) => unknown }).limit(options.limit);
  }
  
  // Single result
  if (options.single) {
    query = (query as { maybeSingle: () => unknown }).maybeSingle();
  }
  
  const result = await (query as Promise<{ data: unknown; error: unknown }>);
  if ((result as { error?: unknown }).error) {
    throw (result as { error: Error }).error;
  }
  return (result as { data: unknown }).data;
}

class CreditScoringService {
  private static instance: CreditScoringService;

  private constructor() {}

  static getInstance(): CreditScoringService {
    if (!CreditScoringService.instance) {
      CreditScoringService.instance = new CreditScoringService();
    }
    return CreditScoringService.instance;
  }

  // Calculate credit score for a counterparty
  async calculateScore(counterpartyId: string, companyId: string): Promise<{
    score: number;
    rating: string;
    risk_level: string;
    default_probability: number;
    factors: ScoringFactors;
  }> {
    const { data, error } = await supabase.rpc('calculate_credit_score', {
      p_counterparty_id: counterpartyId,
      p_company_id: companyId
    });

    if (error) throw error;
    
    const results = data as unknown as Array<{
      score: number;
      rating: string;
      risk_level: string;
      default_probability: number;
      factors: ScoringFactors;
    }>;
    
    const result = results?.[0];
    return {
      score: result?.score || 500,
      rating: result?.rating || 'BBB',
      risk_level: result?.risk_level || 'MEDIUM',
      default_probability: result?.default_probability || 0.05,
      factors: result?.factors || {} as ScoringFactors
    };
  }

  // Update credit profile with new score
  async updateCreditProfile(counterpartyId: string, companyId: string): Promise<string> {
    const { data, error } = await supabase.rpc('update_credit_profile_score', {
      p_counterparty_id: counterpartyId,
      p_company_id: companyId
    });

    if (error) throw error;
    return data as string;
  }

  // Get credit profiles with filtering
  async getCreditProfiles(companyId: string, filters?: {
    riskLevel?: string;
    rating?: string;
    collectionStatus?: string;
  }): Promise<CreditProfile[]> {
    const data = await executeQuery('credit_profiles', 'select', {
      select: '*',
      filters: { company_id: companyId },
      order: { column: 'credit_score', ascending: false }
    }) as Array<Record<string, unknown>>;
    
    let filtered = data || [];
    if (filters?.riskLevel) {
      filtered = filtered.filter(r => r.risk_level === filters.riskLevel);
    }
    if (filters?.rating) {
      filtered = filtered.filter(r => r.credit_rating === filters.rating);
    }
    
    return filtered.map(row => this.mapToProfile(row));
  }

  private mapToProfile(row: Record<string, unknown>): CreditProfile {
    return {
      id: row.id as string,
      company_id: row.company_id as string,
      counterparty_id: row.counterparty_id as string,
      credit_score: (row.credit_score as number) || 500,
      credit_rating: (row.credit_rating as string) || 'BBB',
      credit_limit: (row.credit_limit as number) || 0,
      credit_utilized: (row.credit_utilized as number) || 0,
      credit_available: (row.credit_available as number) || 0,
      utilization_rate: (row.utilization_rate as number) || 0,
      risk_level: (row.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') || 'MEDIUM',
      default_probability: (row.default_probability as number) || 0.05,
      expected_loss: (row.expected_loss as number) || 0,
      scoring_factors: (row.scoring_factors as ScoringFactors) || {} as ScoringFactors,
      collection_status: (row.collection_status as 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CLOSED') || 'ACTIVE',
      last_collection_action: row.last_collection_action as string | null,
      last_collection_date: row.last_collection_date as string | null,
      next_collection_date: row.next_collection_date as string | null,
      last_score_update: row.last_score_update as string,
      last_limit_review: row.last_limit_review as string,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      counterparty: row.counterparty_name ? {
        name: row.counterparty_name as string,
        document: row.counterparty_document as string,
        email: row.counterparty_email as string
      } : undefined
    };
  }

  // Get single credit profile
  async getCreditProfile(profileId: string): Promise<CreditProfile | null> {
    const data = await executeQuery('credit_profiles', 'select', {
      filters: { id: profileId },
      single: true
    }) as Record<string, unknown> | null;

    return data ? this.mapToProfile(data) : null;
  }

  // Get score history for a profile
  async getScoreHistory(profileId: string): Promise<ScoreHistoryEntry[]> {
    const data = await executeQuery('credit_score_history', 'select', {
      filters: { credit_profile_id: profileId },
      order: { column: 'score_date', ascending: false },
      limit: 12
    }) as Array<Record<string, unknown>>;
    
    return (data || []).map(h => ({
      id: h.id as string,
      score_date: h.score_date as string,
      credit_score: h.credit_score as number,
      credit_rating: h.credit_rating as string,
      credit_limit: h.credit_limit as number,
      risk_level: h.risk_level as string,
      change_reason: h.change_reason as string,
      scoring_factors: h.scoring_factors as ScoringFactors
    }));
  }

  // Update credit limit manually
  async updateCreditLimit(profileId: string, newLimit: number): Promise<void> {
    await executeQuery('credit_profiles', 'update', {
      data: {
        credit_limit: newLimit,
        last_limit_review: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      filters: { id: profileId }
    });
  }

  // Request credit limit change (for approval workflow)
  async requestLimitChange(
    profileId: string,
    companyId: string,
    currentLimit: number,
    requestedLimit: number,
    reason: string
  ): Promise<string> {
    const data = await executeQuery('credit_limit_requests', 'insert', {
      data: {
        company_id: companyId,
        credit_profile_id: profileId,
        current_limit: currentLimit,
        requested_limit: requestedLimit,
        request_reason: reason
      }
    }) as Record<string, unknown>;

    return data.id as string;
  }

  // Approve/reject limit request
  async reviewLimitRequest(
    requestId: string,
    approved: boolean,
    reviewNotes?: string
  ): Promise<void> {
    await executeQuery('credit_limit_requests', 'update', {
      data: {
        status: approved ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      },
      filters: { id: requestId }
    });

    if (approved) {
      const request = await executeQuery('credit_limit_requests', 'select', {
        filters: { id: requestId },
        single: true
      }) as Record<string, unknown> | null;

      if (request) {
        await this.updateCreditLimit(
          request.credit_profile_id as string, 
          request.requested_limit as number
        );
      }
    }
  }

  // Get pending limit requests
  async getPendingLimitRequests(companyId: string): Promise<CreditLimitRequest[]> {
    const data = await executeQuery('credit_limit_requests', 'select', {
      filters: { company_id: companyId, status: 'pending' },
      order: { column: 'created_at', ascending: false }
    }) as Array<Record<string, unknown>>;
    
    return (data || []).map(r => ({
      id: r.id as string,
      credit_profile_id: r.credit_profile_id as string,
      current_limit: r.current_limit as number,
      requested_limit: r.requested_limit as number,
      change_percentage: r.change_percentage as number,
      request_reason: r.request_reason as string,
      status: r.status as 'pending' | 'approved' | 'rejected' | 'expired',
      reviewed_by: r.reviewed_by as string | null,
      reviewed_at: r.reviewed_at as string | null,
      review_notes: r.review_notes as string | null,
      created_at: r.created_at as string,
      expires_at: r.expires_at as string
    }));
  }

  // Schedule collection actions for a transaction
  async scheduleCollectionActions(transactionId: string, companyId: string): Promise<number> {
    const { data, error } = await supabase.rpc('schedule_collection_actions', {
      p_transaction_id: transactionId,
      p_company_id: companyId
    });

    if (error) throw error;
    return data as number;
  }

  // Get collection actions for a profile
  async getCollectionActions(profileId: string, status?: string): Promise<CollectionAction[]> {
    const filters: Record<string, unknown> = { credit_profile_id: profileId };
    if (status) filters.status = status;
    
    const data = await executeQuery('collection_actions', 'select', {
      filters,
      order: { column: 'scheduled_for', ascending: true }
    }) as Array<Record<string, unknown>>;
    
    return (data || []).map(a => ({
      id: a.id as string,
      credit_profile_id: a.credit_profile_id as string,
      transaction_id: a.transaction_id as string | null,
      action_type: a.action_type as string,
      days_overdue: a.days_overdue as number,
      scheduled_for: a.scheduled_for as string,
      executed_at: a.executed_at as string | null,
      status: a.status as string,
      result_data: a.result_data as Record<string, unknown> | null,
      error_message: a.error_message as string | null
    }));
  }

  // Execute a collection action
  async executeCollectionAction(actionId: string, result: { success: boolean; data?: Record<string, unknown>; error?: string }): Promise<void> {
    await executeQuery('collection_actions', 'update', {
      data: {
        status: result.success ? 'success' : 'failed',
        executed_at: new Date().toISOString(),
        result_data: result.data || null,
        error_message: result.error || null,
        updated_at: new Date().toISOString()
      },
      filters: { id: actionId }
    });
  }

  // Update portfolio summary
  async updatePortfolioSummary(companyId: string): Promise<void> {
    const { error } = await supabase.rpc('update_credit_portfolio_summary', {
      p_company_id: companyId
    });

    if (error) throw error;
  }

  // Get portfolio summary
  async getPortfolioSummary(companyId: string): Promise<PortfolioSummary | null> {
    const data = await executeQuery('credit_portfolio_summary', 'select', {
      filters: { company_id: companyId },
      order: { column: 'summary_date', ascending: false },
      limit: 1,
      single: true
    }) as Record<string, unknown> | null;

    if (!data) return null;

    return {
      total_customers: (data.total_customers as number) || 0,
      total_credit_limit: (data.total_credit_limit as number) || 0,
      total_utilized: (data.total_utilized as number) || 0,
      average_utilization: (data.average_utilization as number) || 0,
      customers_low_risk: (data.customers_low_risk as number) || 0,
      customers_medium_risk: (data.customers_medium_risk as number) || 0,
      customers_high_risk: (data.customers_high_risk as number) || 0,
      customers_critical_risk: (data.customers_critical_risk as number) || 0,
      customers_aaa: (data.customers_aaa as number) || 0,
      customers_aa: (data.customers_aa as number) || 0,
      customers_a: (data.customers_a as number) || 0,
      customers_bbb: (data.customers_bbb as number) || 0,
      customers_bb: (data.customers_bb as number) || 0,
      customers_b: (data.customers_b as number) || 0,
      customers_ccc: (data.customers_ccc as number) || 0,
      customers_cc: (data.customers_cc as number) || 0,
      customers_c: (data.customers_c as number) || 0,
      customers_d: (data.customers_d as number) || 0,
      total_expected_loss: (data.total_expected_loss as number) || 0,
      weighted_avg_default_prob: (data.weighted_avg_default_prob as number) || 0
    };
  }

  // Calculate loss provision
  async calculateLossProvision(companyId: string, periodStart: Date, periodEnd: Date): Promise<string> {
    const { data, error } = await supabase.rpc('calculate_loss_provision', {
      p_company_id: companyId,
      p_period_start: periodStart.toISOString().split('T')[0],
      p_period_end: periodEnd.toISOString().split('T')[0]
    });

    if (error) throw error;
    return data as string;
  }

  // Get loss provisions
  async getLossProvisions(companyId: string): Promise<LossProvision[]> {
    const data = await executeQuery('loss_provisions', 'select', {
      filters: { company_id: companyId },
      order: { column: 'provision_date', ascending: false },
      limit: 12
    }) as Array<Record<string, unknown>>;
    
    return (data || []).map(p => ({
      id: p.id as string,
      provision_date: p.provision_date as string,
      period_start: p.period_start as string,
      period_end: p.period_end as string,
      total_exposure: p.total_exposure as number,
      total_expected_loss: p.total_expected_loss as number,
      provision_rate: p.provision_rate as number,
      provision_amount: p.provision_amount as number,
      breakdown_by_risk: p.breakdown_by_risk as Record<string, { count: number; exposure: number; expected_loss: number }>,
      breakdown_by_aging: p.breakdown_by_aging as Record<string, number>,
      posted_to_accounting: p.posted_to_accounting as boolean
    }));
  }

  // Update collection status
  async updateCollectionStatus(profileId: string, status: 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CLOSED'): Promise<void> {
    await executeQuery('credit_profiles', 'update', {
      data: {
        collection_status: status,
        updated_at: new Date().toISOString()
      },
      filters: { id: profileId }
    });
  }

  // Batch update all scores for a company (daily job)
  async batchUpdateScores(companyId: string): Promise<{ updated: number; errors: number }> {
    const { data: counterparties, error } = await supabase
      .from('transactions')
      .select('counterparty_id')
      .eq('company_id', companyId)
      .not('counterparty_id', 'is', null);

    if (error) throw error;

    const uniqueCounterparties = [...new Set(counterparties?.map(t => t.counterparty_id).filter(Boolean))];
    let updated = 0;
    let errors = 0;

    for (const counterpartyId of uniqueCounterparties) {
      try {
        await this.updateCreditProfile(counterpartyId!, companyId);
        updated++;
      } catch {
        errors++;
      }
    }

    await this.updatePortfolioSummary(companyId);

    return { updated, errors };
  }

  // Get rating color for display
  getRatingColor(rating: string): string {
    const colors: Record<string, string> = {
      'AAA': 'bg-emerald-500',
      'AA': 'bg-emerald-400',
      'A': 'bg-green-500',
      'BBB': 'bg-lime-500',
      'BB': 'bg-yellow-500',
      'B': 'bg-orange-400',
      'CCC': 'bg-orange-500',
      'CC': 'bg-red-400',
      'C': 'bg-red-500',
      'D': 'bg-red-700'
    };
    return colors[rating] || 'bg-muted';
  }

  // Get risk level color
  getRiskColor(riskLevel: string): string {
    const colors: Record<string, string> = {
      'LOW': 'text-green-600 bg-green-100 dark:bg-green-900/30',
      'MEDIUM': 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
      'HIGH': 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
      'CRITICAL': 'text-red-600 bg-red-100 dark:bg-red-900/30'
    };
    return colors[riskLevel] || 'text-muted-foreground bg-muted';
  }
}

export const creditScoringService = CreditScoringService.getInstance();
