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
    const { data, error } = await supabase
      .rpc('calculate_credit_score', {
        p_counterparty_id: counterpartyId,
        p_company_id: companyId
      });

    if (error) throw error;
    
    const result = (data as unknown[])?.[0] as Record<string, unknown> | undefined;
    return {
      score: (result?.score as number) || 500,
      rating: (result?.rating as string) || 'BBB',
      risk_level: (result?.risk_level as string) || 'MEDIUM',
      default_probability: (result?.default_probability as number) || 0.05,
      factors: (result?.factors as ScoringFactors) || {} as ScoringFactors
    };
  }

  // Update credit profile with new score
  async updateCreditProfile(counterpartyId: string, companyId: string): Promise<string> {
    const { data, error } = await supabase
      .rpc('update_credit_profile_score', {
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
    search?: string;
  }): Promise<CreditProfile[]> {
    // Use raw SQL query since types aren't generated yet
    let query = `
      SELECT cp.*, 
             c.name as counterparty_name, 
             c.document as counterparty_document, 
             c.email as counterparty_email
      FROM credit_profiles cp
      LEFT JOIN counterparties c ON c.id = cp.counterparty_id
      WHERE cp.company_id = $1
    `;
    const params: unknown[] = [companyId];
    let paramIndex = 2;

    if (filters?.riskLevel) {
      query += ` AND cp.risk_level = $${paramIndex}`;
      params.push(filters.riskLevel);
      paramIndex++;
    }
    if (filters?.rating) {
      query += ` AND cp.credit_rating = $${paramIndex}`;
      params.push(filters.rating);
      paramIndex++;
    }
    if (filters?.collectionStatus) {
      query += ` AND cp.collection_status = $${paramIndex}`;
      params.push(filters.collectionStatus);
    }
    
    query += ` ORDER BY cp.credit_score DESC`;

    const { data, error } = await supabase.rpc('execute_sql', { 
      sql_query: query, 
      params: params 
    }) as { data: unknown; error: unknown };

    // Fallback: directly query without the RPC if it doesn't exist
    if (error) {
      const { data: directData, error: directError } = await supabase
        .from('credit_profiles' as 'counterparties') // Type workaround
        .select('*')
        .eq('company_id', companyId)
        .order('credit_score', { ascending: false });
      
      if (directError) throw directError;
      return (directData || []).map(p => this.mapToProfile(p as Record<string, unknown>));
    }

    return ((data as unknown[]) || []).map(p => this.mapToProfile(p as Record<string, unknown>));
  }

  private mapToProfile(row: Record<string, unknown>): CreditProfile {
    return {
      id: row.id as string,
      company_id: row.company_id as string,
      counterparty_id: row.counterparty_id as string,
      credit_score: row.credit_score as number || 500,
      credit_rating: row.credit_rating as string || 'BBB',
      credit_limit: row.credit_limit as number || 0,
      credit_utilized: row.credit_utilized as number || 0,
      credit_available: row.credit_available as number || 0,
      utilization_rate: row.utilization_rate as number || 0,
      risk_level: row.risk_level as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' || 'MEDIUM',
      default_probability: row.default_probability as number || 0.05,
      expected_loss: row.expected_loss as number || 0,
      scoring_factors: row.scoring_factors as ScoringFactors || {} as ScoringFactors,
      collection_status: row.collection_status as 'ACTIVE' | 'SUSPENDED' | 'BLOCKED' | 'CLOSED' || 'ACTIVE',
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
    const { data, error } = await supabase
      .from('credit_profiles' as 'counterparties')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) throw error;
    return data ? this.mapToProfile(data as Record<string, unknown>) : null;
  }

  // Get score history for a profile
  async getScoreHistory(profileId: string): Promise<ScoreHistoryEntry[]> {
    const { data, error } = await supabase
      .from('credit_score_history' as 'counterparties')
      .select('*')
      .eq('credit_profile_id', profileId)
      .order('score_date', { ascending: false })
      .limit(12);

    if (error) throw error;
    return ((data || []) as Record<string, unknown>[]).map(h => ({
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
  async updateCreditLimit(profileId: string, newLimit: number, reason?: string): Promise<void> {
    const { error } = await supabase
      .from('credit_profiles' as 'counterparties')
      .update({
        credit_limit: newLimit,
        last_limit_review: new Date().toISOString(),
        updated_at: new Date().toISOString()
      } as Record<string, unknown>)
      .eq('id', profileId);

    if (error) throw error;
  }

  // Request credit limit change (for approval workflow)
  async requestLimitChange(
    profileId: string,
    companyId: string,
    currentLimit: number,
    requestedLimit: number,
    reason: string
  ): Promise<string> {
    const { data, error } = await supabase
      .from('credit_limit_requests' as 'counterparties')
      .insert({
        company_id: companyId,
        credit_profile_id: profileId,
        current_limit: currentLimit,
        requested_limit: requestedLimit,
        request_reason: reason
      } as Record<string, unknown>)
      .select('id')
      .single();

    if (error) throw error;
    return (data as Record<string, unknown>).id as string;
  }

  // Approve/reject limit request
  async reviewLimitRequest(
    requestId: string,
    approved: boolean,
    reviewNotes?: string
  ): Promise<void> {
    const { error: updateError } = await supabase
      .from('credit_limit_requests' as 'counterparties')
      .update({
        status: approved ? 'approved' : 'rejected',
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes
      } as Record<string, unknown>)
      .eq('id', requestId);

    if (updateError) throw updateError;

    if (approved) {
      const { data: request } = await supabase
        .from('credit_limit_requests' as 'counterparties')
        .select('credit_profile_id, requested_limit')
        .eq('id', requestId)
        .single();

      const reqData = request as Record<string, unknown> | null;
      if (reqData) {
        await this.updateCreditLimit(
          reqData.credit_profile_id as string, 
          reqData.requested_limit as number
        );
      }
    }
  }

  // Get pending limit requests
  async getPendingLimitRequests(companyId: string): Promise<CreditLimitRequest[]> {
    const { data, error } = await supabase
      .from('credit_limit_requests' as 'counterparties')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ((data || []) as Record<string, unknown>[]).map(r => ({
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
    const { data, error } = await supabase
      .rpc('schedule_collection_actions', {
        p_transaction_id: transactionId,
        p_company_id: companyId
      });

    if (error) throw error;
    return data as number;
  }

  // Get collection actions for a profile
  async getCollectionActions(profileId: string, status?: string): Promise<CollectionAction[]> {
    let query = supabase
      .from('collection_actions' as 'counterparties')
      .select('*')
      .eq('credit_profile_id', profileId)
      .order('scheduled_for', { ascending: true });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return ((data || []) as Record<string, unknown>[]).map(a => ({
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
    const { error } = await supabase
      .from('collection_actions' as 'counterparties')
      .update({
        status: result.success ? 'success' : 'failed',
        executed_at: new Date().toISOString(),
        result_data: result.data || null,
        error_message: result.error || null,
        updated_at: new Date().toISOString()
      } as Record<string, unknown>)
      .eq('id', actionId);

    if (error) throw error;
  }

  // Update portfolio summary
  async updatePortfolioSummary(companyId: string): Promise<void> {
    const { error } = await supabase
      .rpc('update_credit_portfolio_summary', {
        p_company_id: companyId
      });

    if (error) throw error;
  }

  // Get portfolio summary
  async getPortfolioSummary(companyId: string): Promise<PortfolioSummary | null> {
    const { data, error } = await supabase
      .from('credit_portfolio_summary' as 'counterparties')
      .select('*')
      .eq('company_id', companyId)
      .order('summary_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const d = data as Record<string, unknown>;
    return {
      total_customers: d.total_customers as number,
      total_credit_limit: d.total_credit_limit as number,
      total_utilized: d.total_utilized as number,
      average_utilization: d.average_utilization as number,
      customers_low_risk: d.customers_low_risk as number,
      customers_medium_risk: d.customers_medium_risk as number,
      customers_high_risk: d.customers_high_risk as number,
      customers_critical_risk: d.customers_critical_risk as number,
      customers_aaa: d.customers_aaa as number,
      customers_aa: d.customers_aa as number,
      customers_a: d.customers_a as number,
      customers_bbb: d.customers_bbb as number,
      customers_bb: d.customers_bb as number,
      customers_b: d.customers_b as number,
      customers_ccc: d.customers_ccc as number,
      customers_cc: d.customers_cc as number,
      customers_c: d.customers_c as number,
      customers_d: d.customers_d as number,
      total_expected_loss: d.total_expected_loss as number,
      weighted_avg_default_prob: d.weighted_avg_default_prob as number
    };
  }

  // Calculate loss provision
  async calculateLossProvision(companyId: string, periodStart: Date, periodEnd: Date): Promise<string> {
    const { data, error } = await supabase
      .rpc('calculate_loss_provision', {
        p_company_id: companyId,
        p_period_start: periodStart.toISOString().split('T')[0],
        p_period_end: periodEnd.toISOString().split('T')[0]
      });

    if (error) throw error;
    return data as string;
  }

  // Get loss provisions
  async getLossProvisions(companyId: string): Promise<LossProvision[]> {
    const { data, error } = await supabase
      .from('loss_provisions' as 'counterparties')
      .select('*')
      .eq('company_id', companyId)
      .order('provision_date', { ascending: false })
      .limit(12);

    if (error) throw error;
    return ((data || []) as Record<string, unknown>[]).map(p => ({
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
    const { error } = await supabase
      .from('credit_profiles' as 'counterparties')
      .update({
        collection_status: status,
        updated_at: new Date().toISOString()
      } as Record<string, unknown>)
      .eq('id', profileId);

    if (error) throw error;
  }

  // Batch update all scores for a company (daily job)
  async batchUpdateScores(companyId: string): Promise<{ updated: number; errors: number }> {
    const { data: counterparties, error } = await supabase
      .from('transactions')
      .select('counterparty_id')
      .eq('company_id', companyId)
      .eq('direction', 'receivable')
      .not('counterparty_id', 'is', null);

    if (error) throw error;

    const uniqueCounterparties = [...new Set(counterparties?.map(t => t.counterparty_id))];
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
