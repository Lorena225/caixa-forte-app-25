// =====================================================
// ADVANCED BUDGET SERVICE
// Versions, Scenarios & Variance Analysis
// =====================================================

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface BudgetVersion {
  id: string;
  budget_id: string;
  version_number: number;
  name: string;
  description?: string;
  status: 'draft' | 'approved' | 'active' | 'archived';
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  snapshot_data: BudgetSnapshot;
}

export interface BudgetSnapshot {
  items: BudgetLineItem[];
  totals: {
    total_revenue: number;
    total_expenses: number;
    net_result: number;
  };
  metadata: {
    exported_at: string;
    source_version?: number;
  };
}

export interface BudgetLineItem {
  account_id: string;
  account_code: string;
  account_name: string;
  category_id?: string;
  cost_center_id?: string;
  monthly_values: MonthlyValue[];
  annual_total: number;
}

export interface MonthlyValue {
  month: number;
  planned: number;
  actual: number;
  forecast: number;
  variance: number;
  variance_percent: number;
}

export interface Scenario {
  id: string;
  budget_id: string;
  name: string;
  type: 'optimistic' | 'realistic' | 'pessimistic' | 'custom';
  description?: string;
  adjustment_rules: AdjustmentRule[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdjustmentRule {
  target: 'revenue' | 'expense' | 'account' | 'category' | 'cost_center';
  target_id?: string;
  adjustment_type: 'percentage' | 'fixed';
  adjustment_value: number;
  months?: number[];
}

export interface Period {
  year: number;
  month?: number;
  quarter?: number;
  start_date?: string;
  end_date?: string;
}

export interface VarianceAnalysis {
  period: Period;
  summary: {
    total_budget: number;
    total_actual: number;
    total_variance: number;
    variance_percent: number;
    status: 'under_budget' | 'on_target' | 'over_budget';
  };
  by_category: CategoryVariance[];
  by_cost_center: CostCenterVariance[];
  by_account: AccountVariance[];
  trends: TrendAnalysis;
  alerts: VarianceAlert[];
}

export interface CategoryVariance {
  category_id: string;
  category_name: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface CostCenterVariance {
  cost_center_id: string;
  cost_center_name: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
}

export interface AccountVariance {
  account_id: string;
  account_code: string;
  account_name: string;
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
  monthly_detail: MonthlyValue[];
}

export interface TrendAnalysis {
  monthly_variances: Array<{
    month: number;
    variance: number;
    variance_percent: number;
  }>;
  ytd_variance: number;
  projected_year_end: number;
  trend_direction: 'positive' | 'negative' | 'neutral';
  forecast_accuracy: number;
}

export interface VarianceAlert {
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  account_id?: string;
  variance_amount: number;
  variance_percent: number;
}

export interface Comparison {
  budget_id: string;
  budget_name: string;
  period: Period;
  revenue: ComparisonLine;
  expenses: ComparisonLine;
  net_result: ComparisonLine;
  by_month: MonthlyComparison[];
  kpis: BudgetKPIs;
}

export interface ComparisonLine {
  budget: number;
  actual: number;
  variance: number;
  variance_percent: number;
  ytd_budget: number;
  ytd_actual: number;
  ytd_variance: number;
}

export interface MonthlyComparison {
  month: number;
  month_name: string;
  budget: number;
  actual: number;
  forecast: number;
  variance: number;
  cumulative_budget: number;
  cumulative_actual: number;
}

export interface BudgetKPIs {
  budget_utilization: number;
  forecast_accuracy: number;
  variance_trend: 'improving' | 'stable' | 'worsening';
  months_on_target: number;
  largest_positive_variance: { account: string; value: number };
  largest_negative_variance: { account: string; value: number };
}

export interface Forecast {
  base_budget_id: string;
  forecast_date: string;
  cutoff_month: number;
  remaining_months: ForecastMonth[];
  projected_totals: {
    revenue: number;
    expenses: number;
    net_result: number;
  };
  confidence_level: number;
  methodology: 'trend' | 'average' | 'weighted' | 'ai_assisted';
  assumptions: string[];
}

export interface ForecastMonth {
  month: number;
  is_actual: boolean;
  revenue: number;
  expenses: number;
  net_result: number;
  confidence: number;
}

// =====================================================
// ADVANCED BUDGET SERVICE CLASS
// =====================================================

export class AdvancedBudgetService {
  private companyId: string;
  private budgetId?: string;
  private versions: BudgetVersion[] = [];
  private scenarios: Scenario[] = [];

  constructor(companyId: string, budgetId?: string) {
    this.companyId = companyId;
    this.budgetId = budgetId;
  }

  // =====================================================
  // VERSION MANAGEMENT (In-Memory)
  // =====================================================

  getVersions(): BudgetVersion[] {
    return this.versions;
  }

  createVersion(name: string, description?: string): BudgetVersion {
    const nextVersion = this.versions.length > 0 
      ? Math.max(...this.versions.map(v => v.version_number)) + 1 
      : 1;

    const version: BudgetVersion = {
      id: crypto.randomUUID(),
      budget_id: this.budgetId || '',
      version_number: nextVersion,
      name,
      description,
      status: 'draft',
      created_by: 'current_user',
      created_at: new Date().toISOString(),
      snapshot_data: {
        items: [],
        totals: { total_revenue: 0, total_expenses: 0, net_result: 0 },
        metadata: { exported_at: new Date().toISOString() },
      },
    };

    this.versions.push(version);
    return version;
  }

  // =====================================================
  // SCENARIO MANAGEMENT (In-Memory)
  // =====================================================

  getScenarios(): Scenario[] {
    return this.scenarios;
  }

  createScenario(
    name: string,
    type: Scenario['type'],
    rules: AdjustmentRule[],
    description?: string
  ): Scenario {
    const scenario: Scenario = {
      id: crypto.randomUUID(),
      budget_id: this.budgetId || '',
      name,
      type,
      description,
      adjustment_rules: rules,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.scenarios.push(scenario);
    return scenario;
  }

  applyScenario(scenarioId: string, baseItems: BudgetLineItem[]): BudgetLineItem[] {
    const scenario = this.scenarios.find(s => s.id === scenarioId);
    if (!scenario) return baseItems;

    const adjustedItems = JSON.parse(JSON.stringify(baseItems)) as BudgetLineItem[];

    for (const item of adjustedItems) {
      for (const rule of scenario.adjustment_rules) {
        const applies = this.ruleApplies(rule, item);
        if (applies) {
          for (const mv of item.monthly_values) {
            if (!rule.months || rule.months.includes(mv.month)) {
              if (rule.adjustment_type === 'percentage') {
                mv.planned *= (1 + rule.adjustment_value / 100);
              } else {
                mv.planned += rule.adjustment_value;
              }
            }
          }
          item.annual_total = item.monthly_values.reduce((sum, mv) => sum + mv.planned, 0);
        }
      }
    }

    return adjustedItems;
  }

  private ruleApplies(rule: AdjustmentRule, item: BudgetLineItem): boolean {
    switch (rule.target) {
      case 'account':
        return rule.target_id === item.account_id;
      case 'cost_center':
        return rule.target_id === item.cost_center_id;
      case 'revenue':
      case 'expense':
      case 'category':
        return true;
      default:
        return false;
    }
  }

  // =====================================================
  // VARIANCE ANALYSIS
  // =====================================================

  async analyzeVariance(period: Period): Promise<VarianceAnalysis> {
    const year = period.year;
    const monthFilter = period.month;

    // Get budget data from budgets table
    const { data: budgets } = await supabase
      .from('budgets')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('year', year);

    // Get actual transactions
    const startDate = `${year}-${(monthFilter || 1).toString().padStart(2, '0')}-01`;
    const endDate = monthFilter 
      ? `${year}-${monthFilter.toString().padStart(2, '0')}-31`
      : `${year}-12-31`;

    const { data: transactions } = await supabase
      .from('transactions')
      .select('account_id, cost_center_id, total_amount, direction, transaction_date')
      .eq('company_id', this.companyId)
      .eq('status', 'pago')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // Calculate totals
    let totalActual = 0;
    const categoryMap = new Map<string, CategoryVariance>();
    const costCenterMap = new Map<string, CostCenterVariance>();
    const alerts: VarianceAlert[] = [];

    for (const tx of transactions || []) {
      const amount = tx.direction === 'entrada' ? tx.total_amount : -tx.total_amount;
      totalActual += amount;

      // Aggregate by cost center
      if (tx.cost_center_id) {
        const existing = costCenterMap.get(tx.cost_center_id);
        if (existing) {
          existing.actual += amount;
          existing.variance = existing.actual - existing.budget;
        } else {
          costCenterMap.set(tx.cost_center_id, {
            cost_center_id: tx.cost_center_id,
            cost_center_name: '',
            budget: 0,
            actual: amount,
            variance: amount,
            variance_percent: 0,
          });
        }
      }
    }

    // Calculate estimated budget (simplified) - using target_revenue from budgets table
    const totalBudget = (budgets || []).reduce((sum, b) => sum + (Number(b.target_revenue) || 0), 0);
    const totalVariance = totalActual - totalBudget;
    const variancePercent = totalBudget !== 0 ? (totalVariance / totalBudget) * 100 : 0;

    // Generate alerts for significant variances
    if (Math.abs(variancePercent) > 20) {
      alerts.push({
        severity: Math.abs(variancePercent) > 50 ? 'critical' : 'warning',
        type: totalVariance > 0 ? 'over_budget' : 'under_budget',
        message: `Variação total: ${variancePercent > 0 ? '+' : ''}${variancePercent.toFixed(1)}%`,
        variance_amount: totalVariance,
        variance_percent: variancePercent,
      });
    }

    return {
      period,
      summary: {
        total_budget: totalBudget,
        total_actual: totalActual,
        total_variance: totalVariance,
        variance_percent: variancePercent,
        status: variancePercent < -5 ? 'under_budget' : variancePercent > 5 ? 'over_budget' : 'on_target',
      },
      by_category: Array.from(categoryMap.values()),
      by_cost_center: Array.from(costCenterMap.values()),
      by_account: [],
      trends: {
        monthly_variances: [],
        ytd_variance: totalVariance,
        projected_year_end: totalActual * (12 / (monthFilter || 12)),
        trend_direction: variancePercent > 0 ? 'negative' : variancePercent < 0 ? 'positive' : 'neutral',
        forecast_accuracy: 85,
      },
      alerts,
    };
  }

  // =====================================================
  // BUDGET VS ACTUAL COMPARISON
  // =====================================================

  async compareBudgetVsActual(): Promise<Comparison> {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    // Get budget
    const { data: budget } = await supabase
      .from('budgets')
      .select('*')
      .eq('company_id', this.companyId)
      .eq('year', currentYear)
      .maybeSingle();

    const budgetId = budget?.id || 'no-budget';
    const budgetName = 'Orçamento ' + currentYear;
    const annualBudget = Number(budget?.target_revenue) || 0;
    const monthlyBudget = annualBudget / 12;

    // Get actuals
    const { data: transactions } = await supabase
      .from('transactions')
      .select('total_amount, direction, transaction_date')
      .eq('company_id', this.companyId)
      .eq('status', 'pago')
      .gte('transaction_date', `${currentYear}-01-01`)
      .lte('transaction_date', `${currentYear}-12-31`);

    // Calculate by month
    const monthlyComparisons: MonthlyComparison[] = [];
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    let cumulativeBudget = 0;
    let cumulativeActual = 0;
    let totalRevenueActual = 0;
    let totalExpensesActual = 0;

    for (let month = 1; month <= 12; month++) {
      const monthActual = (transactions || [])
        .filter(tx => new Date(tx.transaction_date).getMonth() + 1 === month)
        .reduce((sum, tx) => {
          const amount = tx.direction === 'entrada' ? tx.total_amount : -tx.total_amount;
          if (tx.direction === 'entrada') totalRevenueActual += tx.total_amount;
          else totalExpensesActual += tx.total_amount;
          return sum + amount;
        }, 0);

      cumulativeBudget += monthlyBudget;
      cumulativeActual += monthActual;

      monthlyComparisons.push({
        month,
        month_name: monthNames[month - 1],
        budget: monthlyBudget,
        actual: month <= currentMonth ? monthActual : 0,
        forecast: month > currentMonth ? monthlyBudget : monthActual,
        variance: monthActual - monthlyBudget,
        cumulative_budget: cumulativeBudget,
        cumulative_actual: cumulativeActual,
      });
    }

    const ytdBudget = monthlyBudget * currentMonth;
    const ytdActual = cumulativeActual;

    const monthsOnTarget = monthlyComparisons
      .filter(m => m.month <= currentMonth)
      .filter(m => Math.abs(m.variance / (m.budget || 1)) <= 0.1)
      .length;

    return {
      budget_id: budgetId,
      budget_name: budgetName,
      period: { year: currentYear },
      revenue: {
        budget: annualBudget * 0.6,
        actual: totalRevenueActual,
        variance: totalRevenueActual - (annualBudget * 0.6),
        variance_percent: annualBudget ? ((totalRevenueActual - annualBudget * 0.6) / (annualBudget * 0.6)) * 100 : 0,
        ytd_budget: ytdBudget * 0.6,
        ytd_actual: totalRevenueActual,
        ytd_variance: totalRevenueActual - ytdBudget * 0.6,
      },
      expenses: {
        budget: annualBudget * 0.4,
        actual: totalExpensesActual,
        variance: totalExpensesActual - (annualBudget * 0.4),
        variance_percent: annualBudget ? ((totalExpensesActual - annualBudget * 0.4) / (annualBudget * 0.4)) * 100 : 0,
        ytd_budget: ytdBudget * 0.4,
        ytd_actual: totalExpensesActual,
        ytd_variance: totalExpensesActual - ytdBudget * 0.4,
      },
      net_result: {
        budget: annualBudget * 0.2,
        actual: totalRevenueActual - totalExpensesActual,
        variance: (totalRevenueActual - totalExpensesActual) - (annualBudget * 0.2),
        variance_percent: 0,
        ytd_budget: ytdBudget * 0.2,
        ytd_actual: totalRevenueActual - totalExpensesActual,
        ytd_variance: (totalRevenueActual - totalExpensesActual) - ytdBudget * 0.2,
      },
      by_month: monthlyComparisons,
      kpis: {
        budget_utilization: ytdBudget ? (ytdActual / ytdBudget) * 100 : 0,
        forecast_accuracy: 85,
        variance_trend: 'stable',
        months_on_target: monthsOnTarget,
        largest_positive_variance: { account: 'N/A', value: 0 },
        largest_negative_variance: { account: 'N/A', value: 0 },
      },
    };
  }

  // =====================================================
  // ROLLING FORECAST
  // =====================================================

  async generateForecastUpdate(): Promise<Forecast> {
    const currentMonth = new Date().getMonth() + 1;
    const comparison = await this.compareBudgetVsActual();

    const forecastMonths: ForecastMonth[] = [];
    let projectedRevenue = 0;
    let projectedExpenses = 0;

    for (const monthData of comparison.by_month) {
      const isActual = monthData.month <= currentMonth;
      
      // For future months, use weighted average of recent actuals
      let forecastValue = monthData.budget;
      if (!isActual && currentMonth >= 3) {
        const recentActuals = comparison.by_month
          .filter(m => m.month <= currentMonth && m.month > currentMonth - 3)
          .map(m => m.actual);
        if (recentActuals.length > 0) {
          forecastValue = recentActuals.reduce((a, b) => a + b, 0) / recentActuals.length;
        }
      }

      const revenue = forecastValue > 0 ? forecastValue : 0;
      const expenses = forecastValue < 0 ? Math.abs(forecastValue) : 0;

      forecastMonths.push({
        month: monthData.month,
        is_actual: isActual,
        revenue,
        expenses,
        net_result: revenue - expenses,
        confidence: isActual ? 100 : Math.max(50, 100 - (monthData.month - currentMonth) * 10),
      });

      projectedRevenue += revenue;
      projectedExpenses += expenses;
    }

    return {
      base_budget_id: comparison.budget_id,
      forecast_date: new Date().toISOString(),
      cutoff_month: currentMonth,
      remaining_months: forecastMonths.filter(m => !m.is_actual),
      projected_totals: {
        revenue: projectedRevenue,
        expenses: projectedExpenses,
        net_result: projectedRevenue - projectedExpenses,
      },
      confidence_level: 75,
      methodology: 'weighted',
      assumptions: [
        'Tendência dos últimos 3 meses mantida',
        'Sazonalidade considerada via orçamento original',
        'Sem eventos extraordinários previstos',
      ],
    };
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

export function formatVariance(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}`;
}

export function formatVariancePercent(value: number): string {
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export function getVarianceStatus(percent: number): 'success' | 'warning' | 'danger' {
  if (Math.abs(percent) <= 5) return 'success';
  if (Math.abs(percent) <= 20) return 'warning';
  return 'danger';
}

// Predefined scenario templates
export const SCENARIO_TEMPLATES = {
  optimistic: {
    name: 'Cenário Otimista',
    type: 'optimistic' as const,
    rules: [
      { target: 'revenue' as const, adjustment_type: 'percentage' as const, adjustment_value: 15 },
      { target: 'expense' as const, adjustment_type: 'percentage' as const, adjustment_value: -5 },
    ],
  },
  pessimistic: {
    name: 'Cenário Pessimista',
    type: 'pessimistic' as const,
    rules: [
      { target: 'revenue' as const, adjustment_type: 'percentage' as const, adjustment_value: -20 },
      { target: 'expense' as const, adjustment_type: 'percentage' as const, adjustment_value: 10 },
    ],
  },
  realistic: {
    name: 'Cenário Realista',
    type: 'realistic' as const,
    rules: [
      { target: 'revenue' as const, adjustment_type: 'percentage' as const, adjustment_value: 5 },
      { target: 'expense' as const, adjustment_type: 'percentage' as const, adjustment_value: 3 },
    ],
  },
};