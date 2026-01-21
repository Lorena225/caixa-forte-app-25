/**
 * Web Worker for Heavy Metrics Calculations
 * Offloads CPU-intensive calculations from the main thread
 */

interface MetricsData {
  transactions?: Array<{
    amount: number;
    type: 'income' | 'expense';
    date: string;
    status: string;
    category?: string;
  }>;
  invoices?: Array<{
    amount: number;
    due_date: string;
    status: string;
    paid_date?: string;
  }>;
  period?: {
    start: string;
    end: string;
  };
}

interface CalculatedMetrics {
  totalIncome: number;
  totalExpense: number;
  netBalance: number;
  transactionCount: number;
  averageTransaction: number;
  categoryBreakdown: Record<string, number>;
  monthlyTrends: Array<{
    month: string;
    income: number;
    expense: number;
    net: number;
  }>;
  overdueSummary: {
    count: number;
    totalAmount: number;
    averageDaysOverdue: number;
  };
  cashFlowProjection: Array<{
    date: string;
    projected: number;
    cumulative: number;
  }>;
}

function calculateMetrics(data: MetricsData): CalculatedMetrics {
  const { transactions = [], invoices = [] } = data;
  
  // Basic aggregations
  let totalIncome = 0;
  let totalExpense = 0;
  const categoryBreakdown: Record<string, number> = {};
  const monthlyData: Record<string, { income: number; expense: number }> = {};
  
  for (const tx of transactions) {
    const amount = Math.abs(tx.amount);
    
    if (tx.type === 'income') {
      totalIncome += amount;
    } else {
      totalExpense += amount;
    }
    
    // Category breakdown
    const category = tx.category || 'Outros';
    categoryBreakdown[category] = (categoryBreakdown[category] || 0) + amount;
    
    // Monthly trends
    const month = tx.date.substring(0, 7); // YYYY-MM
    if (!monthlyData[month]) {
      monthlyData[month] = { income: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      monthlyData[month].income += amount;
    } else {
      monthlyData[month].expense += amount;
    }
  }
  
  // Calculate monthly trends sorted by date
  const monthlyTrends = Object.entries(monthlyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      net: data.income - data.expense,
    }));
  
  // Overdue analysis
  const today = new Date();
  let overdueCount = 0;
  let overdueAmount = 0;
  let totalDaysOverdue = 0;
  
  for (const invoice of invoices) {
    if (invoice.status !== 'paid' && invoice.status !== 'cancelled') {
      const dueDate = new Date(invoice.due_date);
      if (dueDate < today) {
        overdueCount++;
        overdueAmount += invoice.amount;
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysOverdue += daysOverdue;
      }
    }
  }
  
  // Cash flow projection (next 30 days)
  const cashFlowProjection: Array<{ date: string; projected: number; cumulative: number }> = [];
  let cumulative = totalIncome - totalExpense;
  
  for (let i = 0; i < 30; i++) {
    const projectionDate = new Date(today);
    projectionDate.setDate(projectionDate.getDate() + i);
    const dateStr = projectionDate.toISOString().split('T')[0];
    
    // Find invoices due on this date
    let dayProjected = 0;
    for (const invoice of invoices) {
      if (invoice.due_date === dateStr && invoice.status !== 'paid') {
        dayProjected -= invoice.amount; // Assuming these are payables
      }
    }
    
    cumulative += dayProjected;
    cashFlowProjection.push({
      date: dateStr,
      projected: dayProjected,
      cumulative,
    });
  }
  
  const transactionCount = transactions.length;
  const averageTransaction = transactionCount > 0 
    ? (totalIncome + totalExpense) / transactionCount 
    : 0;
  
  return {
    totalIncome,
    totalExpense,
    netBalance: totalIncome - totalExpense,
    transactionCount,
    averageTransaction,
    categoryBreakdown,
    monthlyTrends,
    overdueSummary: {
      count: overdueCount,
      totalAmount: overdueAmount,
      averageDaysOverdue: overdueCount > 0 ? totalDaysOverdue / overdueCount : 0,
    },
    cashFlowProjection,
  };
}

function calculateTrends(data: MetricsData): {
  growthRate: number;
  volatility: number;
  seasonalityIndex: Record<string, number>;
} {
  const { transactions = [] } = data;
  
  if (transactions.length < 2) {
    return {
      growthRate: 0,
      volatility: 0,
      seasonalityIndex: {},
    };
  }
  
  // Group by month
  const monthlyTotals: Record<string, number> = {};
  for (const tx of transactions) {
    const month = tx.date.substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + tx.amount;
  }
  
  const months = Object.keys(monthlyTotals).sort();
  const values = months.map(m => monthlyTotals[m]);
  
  // Calculate growth rate (month over month average)
  let totalGrowth = 0;
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] !== 0) {
      totalGrowth += (values[i] - values[i - 1]) / Math.abs(values[i - 1]);
    }
  }
  const growthRate = values.length > 1 ? totalGrowth / (values.length - 1) : 0;
  
  // Calculate volatility (standard deviation)
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
  const volatility = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  
  // Calculate seasonality index by month number
  const monthlyAverages: Record<string, { sum: number; count: number }> = {};
  for (const tx of transactions) {
    const monthNum = tx.date.substring(5, 7); // MM
    if (!monthlyAverages[monthNum]) {
      monthlyAverages[monthNum] = { sum: 0, count: 0 };
    }
    monthlyAverages[monthNum].sum += tx.amount;
    monthlyAverages[monthNum].count++;
  }
  
  const overallAverage = transactions.reduce((a, tx) => a + tx.amount, 0) / transactions.length;
  const seasonalityIndex: Record<string, number> = {};
  
  for (const [month, data] of Object.entries(monthlyAverages)) {
    const monthAvg = data.sum / data.count;
    seasonalityIndex[month] = overallAverage !== 0 ? monthAvg / overallAverage : 1;
  }
  
  return {
    growthRate,
    volatility,
    seasonalityIndex,
  };
}

// Worker message handler
self.onmessage = (event: MessageEvent<{ type: string; data: MetricsData }>) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'calculate': {
        const metrics = calculateMetrics(data);
        const trends = calculateTrends(data);
        self.postMessage({ 
          success: true, 
          metrics, 
          trends 
        });
        break;
      }
      case 'metrics-only': {
        const metrics = calculateMetrics(data);
        self.postMessage({ 
          success: true, 
          metrics 
        });
        break;
      }
      case 'trends-only': {
        const trends = calculateTrends(data);
        self.postMessage({ 
          success: true, 
          trends 
        });
        break;
      }
      default:
        self.postMessage({ 
          success: false, 
          error: `Unknown message type: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
};

export {};
