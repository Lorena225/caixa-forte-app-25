import { supabase } from "@/integrations/supabase/client";
import { addDays, differenceInDays, isSameDay, format, subDays, getDay, getDate, getMonth } from "date-fns";

// ==================== INTERFACES ====================

export interface CashFlowForecast {
  companyId: string;
  forecastDate: Date;
  forecastPeriodDays: number;
  scenarios: ForecastScenario[];
  keyMetrics: CashFlowMetrics;
  alerts: CashFlowAlert[];
  confidence: number;
  lastUpdated: Date;
}

export interface ForecastScenario {
  name: 'PESSIMIST' | 'REALISTIC' | 'OPTIMIST' | 'CUSTOM';
  probability: number;
  adjustmentFactors: AdjustmentFactors;
  dailyProjection: CashFlowDay[];
  summary: ScenarioSummary;
}

export interface AdjustmentFactors {
  delayPaymentReceivables: number;
  delayPaymentPayables: number;
  discountRate: number;
  churnRate: number;
  seasonalityFactor: number;
  economicFactor: number;
}

export interface ScenarioSummary {
  initialBalance: number;
  totalInflows: number;
  totalOutflows: number;
  finalBalance: number;
  minBalance: number;
  maxBalance: number;
  averageBalance: number;
}

export interface CashFlowDay {
  date: Date;
  openingBalance: number;
  inflows: Inflow[];
  outflows: Outflow[];
  netFlow: number;
  closingBalance: number;
  alerts: DayAlert[];
}

export interface Inflow {
  description: string;
  amount: number;
  source: 'RECEIVABLE' | 'SALE' | 'LOAN' | 'INVESTMENT' | 'OTHER';
  confidence: number;
}

export interface Outflow {
  description: string;
  amount: number;
  category: 'PAYABLE' | 'EXPENSE' | 'LOAN_PAYMENT' | 'TAX' | 'DIVIDEND' | 'OTHER';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  confidence: number;
}

export interface DayAlert {
  type: 'LIQUIDITY_WARNING' | 'OVERDRAFT_RISK' | 'OPPORTUNITY' | 'ANOMALY';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
}

export interface CashFlowMetrics {
  projectedCashDeficit: number;
  riskDays: Date[];
  averageDailyBalance: number;
  volatilityIndex: number;
  liquidityRatio: number;
  coverageRatio: number;
  seasonalityPattern: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface CashFlowAlert {
  date: Date;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  suggestedAction: string;
  affectedScenarios: string[];
}

interface HistoricalCashFlow {
  date: Date;
  inflows: number;
  outflows: number;
  balance: number;
}

interface SeasonalityPattern {
  monthlyFactors: number[];
  weekdayFactors: number[];
  dayOfMonthFactors: Map<number, number>;
  pattern: 'HIGH' | 'MODERATE' | 'LOW';
}

interface Receivable {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  customerId?: string;
  paymentReliability: number;
}

interface Payable {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  supplierId?: string;
  isCritical: boolean;
  earlyPaymentDiscount?: number;
}

interface ScheduledTransaction {
  id: string;
  date: Date;
  description: string;
  amount: number;
  category: Outflow['category'];
  priority: Outflow['priority'];
}

// ==================== SERVICE CLASS ====================

export class CashFlowPredictionService {
  private historicalData: HistoricalCashFlow[] = [];
  private seasonalityCache: Map<string, SeasonalityPattern> = new Map();
  private companyId: string = '';

  // ==================== INITIALIZATION ====================

  async initialize(companyId: string): Promise<void> {
    this.companyId = companyId;
    this.historicalData = await this.getHistoricalCashFlow(companyId, 730);
    this.seasonalityCache.set(companyId, this.analyzeSeasonality(this.historicalData));
  }

  // ==================== HISTORICAL DATA ====================

  private async getHistoricalCashFlow(companyId: string, days: number): Promise<HistoricalCashFlow[]> {
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .gte('due_date', startDate)
      .order('due_date', { ascending: true });

    if (!transactions) return [];

    const dailyMap = new Map<string, { inflows: number; outflows: number }>();

    for (const tx of transactions) {
      const dateKey = tx.due_date?.split('T')[0] || '';
      if (!dateKey) continue;

      const existing = dailyMap.get(dateKey) || { inflows: 0, outflows: 0 };
      const amount = Number(tx.total_amount) || 0;

      if (tx.direction === 'entrada') {
        existing.inflows += amount;
      } else {
        existing.outflows += amount;
      }
      dailyMap.set(dateKey, existing);
    }

    let runningBalance = 0;
    const result: HistoricalCashFlow[] = [];

    const sortedDates = Array.from(dailyMap.keys()).sort();
    for (const dateKey of sortedDates) {
      const data = dailyMap.get(dateKey)!;
      runningBalance += data.inflows - data.outflows;
      result.push({
        date: new Date(dateKey),
        inflows: data.inflows,
        outflows: data.outflows,
        balance: runningBalance
      });
    }

    return result;
  }

  // ==================== SEASONALITY ANALYSIS ====================

  private analyzeSeasonality(historicalData: HistoricalCashFlow[]): SeasonalityPattern {
    const monthlyTotals: number[] = Array(12).fill(0);
    const monthlyCounts: number[] = Array(12).fill(0);
    const weekdayTotals: number[] = Array(7).fill(0);
    const weekdayCounts: number[] = Array(7).fill(0);
    const dayOfMonthMap = new Map<number, { total: number; count: number }>();

    for (const entry of historicalData) {
      const month = getMonth(entry.date);
      const weekday = getDay(entry.date);
      const dayOfMonth = getDate(entry.date);
      const netFlow = entry.inflows - entry.outflows;

      monthlyTotals[month] += netFlow;
      monthlyCounts[month]++;

      weekdayTotals[weekday] += netFlow;
      weekdayCounts[weekday]++;

      const domData = dayOfMonthMap.get(dayOfMonth) || { total: 0, count: 0 };
      domData.total += netFlow;
      domData.count++;
      dayOfMonthMap.set(dayOfMonth, domData);
    }

    const overallAverage = historicalData.length > 0
      ? historicalData.reduce((sum, d) => sum + (d.inflows - d.outflows), 0) / historicalData.length
      : 0;

    const monthlyFactors = monthlyTotals.map((total, i) => 
      monthlyCounts[i] > 0 ? (total / monthlyCounts[i]) / (overallAverage || 1) : 1
    );

    const weekdayFactors = weekdayTotals.map((total, i) => 
      weekdayCounts[i] > 0 ? (total / weekdayCounts[i]) / (overallAverage || 1) : 1
    );

    const dayOfMonthFactors = new Map<number, number>();
    dayOfMonthMap.forEach((data, day) => {
      dayOfMonthFactors.set(day, data.count > 0 ? (data.total / data.count) / (overallAverage || 1) : 1);
    });

    // Calculate volatility to determine pattern
    const variance = historicalData.reduce((sum, d) => {
      const netFlow = d.inflows - d.outflows;
      return sum + Math.pow(netFlow - overallAverage, 2);
    }, 0) / (historicalData.length || 1);
    
    const volatility = Math.sqrt(variance) / (Math.abs(overallAverage) || 1);
    
    let pattern: 'HIGH' | 'MODERATE' | 'LOW';
    if (volatility > 0.5) pattern = 'HIGH';
    else if (volatility > 0.2) pattern = 'MODERATE';
    else pattern = 'LOW';

    return { monthlyFactors, weekdayFactors, dayOfMonthFactors, pattern };
  }

  // ==================== CURRENT BALANCE ====================

  private async getCurrentBalance(companyId: string): Promise<number> {
    const { data: wallets } = await supabase
      .from('wallets')
      .select('opening_balance')
      .eq('company_id', companyId)
      .eq('is_active', true);

    if (!wallets) return 0;
    return wallets.reduce((sum, w) => sum + (Number(w.opening_balance) || 0), 0);
  }

  // ==================== PROJECTED RECEIVABLES ====================

  private async getProjectedReceivables(companyId: string, endDate: Date): Promise<Receivable[]> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('direction', 'entrada')
      .in('status', ['lancado', 'rascunho'])
      .lte('due_date', format(endDate, 'yyyy-MM-dd'));

    if (!transactions) return [];

    return transactions.map(tx => ({
      id: tx.id,
      description: tx.description || 'Recebível',
      amount: Number(tx.total_amount) || 0,
      dueDate: new Date(tx.due_date || new Date()),
      customerId: tx.counterparty_id || undefined,
      paymentReliability: 0.85 // Default reliability, could be calculated from history
    }));
  }

  // ==================== PROJECTED PAYABLES ====================

  private async getProjectedPayables(companyId: string, endDate: Date): Promise<Payable[]> {
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('company_id', companyId)
      .eq('direction', 'saida')
      .in('status', ['lancado', 'rascunho'])
      .lte('due_date', format(endDate, 'yyyy-MM-dd'));

    if (!transactions) return [];

    return transactions.map(tx => ({
      id: tx.id,
      description: tx.description || 'Pagável',
      amount: Number(tx.total_amount) || 0,
      dueDate: new Date(tx.due_date || new Date()),
      supplierId: tx.counterparty_id || undefined,
      isCritical: false,
      earlyPaymentDiscount: 0
    }));
  }

  // ==================== SCHEDULED TRANSACTIONS ====================

  private async getScheduledTransactions(companyId: string, endDate: Date): Promise<ScheduledTransaction[]> {
    // Get recurring transactions from transactions table with recurrence pattern
    const { data: recurringTx } = await supabase
      .from('transactions')
      .select('id, description, total_amount, due_date, recurrence_pattern')
      .eq('company_id', companyId)
      .eq('direction', 'saida')
      .not('recurrence_pattern', 'is', null);

    if (!recurringTx) return [];

    const scheduled: ScheduledTransaction[] = [];
    const today = new Date();

    for (const tx of recurringTx as any[]) {
      if (!tx.due_date) continue;
      
      let currentDate = new Date(tx.due_date);
      const frequency = tx.recurrence_pattern || 'monthly';
      
      while (currentDate <= endDate) {
        if (currentDate >= today) {
          scheduled.push({
            id: `${tx.id}-${format(currentDate, 'yyyy-MM-dd')}`,
            date: new Date(currentDate),
            description: tx.description || 'Despesa Recorrente',
            amount: Number(tx.total_amount) || 0,
            category: 'EXPENSE',
            priority: 'MEDIUM'
          });
        }
        
        // Increment based on frequency
        if (frequency === 'daily') currentDate = addDays(currentDate, 1);
        else if (frequency === 'weekly') currentDate = addDays(currentDate, 7);
        else if (frequency === 'monthly') currentDate = addDays(currentDate, 30);
        else if (frequency === 'yearly') currentDate = addDays(currentDate, 365);
        else currentDate = addDays(currentDate, 30);
      }
    }

    return scheduled;
  }

  // ==================== ADJUSTMENT FACTORS ====================

  private getAdjustmentFactors(scenarioType: 'PESSIMIST' | 'REALISTIC' | 'OPTIMIST'): AdjustmentFactors {
    switch (scenarioType) {
      case 'PESSIMIST':
        return {
          delayPaymentReceivables: 0.7,  // 30% dos recebíveis atrasam
          delayPaymentPayables: 0.05,    // 5% antecipação
          discountRate: 0.05,            // 5% desconto
          churnRate: 0.10,               // 10% churn
          seasonalityFactor: 0.85,       // 15% redução sazonal
          economicFactor: 0.95           // 5% impacto econômico
        };
      case 'OPTIMIST':
        return {
          delayPaymentReceivables: 0.95, // 5% dos recebíveis atrasam
          delayPaymentPayables: 0.15,    // 15% antecipação com desconto
          discountRate: 0.01,            // 1% desconto
          churnRate: 0.02,               // 2% churn
          seasonalityFactor: 1.15,       // 15% aumento sazonal
          economicFactor: 1.05           // 5% crescimento econômico
        };
      case 'REALISTIC':
      default:
        return {
          delayPaymentReceivables: 0.85, // 15% dos recebíveis atrasam
          delayPaymentPayables: 0.10,    // 10% antecipação
          discountRate: 0.02,            // 2% desconto
          churnRate: 0.05,               // 5% churn
          seasonalityFactor: 1.0,        // neutro
          economicFactor: 1.0            // neutro
        };
    }
  }

  private getScenarioProbability(scenarioType: 'PESSIMIST' | 'REALISTIC' | 'OPTIMIST'): number {
    switch (scenarioType) {
      case 'PESSIMIST': return 0.20;
      case 'OPTIMIST': return 0.25;
      case 'REALISTIC': 
      default: return 0.55;
    }
  }

  // ==================== SEASONALITY FACTOR ====================

  private getSeasonalityFactor(date: Date): number {
    const pattern = this.seasonalityCache.get(this.companyId);
    if (!pattern) return 1.0;

    const month = getMonth(date);
    const weekday = getDay(date);
    const dayOfMonth = getDate(date);

    const monthFactor = pattern.monthlyFactors[month] || 1;
    const weekdayFactor = pattern.weekdayFactors[weekday] || 1;
    const domFactor = pattern.dayOfMonthFactors.get(dayOfMonth) || 1;

    // Weighted average
    return (monthFactor * 0.5 + weekdayFactor * 0.3 + domFactor * 0.2);
  }

  // ==================== DAILY CALCULATIONS ====================

  private calculateDailyInflows(
    date: Date,
    receivables: Receivable[],
    adjustments: AdjustmentFactors
  ): Inflow[] {
    const inflows: Inflow[] = [];
    const seasonalityFactor = this.getSeasonalityFactor(date);

    // Filter receivables due around this date
    const dueReceivables = receivables.filter(r => {
      const daysUntilDue = differenceInDays(r.dueDate, date);
      return daysUntilDue >= -7 && daysUntilDue <= 7;
    });

    for (const receivable of dueReceivables) {
      const daysUntilDue = differenceInDays(receivable.dueDate, date);
      
      // Calculate probability based on due date proximity
      let probability = receivable.paymentReliability;
      if (isSameDay(receivable.dueDate, date)) {
        probability *= adjustments.delayPaymentReceivables;
      } else if (daysUntilDue < 0) {
        // Overdue - lower probability
        probability *= 0.3;
      } else {
        // Future - even lower
        probability *= 0.1;
      }

      const discountFactor = 1 - adjustments.discountRate;
      const adjustedAmount = receivable.amount * probability * discountFactor * seasonalityFactor;

      if (adjustedAmount > 0) {
        inflows.push({
          description: receivable.description,
          amount: adjustedAmount,
          source: 'RECEIVABLE',
          confidence: probability
        });
      }
    }

    // Estimate daily sales based on historical average
    const avgDailySales = this.estimateDailySales(adjustments);
    if (avgDailySales > 0) {
      inflows.push({
        description: 'Vendas Estimadas',
        amount: avgDailySales * seasonalityFactor,
        source: 'SALE',
        confidence: 0.70
      });
    }

    return inflows;
  }

  private calculateDailyOutflows(
    date: Date,
    payables: Payable[],
    scheduledTransactions: ScheduledTransaction[],
    adjustments: AdjustmentFactors
  ): Outflow[] {
    const outflows: Outflow[] = [];

    // Filter payables due around this date
    const duePayables = payables.filter(p => {
      const daysDue = differenceInDays(p.dueDate, date);
      return daysDue >= -3 && daysDue <= 3;
    });

    for (const payable of duePayables) {
      let paymentProbability = 1.0;
      
      if (isSameDay(payable.dueDate, date)) {
        paymentProbability = 1 - adjustments.delayPaymentPayables;
      } else {
        paymentProbability = 0.2;
      }

      if (paymentProbability > 0.1) {
        outflows.push({
          description: payable.description,
          amount: payable.amount * paymentProbability,
          category: 'PAYABLE',
          priority: payable.isCritical ? 'CRITICAL' : 'HIGH',
          confidence: paymentProbability
        });
      }
    }

    // Add scheduled transactions
    for (const tx of scheduledTransactions) {
      if (isSameDay(tx.date, date)) {
        outflows.push({
          description: tx.description,
          amount: tx.amount,
          category: tx.category,
          priority: tx.priority,
          confidence: 0.95
        });
      }
    }

    return outflows;
  }

  private estimateDailySales(adjustments: AdjustmentFactors): number {
    if (this.historicalData.length === 0) return 0;
    
    const last30Days = this.historicalData.slice(-30);
    const avgInflows = last30Days.reduce((sum, d) => sum + d.inflows, 0) / last30Days.length;
    
    // Apply churn and economic factors
    return avgInflows * (1 - adjustments.churnRate) * adjustments.economicFactor * 0.3; // 30% as daily sales estimate
  }

  // ==================== DAY ALERTS ====================

  private generateDayAlerts(
    date: Date,
    closingBalance: number,
    netFlow: number,
    inflows: Inflow[],
    outflows: Outflow[]
  ): DayAlert[] {
    const alerts: DayAlert[] = [];

    if (closingBalance < 0) {
      alerts.push({
        type: 'OVERDRAFT_RISK',
        severity: 'CRITICAL',
        message: `Saldo negativo projetado: ${closingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      });
    } else if (closingBalance < 10000) {
      alerts.push({
        type: 'LIQUIDITY_WARNING',
        severity: 'WARNING',
        message: `Saldo baixo projetado: ${closingBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      });
    }

    if (netFlow < -50000) {
      alerts.push({
        type: 'LIQUIDITY_WARNING',
        severity: 'WARNING',
        message: `Saída significativa: ${Math.abs(netFlow).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
      });
    }

    // Check for high-value low-confidence inflows
    const riskyInflows = inflows.filter(i => i.amount > 10000 && i.confidence < 0.5);
    if (riskyInflows.length > 0) {
      alerts.push({
        type: 'ANOMALY',
        severity: 'INFO',
        message: `${riskyInflows.length} recebimento(s) de alto valor com baixa confiança`
      });
    }

    return alerts;
  }

  // ==================== SCENARIO GENERATION ====================

  private async generateScenario(
    companyId: string,
    scenarioType: 'PESSIMIST' | 'REALISTIC' | 'OPTIMIST',
    initialBalance: number,
    projectedReceivables: Receivable[],
    projectedPayables: Payable[],
    scheduledTransactions: ScheduledTransaction[]
  ): Promise<ForecastScenario> {
    const adjustmentFactors = this.getAdjustmentFactors(scenarioType);
    const dailyProjection: CashFlowDay[] = [];
    let runningBalance = initialBalance;
    const today = new Date();

    for (let i = 0; i < 90; i++) {
      const currentDate = addDays(today, i);

      const inflows = this.calculateDailyInflows(currentDate, projectedReceivables, adjustmentFactors);
      const outflows = this.calculateDailyOutflows(currentDate, projectedPayables, scheduledTransactions, adjustmentFactors);

      const totalInflows = inflows.reduce((sum, inf) => sum + inf.amount, 0);
      const totalOutflows = outflows.reduce((sum, out) => sum + out.amount, 0);
      const netFlow = totalInflows - totalOutflows;
      const closingBalance = runningBalance + netFlow;

      const dayAlerts = this.generateDayAlerts(currentDate, closingBalance, netFlow, inflows, outflows);

      dailyProjection.push({
        date: currentDate,
        openingBalance: runningBalance,
        inflows,
        outflows,
        netFlow,
        closingBalance,
        alerts: dayAlerts
      });

      runningBalance = closingBalance;
    }

    const summary: ScenarioSummary = {
      initialBalance,
      totalInflows: dailyProjection.reduce((sum, day) => sum + day.inflows.reduce((s, inf) => s + inf.amount, 0), 0),
      totalOutflows: dailyProjection.reduce((sum, day) => sum + day.outflows.reduce((s, out) => s + out.amount, 0), 0),
      finalBalance: dailyProjection[dailyProjection.length - 1]?.closingBalance || initialBalance,
      minBalance: Math.min(...dailyProjection.map(d => d.closingBalance)),
      maxBalance: Math.max(...dailyProjection.map(d => d.closingBalance)),
      averageBalance: dailyProjection.reduce((sum, day) => sum + day.closingBalance, 0) / dailyProjection.length
    };

    return {
      name: scenarioType,
      probability: this.getScenarioProbability(scenarioType),
      adjustmentFactors,
      dailyProjection,
      summary
    };
  }

  // ==================== KEY METRICS ====================

  private calculateKeyMetrics(scenarios: ForecastScenario[]): CashFlowMetrics {
    const realisticScenario = scenarios.find(s => s.name === 'REALISTIC') || scenarios[0];
    if (!realisticScenario) {
      return {
        projectedCashDeficit: 0,
        riskDays: [],
        averageDailyBalance: 0,
        volatilityIndex: 0,
        liquidityRatio: 1,
        coverageRatio: 30,
        seasonalityPattern: 'LOW'
      };
    }

    const { dailyProjection, summary } = realisticScenario;

    // Days with negative balance
    const negativeDays = dailyProjection.filter(d => d.closingBalance < 0);
    const riskDays = negativeDays.map(d => d.date);

    // Volatility (standard deviation of net flows)
    const netFlows = dailyProjection.map(d => d.netFlow);
    const avgNetFlow = netFlows.reduce((a, b) => a + b, 0) / netFlows.length;
    const variance = netFlows.reduce((sum, nf) => sum + Math.pow(nf - avgNetFlow, 2), 0) / netFlows.length;
    const volatilityIndex = Math.sqrt(variance) / (Math.abs(avgNetFlow) || 1);

    // Coverage ratio (days can survive without income)
    const avgDailyOutflow = summary.totalOutflows / 90;
    const coverageRatio = avgDailyOutflow > 0 ? summary.initialBalance / avgDailyOutflow : 999;

    // Liquidity ratio (simplified)
    const liquidityRatio = summary.totalInflows > 0 ? summary.totalInflows / summary.totalOutflows : 1;

    // Seasonality pattern from cache
    const pattern = this.seasonalityCache.get(this.companyId);

    return {
      projectedCashDeficit: negativeDays.length,
      riskDays,
      averageDailyBalance: summary.averageBalance,
      volatilityIndex,
      liquidityRatio,
      coverageRatio: Math.round(coverageRatio),
      seasonalityPattern: pattern?.pattern || 'MODERATE'
    };
  }

  // ==================== ALERTS GENERATION ====================

  private generateAlerts(scenarios: ForecastScenario[], metrics: CashFlowMetrics): CashFlowAlert[] {
    const alerts: CashFlowAlert[] = [];

    // Critical: Negative balance in realistic scenario
    if (metrics.projectedCashDeficit > 0 && metrics.riskDays.length > 0) {
      alerts.push({
        date: metrics.riskDays[0],
        type: 'CRITICAL',
        title: 'Risco de Saldo Negativo',
        description: `Projeção indica ${metrics.projectedCashDeficit} dia(s) com saldo negativo`,
        suggestedAction: 'Considere antecipar recebíveis ou postergar pagamentos não críticos',
        affectedScenarios: ['REALISTIC', 'PESSIMIST']
      });
    }

    // Warning: Low liquidity
    if (metrics.liquidityRatio < 1.1) {
      alerts.push({
        date: new Date(),
        type: 'WARNING',
        title: 'Índice de Liquidez Baixo',
        description: `Índice de ${metrics.liquidityRatio.toFixed(2)} indica entrada/saída equilibradas demais`,
        suggestedAction: 'Aumente a margem de segurança com reserva de caixa',
        affectedScenarios: ['REALISTIC']
      });
    }

    // Warning: High volatility
    if (metrics.volatilityIndex > 0.5) {
      alerts.push({
        date: new Date(),
        type: 'WARNING',
        title: 'Alta Volatilidade no Fluxo',
        description: `Índice de volatilidade de ${(metrics.volatilityIndex * 100).toFixed(1)}% indica instabilidade`,
        suggestedAction: 'Diversifique fontes de receita e negocie prazos mais estáveis',
        affectedScenarios: ['PESSIMIST', 'REALISTIC', 'OPTIMIST']
      });
    }

    // Info: Low coverage
    if (metrics.coverageRatio < 30) {
      alerts.push({
        date: new Date(),
        type: 'INFO',
        title: 'Cobertura de Caixa Limitada',
        description: `Reserva cobre apenas ${metrics.coverageRatio} dias de operação`,
        suggestedAction: 'Recomenda-se reserva mínima de 60-90 dias',
        affectedScenarios: ['REALISTIC']
      });
    }

    return alerts;
  }

  // ==================== CONFIDENCE SCORE ====================

  private calculateConfidenceScore(historicalData: HistoricalCashFlow[], scenarios: ForecastScenario[]): number {
    let score = 50; // Base score

    // More historical data = higher confidence
    if (historicalData.length > 365) score += 20;
    else if (historicalData.length > 180) score += 15;
    else if (historicalData.length > 90) score += 10;
    else if (historicalData.length > 30) score += 5;

    // Low volatility = higher confidence
    const pattern = this.seasonalityCache.get(this.companyId);
    if (pattern?.pattern === 'LOW') score += 15;
    else if (pattern?.pattern === 'MODERATE') score += 10;
    else score += 5;

    // Scenario agreement = higher confidence
    const finalBalances = scenarios.map(s => s.summary.finalBalance);
    const avgFinal = finalBalances.reduce((a, b) => a + b, 0) / finalBalances.length;
    const spread = Math.max(...finalBalances) - Math.min(...finalBalances);
    const relativeSpread = avgFinal !== 0 ? spread / Math.abs(avgFinal) : 1;
    
    if (relativeSpread < 0.2) score += 15;
    else if (relativeSpread < 0.4) score += 10;
    else if (relativeSpread < 0.6) score += 5;

    return Math.min(100, Math.max(0, score));
  }

  // ==================== MAIN FORECAST GENERATION ====================

  async generateForecast(
    companyId: string,
    forecastPeriodDays: number = 90,
    includeScenarios: boolean = true
  ): Promise<CashFlowForecast> {
    await this.initialize(companyId);

    const today = new Date();
    const forecastEndDate = addDays(today, forecastPeriodDays);

    const currentBalance = await this.getCurrentBalance(companyId);
    const projectedReceivables = await this.getProjectedReceivables(companyId, forecastEndDate);
    const projectedPayables = await this.getProjectedPayables(companyId, forecastEndDate);
    const scheduledTransactions = await this.getScheduledTransactions(companyId, forecastEndDate);

    const scenarios: ForecastScenario[] = [];

    if (includeScenarios) {
      const [pessimist, realistic, optimist] = await Promise.all([
        this.generateScenario(companyId, 'PESSIMIST', currentBalance, projectedReceivables, projectedPayables, scheduledTransactions),
        this.generateScenario(companyId, 'REALISTIC', currentBalance, projectedReceivables, projectedPayables, scheduledTransactions),
        this.generateScenario(companyId, 'OPTIMIST', currentBalance, projectedReceivables, projectedPayables, scheduledTransactions)
      ]);
      scenarios.push(pessimist, realistic, optimist);
    }

    const keyMetrics = this.calculateKeyMetrics(scenarios);
    const alerts = this.generateAlerts(scenarios, keyMetrics);
    const confidence = this.calculateConfidenceScore(this.historicalData, scenarios);

    return {
      companyId,
      forecastDate: today,
      forecastPeriodDays,
      scenarios,
      keyMetrics,
      alerts,
      confidence,
      lastUpdated: new Date()
    };
  }
}

// Export singleton instance
export const cashFlowPredictionService = new CashFlowPredictionService();
