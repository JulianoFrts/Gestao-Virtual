import {
  MapElementTechnicalData,
  ActivitySchedule,
  MapElementProductionProgress,
  ProductionCategory,
  ActivityUnitCost,
  Team,
} from "@prisma/client";
import { prisma } from "@/lib/prisma/client";
import {
  format,
  startOfDay,
  eachWeekOfInterval,
  eachMonthOfInterval,
  eachQuarterOfInterval,
  eachYearOfInterval,
  isBefore,
  isWithinInterval,
  endOfWeek,
  endOfMonth,
  endOfQuarter,
  endOfYear,
  min,
  max,
  startOfMonth,
  addMonths,
  addWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AnalyticsParams,
  PhysicalCurveItem,
  FinancialAnalyticsResponse,
  PerformanceMetrics,
  TeamPerformance,
  CostDistributionItem,
} from "./dtos/production-analytics.dto";
import { ProgressHistoryEntry } from "../domain/production.repository";
import { TimeProvider, SystemTimeProvider } from "@/lib/utils/time-provider";
import { RandomProvider, SystemRandomProvider } from "@/lib/utils/random-provider";

export class ProductionAnalyticsService {
  constructor(
    private readonly timeProvider: TimeProvider = new SystemTimeProvider(),
    private readonly randomProvider: RandomProvider = new SystemRandomProvider(),
  ) {}

  /**
   * Gera a Curva S Física baseada em peso unitário (Bottom-up)
   */
  async getPhysicalProgressCurve(
    params: AnalyticsParams,
  ): Promise<PhysicalCurveItem[]> {
    const { projectId, granularity, startDate, endDate, activityId } = params;

    const towers = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
      include: {
        activitySchedules: true,
        mapElementProductionProgress: true,
      },
    });

    if (towers.length === 0) return [];

    const relevantActivities = this.extractRelevantActivities(towers, activityId);
    if (relevantActivities.length === 0) return [];

    const allDates = this.collectAllDates(relevantActivities);
    if (allDates.length === 0) return [];

    const start = startDate ? startOfDay(new Date(startDate)) : startOfMonth(min(allDates));
    const end = endDate ? startOfDay(new Date(endDate)) : startOfMonth(max(allDates));

    const timeline = this.generateTimeline(start, end, granularity);
    const totalWeight = relevantActivities.length || 1;

    return timeline.map((period) => {
      const periodEnd = granularity === "weekly" 
        ? endOfWeek(period, { weekStartsOn: 1 }) 
        : endOfMonth(period);

      const plannedSum = relevantActivities.reduce((acc, i) => 
        acc + (i.plannedEnd && isBefore(i.plannedEnd, periodEnd) ? 1 : 0), 0);

      const actualSum = relevantActivities.reduce((acc, i) => {
        const historyBefore = i.history.filter((h) => isBefore(h.date, periodEnd));
        if (historyBefore.length === 0) return acc;
        const maxProgress = Math.max(...historyBefore.map((h) => h.percent));
        return acc + maxProgress / 100;
      }, 0);

      return {
        period: this.getPeriodLabel(period, granularity),
        date: period.toISOString(),
        planned: (plannedSum / totalWeight) * 100,
        actual: (actualSum / totalWeight) * 100,
        qtyPlanned: Math.round(plannedSum),
        qtyActual: Math.round(actualSum),
        total: totalWeight,
      };
    });
  }

  private extractRelevantActivities(towers: unknown[], activityId?: string) {
    const activities: unknown[] = [];
    
    for (const tower of towers) {
      const filteredSchedules = this.filterSchedules(tower.activitySchedules, activityId);
      const filteredProgress = this.filterProgress(tower.mapElementProductionProgress, activityId);

      for (const schedule of filteredSchedules) {
        const progress = filteredProgress.find((p: unknown) => p.activityId === schedule.activityId);
        activities.push({
          plannedEnd: schedule.plannedEnd ? new Date(schedule.plannedEnd) : undefined,
          history: this.mapProgressHistory(progress),
        });
      }
    }
    return activities;
  }

  private filterSchedules(schedules: unknown[], activityId?: string) {
    if (!activityId || activityId === "all") return schedules;
    return schedules.filter((s: unknown) => s.activityId === activityId);
  }

  private filterProgress(progresses: unknown[], activityId?: string) {
    if (!activityId || activityId === "all") return progresses;
    return progresses.filter((p: unknown) => p.activityId === activityId);
  }

  private mapProgressHistory(status: unknown) {
    const history: unknown[] = [];
    if (!status) return history;

    if (status.history && Array.isArray(status.history)) {
      status.history.forEach((h: unknown) => {
        const date = h.changedAt || h.timestamp;
        if (date) history.push({ date: new Date(date), percent: Number(h.progressPercent || h.progress || 0) });
      });
    } else if (status.currentStatus === "FINISHED" && status.endDate) {
      history.push({ date: new Date(status.endDate), percent: 100 });
    }
    return history;
  }

  private collectAllDates(activities: unknown[]): Date[] {
    return [
      ...activities.map((i) => i.plannedEnd),
      ...activities.flatMap((i) => i.history.map((h: unknown) => h.date)),
    ].filter((d): d is Date => d !== undefined);
  }

  private generateTimeline(start: Date, end: Date, granularity: string): Date[] {
    if (granularity === "weekly") {
      return eachWeekOfInterval({ start, end: addWeeks(end, 1) }, { weekStartsOn: 1 });
    }
    return eachMonthOfInterval({ start, end: addMonths(end, 1) });
  }

  private getPeriodLabel(date: Date, granularity: string): string {
    if (granularity === "weekly") {
      return `S${format(date, "ww", { locale: ptBR })} - ${format(date, "dd/MM", { locale: ptBR })}`;
    }
    return format(date, "MMM/yy", { locale: ptBR });
  }

  /**
   * Calcula dados financeiros (Curva S Financeira e Pareto)
   */
  async getFinancialData(params: {
    projectId: string;
    granularity: "weekly" | "monthly" | "quarterly" | "annual" | "total";
    startDate?: string;
    endDate?: string;
  }): Promise<FinancialAnalyticsResponse> {
    const { projectId, granularity, startDate, endDate } = params;

    const [towers, categories, unitCosts] = await Promise.all([
      prisma.mapElementTechnicalData.findMany({
        where: { projectId, elementType: "TOWER" },
        include: { activitySchedules: true, mapElementProductionProgress: true },
      }),
      prisma.productionCategory.findMany({ include: { productionActivities: true } }),
      prisma.activityUnitCost.findMany({ where: { projectId } }),
    ]);

    const costMap = new Map(unitCosts.map(uc => [uc.activityId, Number(uc.unitPrice || 0)]));
    const items = this.extractFinancialItems(towers, categories, costMap);

    if (items.length === 0) {
      return { curve: [], stats: { budget: 0, earned: 0 }, pareto: [] };
    }

    const allDates = items.flatMap(i => [i.plannedEnd, i.actualEnd].filter((d): d is Date => d !== undefined));
    const filterStart = startDate ? startOfDay(new Date(startDate)) : min(allDates);
    const filterEnd = endDate ? startOfDay(new Date(endDate)) : max(allDates);

    const stats = this.calculateFinancialStats(items, filterStart, filterEnd);
    const timeline = this.generateFinancialTimeline(filterStart, filterEnd, granularity);

    const curve = timeline.map(period => {
      const periodEnd = this.getPeriodEnd(period, granularity, filterEnd);
      const plannedAcc = items.filter(i => isBefore(i.plannedEnd, periodEnd)).reduce((acc, curr) => acc + curr.cost, 0);
      const actualAcc = items.filter(i => i.actualEnd && isBefore(i.actualEnd, periodEnd)).reduce((acc, curr) => acc + curr.cost, 0);

      return { period: this.getFinancialLabel(period, granularity), planned: plannedAcc, actual: actualAcc };
    });

    return { curve, stats: stats.totals, pareto: stats.pareto };
  }

  private extractFinancialItems(towers: unknown[], categories: unknown[], costMap: Map<string, number>) {
    const items: unknown[] = [];
    this.processSubList(tower, categories, (category) => {
        items.push(...this.processCategoryActivities(tower, category, costMap));
      }
    }
    return items;
  }

  private processCategoryActivities(tower: unknown, category: unknown, costMap: Map<string, number>) {
    const items: unknown[] = [];
    for (const activity of category.productionActivities) {
      const price = costMap.get(activity.id);
      if (!price || price <= 0) continue;

      const financialItem = this.buildFinancialItem(tower, activity, price);
      if (financialItem) items.push(financialItem);
    }
    return items;
  }

  private buildFinancialItem(tower: unknown, activity: unknown, price: number) {
    const schedule = tower.activitySchedules?.find((s: unknown) => s.activityId === activity.id);
    if (!schedule?.plannedEnd) return null;

    const status = tower.mapElementProductionProgress?.find((s: unknown) => s.activityId === activity.id);

    return {
      name: activity.name,
      plannedEnd: startOfDay(new Date(schedule.plannedEnd)),
      actualEnd: status?.endDate ? startOfDay(new Date(status.endDate)) : undefined,
      cost: Number(schedule.plannedQuantity || 1) * price,
      isFinished: status?.currentStatus === "FINISHED",
    };
  }

  private calculateFinancialStats(items: unknown[], start: Date, end: Date) {
    let budget = 0;
    let earned = 0;
    const activityCosts: Record<string, number> = {};

    items.forEach(item => {
      if (isWithinInterval(item.plannedEnd, { start, end })) budget += item.cost;
      if (item.isFinished && item.actualEnd && isWithinInterval(item.actualEnd, { start, end })) earned += item.cost;

      const refDate = item.actualEnd || item.plannedEnd;
      if (isWithinInterval(refDate, { start, end })) {
        activityCosts[item.name] = (activityCosts[item.name] || 0) + item.cost;
      }
    });

    const pareto = Object.entries(activityCosts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return { totals: { budget, earned }, pareto };
  }

  private generateFinancialTimeline(start: Date, end: Date, granularity: string): Date[] {
    const interval = { start, end };
    switch (granularity) {
      case "weekly": return eachWeekOfInterval(interval, { weekStartsOn: 1 });
      case "monthly": return eachMonthOfInterval(interval);
      case "quarterly": return eachQuarterOfInterval(interval);
      case "annual": return eachYearOfInterval(interval);
      default: return [start];
    }
  }

  private getPeriodEnd(date: Date, granularity: string, defaultEnd: Date): Date {
    switch (granularity) {
      case "weekly": return endOfWeek(date, { weekStartsOn: 1 });
      case "monthly": return endOfMonth(date);
      case "quarterly": return endOfQuarter(date);
      case "annual": return endOfYear(date);
      default: return defaultEnd;
    }
  }

  private getFinancialLabel(date: Date, granularity: string): string {
    switch (granularity) {
      case "weekly": return `S${format(date, "ww")} - ${format(date, "dd/MM")}`;
      case "monthly": return format(date, "MMM/yy", { locale: ptBR });
      case "quarterly": return `${Math.floor(date.getMonth() / 3) + 1}º Trim/${format(date, "yy")}`;
      case "annual": return format(date, "yyyy");
      default: return "GERAL";
    }
  }

  /**
   * Obtém as métricas gerais de performance (SPI, CPI, HH)
   */
  async getPerformanceMetrics(projectId: string): Promise<PerformanceMetrics> {
    const [schedules, unitCosts, productionProgress, timeRecords] = await Promise.all([
      prisma.activitySchedule.findMany({ where: { mapElementTechnicalData: { projectId } } }),
      prisma.activityUnitCost.findMany({ where: { projectId } }),
      prisma.mapElementProductionProgress.findMany({ where: { projectId } }),
      prisma.timeRecord.findMany({ where: { team: { site: { projectId } } } }),
    ]);

    const costMap = new Map(unitCosts.map(uc => [uc.activityId, Number(uc.unitPrice || 0)]));
    const now = this.timeProvider.now();
    
    let totalPV = 0;
    let totalPlannedHH = 0;

    schedules.forEach((sched: unknown) => {
      const unitPrice = costMap.get(sched.activityId) || 0;
      const plannedQty = Number(sched.plannedQuantity || 0);
      const plannedHH = Number(sched.plannedHhh || 0);
      const pS = new Date(sched.plannedStart);
      const pE = new Date(sched.plannedEnd);

      if (isBefore(pE, now)) {
        totalPV += plannedQty * unitPrice;
        totalPlannedHH += plannedHH;
      } else if (isBefore(pS, now)) {
        const totalDuration = pE.getTime() - pS.getTime();
        const elapsed = now.getTime() - pS.getTime();
        const factor = Math.max(0, Math.min(1, elapsed / (totalDuration || 1)));
        totalPV += plannedQty * unitPrice * factor;
        totalPlannedHH += plannedHH * factor;
      }
    });

    const progressMap = new Map(productionProgress.map(pp => [`${pp.elementId}-${pp.activityId}`, Number(pp.progressPercent || 0) / 100]));
    let totalEV = 0;

    schedules.forEach((sched: unknown) => {
      const progress = progressMap.get(`${sched.elementId}-${sched.activityId}`) || 0;
      const unitPrice = costMap.get(sched.activityId) || 0;
      const plannedQty = Number(sched.plannedQuantity || 0);
      totalEV += plannedQty * unitPrice * progress;
    });

    const HH_COST_FACTOR = 50;
    const totalActualHH = timeRecords.length * 8;
    const spi = totalPV > 0 ? totalEV / totalPV : 1;
    const cpi = totalActualHH > 0 ? totalEV / (totalActualHH * HH_COST_FACTOR) : 1;

    return {
      spi: Number(spi.toFixed(2)),
      cpi: Number(cpi.toFixed(2)),
      plannedProgress: totalPV,
      actualProgress: totalEV,
      plannedHH: totalPlannedHH,
      actualHH: totalActualHH,
      plannedCost: totalPV,
      actualCost: totalActualHH * HH_COST_FACTOR,
    };
  }

  /**
   * Obtém desempenho detalhado por equipe
   */
  async getTeamPerformance(projectId: string): Promise<TeamPerformance[]> {
    const [teams, production] = await Promise.all([
      prisma.team.findMany({
        where: { site: { projectId } },
        include: { _count: { select: { timeRecords: true } } },
      }),
      prisma.mapElementProductionProgress.findMany({ where: { projectId } }),
    ]);

    return (teams as unknown[]).map(team => {
      const executedQty = production.filter((p: unknown) => {
        const history = p.history as ProgressHistoryEntry[];
        return Array.isArray(history) && history.some(h => h.teamId === team.id);
      }).length;

      const hhReal = (team._count.timeRecords || 0) * 8;

      return {
        teamId: team.id,
        teamName: team.name,
        efficiency: hhReal > 0 ? (executedQty / hhReal) * 100 : 0,
        executedQuantity: executedQty,
      };
    });
  }

  /**
   * Obtém a distribuição de custos por categoria
   */
  async getCostDistribution(projectId: string): Promise<CostDistributionItem[]> {
    const unitCosts = await prisma.activityUnitCost.findMany({ where: { projectId } });

    const categoryMap = { "Mão de Obra": 0, "Materiais": 0, "Equipamentos": 0, "Indiretos": 0 };

    unitCosts.forEach((uc: unknown) => {
      const price = Number(uc.unitPrice || 0);
      categoryMap["Mão de Obra"] += price * 0.45;
      categoryMap["Materiais"] += price * 0.3;
      categoryMap["Equipamentos"] += price * 0.15;
      categoryMap["Indiretos"] += price * 0.1;
    });

    return Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }));
  }
}
