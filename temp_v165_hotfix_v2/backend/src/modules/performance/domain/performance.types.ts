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

export interface ProductivityData {
  date: string;
  planned: number;
  actual: number;
}

export interface TeamPerformance {
  teamId: string;
  teamName: string;
  efficiency: number;
  executedQuantity: number;
}
