export interface AnalyticsParams {
  projectId: string;
  granularity: "weekly" | "monthly" | "quarterly" | "annual" | "total";
  startDate?: string;
  endDate?: string;
  activityId?: string;
}

export interface PhysicalCurveItem {
  period: string;
  date: string;
  planned: number;
  actual: number;
  qtyPlanned: number;
  qtyActual: number;
  total: number;
}

export interface FinancialCurveItem {
  period: string;
  planned: number;
  actual: number;
}

export interface FinancialAnalyticsResponse {
  curve: FinancialCurveItem[];
  stats: {
    budget: number;
    earned: number;
  };
  pareto: Array<{ name: string; value: number }>;
}

export interface PerformanceMetrics {
  spi: number;
  cpi: number;
  plannedProgress: number;
  actualProgress: number;
  plannedHH: number;
  actualHH: number;
  plannedCost: number;
  actualCost: number;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  efficiency: number;
  executedQuantity: number;
}

export interface CostDistributionItem {
  name: string;
  value: number;
}
