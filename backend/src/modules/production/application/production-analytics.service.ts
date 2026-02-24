import { prisma } from "@/lib/prisma/client";
import {
  format,
  startOfDay,
  endOfDay,
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

export interface AnalyticsParams {
  projectId: string;
  granularity: "weekly" | "monthly";
  startDate?: string;
  endDate?: string;
  activityId?: string;
}

export class ProductionAnalyticsService {
  /**
   * Gera a Curva S Física baseada em peso unitário (Bottom-up)
   * Migrado de ProductionDashboard.tsx logic
   */
  async getPhysicalProgressCurve(params: AnalyticsParams) {
    const { projectId, granularity, startDate, endDate, activityId } = params;

    // 1. Busca de Dados
    const towers = await prisma.mapElementTechnicalData.findMany({
      where: { projectId, elementType: "TOWER" },
      include: {
        activitySchedules: true,
        mapElementProductionProgress: true,
      },
    });

    if (towers.length === 0) return [];

    // 2. Processamento das Atividades Relevantes
    const relevantActivities: {
      plannedEnd?: Date;
      history: { date: Date; percent: number }[];
    }[] = [];

    towers.forEach((t) => {
      const schedules =
        activityId && activityId !== "all"
          ? t.activitySchedules.filter((s) => s.activityId === activityId)
          : t.activitySchedules;

      const progresses =
        activityId && activityId !== "all"
          ? t.mapElementProductionProgress.filter(
              (p) => p.activityId === activityId,
            )
          : t.mapElementProductionProgress;

      schedules.forEach((sched) => {
        const status = progresses.find(
          (p) => p.activityId === sched.activityId,
        );
        const history: { date: Date; percent: number }[] = [];

        if (status?.history && Array.isArray(status.history)) {
          (status.history as any[]).forEach((h) => {
            const date = h.changedAt || h.timestamp;
            if (date) {
              history.push({
                date: new Date(date),
                percent: h.progressPercent || h.progress || 0,
              });
            }
          });
        } else if (status?.status === "FINISHED" && status.endDate) {
          history.push({
            date: new Date(status.endDate),
            percent: 100,
          });
        }

        relevantActivities.push({
          plannedEnd: sched.plannedEnd ? new Date(sched.plannedEnd) : undefined,
          history,
        });
      });
    });

    if (relevantActivities.length === 0) return [];

    // 3. Determinação do Intervalo de Tempo
    const allDates = [
      ...relevantActivities.map((i) => i.plannedEnd),
      ...relevantActivities.flatMap((i) => i.history.map((h) => h.date)),
    ].filter(Boolean) as Date[];

    if (allDates.length === 0) return [];

    const start = startDate
      ? startOfDay(new Date(startDate))
      : startOfMonth(min(allDates));
    const end = endDate
      ? endOfDay(new Date(endDate))
      : endOfMonth(max(allDates));

    // 4. Geração da Timeline
    let timeline: Date[];
    if (granularity === "weekly") {
      timeline = eachWeekOfInterval(
        { start, end: addWeeks(end, 1) },
        { weekStartsOn: 1 },
      );
    } else {
      timeline = eachMonthOfInterval({ start, end: addMonths(end, 1) });
    }

    // 5. Cálculo Acumulado (Curva S)
    const totalWeight = relevantActivities.length || 1;

    return timeline.map((period) => {
      const periodEnd =
        granularity === "weekly"
          ? endOfWeek(period, { weekStartsOn: 1 })
          : endOfMonth(period);

      // Planejado: quantia de atividades que deveriam estar prontas até periodEnd
      const plannedSum = relevantActivities.reduce((acc, i) => {
        return (
          acc + (i.plannedEnd && isBefore(i.plannedEnd, periodEnd) ? 1 : 0)
        );
      }, 0);

      // Realizado: maior progresso registrado até periodEnd
      const actualSum = relevantActivities.reduce((acc, i) => {
        const historyBefore = i.history.filter((h) =>
          isBefore(h.date, periodEnd),
        );
        if (historyBefore.length === 0) return acc;
        const maxProgress = Math.max(...historyBefore.map((h) => h.percent));
        return acc + maxProgress / 100;
      }, 0);

      const label =
        granularity === "weekly"
          ? `S${format(period, "ww", { locale: ptBR })} - ${format(period, "dd/MM", { locale: ptBR })}`
          : format(period, "MMM/yy", { locale: ptBR });

      return {
        period: label,
        date: period.toISOString(),
        planned: (plannedSum / totalWeight) * 100,
        actual: (actualSum / totalWeight) * 100,
        qtyPlanned: Math.round(plannedSum),
        qtyActual: Math.round(actualSum),
        total: totalWeight,
      };
    });
  }

  /**
   * Calcula dados financeiros (Curva S Financeira e Pareto)
   * Migrada de FinancialAnalyticsService.ts
   */
  async getFinancialData(params: {
    projectId: string;
    granularity: "weekly" | "monthly" | "quarterly" | "annual" | "total";
    startDate?: string;
    endDate?: string;
  }) {
    const { projectId, granularity, startDate, endDate } = params;

    // 1. Busca de Dados
    const [towers, categories, unitCosts] = await Promise.all([
      prisma.mapElementTechnicalData.findMany({
        where: { projectId, elementType: "TOWER" },
        include: {
          activitySchedules: true,
          mapElementProductionProgress: true,
        },
      }),
      prisma.productionCategory.findMany({
        include: { productionActivities: true },
      }),
      prisma.activityUnitCost.findMany({ where: { projectId } }),
    ]);

    const costMap = new Map<string, number>();
    unitCosts.forEach((uc) =>
      costMap.set(uc.activityId, Number(uc.unitPrice || 0)),
    );

    // 2. Processamento de Itens Individuais
    const items: {
      name: string;
      plannedEnd: Date;
      actualEnd?: Date;
      cost: number;
      isFinished: boolean;
    }[] = [];

    towers.forEach((t) => {
      categories.forEach((cat) => {
        cat.productionActivities.forEach((act) => {
          const price = costMap.get(act.id) || 0;
          if (price <= 0) return;

          const schedule = t.activitySchedules?.find(
            (s) => s.activityId === act.id,
          );
          const status = t.mapElementProductionProgress?.find(
            (s) => s.activityId === act.id,
          );

          if (schedule?.plannedEnd) {
            items.push({
              name: act.name,
              plannedEnd: startOfDay(new Date(schedule.plannedEnd)),
              actualEnd: status?.endDate
                ? startOfDay(new Date(status.endDate))
                : undefined,
              cost: Number(schedule.plannedQuantity || 1) * price,
              isFinished: status?.status === "FINISHED",
            });
          }
        });
      });
    });

    if (items.length === 0) {
      return { curve: [], stats: { budget: 0, earned: 0 }, pareto: [] };
    }

    // 3. Determinação do Intervalo e Filtros
    const allDates = items.flatMap(
      (i) => [i.plannedEnd, i.actualEnd].filter(Boolean) as Date[],
    );
    const minDateFound = allDates.reduce((a, b) => (a < b ? a : b));
    const maxDateFound = allDates.reduce((a, b) => (a > b ? a : b));

    const filterStart = startDate
      ? startOfDay(new Date(startDate))
      : minDateFound;
    const filterEnd = endDate ? endOfDay(new Date(endDate)) : maxDateFound;

    // 4. Cálculo de Totais e Pareto
    let totalBudget = 0;
    let totalEarned = 0;
    const periodActivityCosts: Record<string, number> = {};

    items.forEach((item) => {
      if (
        isWithinInterval(item.plannedEnd, {
          start: filterStart,
          end: filterEnd,
        })
      ) {
        totalBudget += item.cost;
      }

      if (item.isFinished && item.actualEnd) {
        if (
          isWithinInterval(item.actualEnd, {
            start: filterStart,
            end: filterEnd,
          })
        ) {
          totalEarned += item.cost;
        }
      }

      const refDate = item.actualEnd || item.plannedEnd;
      if (isWithinInterval(refDate, { start: filterStart, end: filterEnd })) {
        periodActivityCosts[item.name] =
          (periodActivityCosts[item.name] || 0) + item.cost;
      }
    });

    // 5. Geração da Curva
    let timeline: Date[];
    if (granularity === "weekly")
      timeline = eachWeekOfInterval(
        { start: filterStart, end: filterEnd },
        { weekStartsOn: 1 },
      );
    else if (granularity === "monthly")
      timeline = eachMonthOfInterval({ start: filterStart, end: filterEnd });
    else if (granularity === "quarterly")
      timeline = eachQuarterOfInterval({ start: filterStart, end: filterEnd });
    else if (granularity === "annual")
      timeline = eachYearOfInterval({ start: filterStart, end: filterEnd });
    else timeline = [filterStart];

    const curve = timeline.map((period) => {
      let periodEnd: Date;
      if (granularity === "weekly")
        periodEnd = endOfWeek(period, { weekStartsOn: 1 });
      else if (granularity === "monthly") periodEnd = endOfMonth(period);
      else if (granularity === "quarterly") periodEnd = endOfQuarter(period);
      else if (granularity === "annual") periodEnd = endOfYear(period);
      else periodEnd = filterEnd;

      const plannedAcc = items
        .filter((i) => isBefore(i.plannedEnd, periodEnd))
        .reduce((acc, curr) => acc + curr.cost, 0);
      const actualAcc = items
        .filter((i) => i.actualEnd && isBefore(i.actualEnd, periodEnd))
        .reduce((acc, curr) => acc + curr.cost, 0);

      let label: string;
      if (granularity === "weekly")
        label = `S${format(period, "ww")} - ${format(period, "dd/MM")}`;
      else if (granularity === "monthly")
        label = format(period, "MMM/yy", { locale: ptBR });
      else if (granularity === "quarterly")
        label = `${Math.floor(period.getMonth() / 3) + 1}º Trim/${format(period, "yy")}`;
      else if (granularity === "annual") label = format(period, "yyyy");
      else label = "GERAL";

      return { period: label, planned: plannedAcc, actual: actualAcc };
    });

    const pareto = Object.entries(periodActivityCosts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    return {
      curve,
      stats: { budget: totalBudget, earned: totalEarned },
      pareto,
    };
  }

  /**
   * Obtém as métricas gerais de performance (SPI, CPI, HH)
   * Migrada de PerformanceAnalyticsService.ts
   */
  async getPerformanceMetrics(projectId: string) {
    const [schedules, unitCosts, productionProgress, timeRecords] =
      await Promise.all([
        prisma.activitySchedule.findMany({
          where: { mapElementTechnicalData: { projectId } },
        }),
        prisma.activityUnitCost.findMany({ where: { projectId } }),
        prisma.mapElementProductionProgress.findMany({ where: { projectId } }),
        prisma.timeRecord.findMany({
          where: { team: { site: { projectId } } },
        }),
      ]);

    const costMap = new Map<string, number>();
    unitCosts.forEach((uc) =>
      costMap.set(uc.activityId, Number(uc.unitPrice || 0)),
    );

    const now = new Date();
    let totalPV = 0;
    let totalEV = 0;
    let totalPlannedHH = 0;

    schedules.forEach((sched) => {
      const unitPrice = costMap.get(sched.activityId) || 0;
      const plannedQty = Number(sched.plannedQuantity || 0);
      const plannedHH = Number(sched.plannedHhh || 0);

      if (isBefore(new Date(sched.plannedEnd), now)) {
        totalPV += plannedQty * unitPrice;
        totalPlannedHH += plannedHH;
      } else if (isBefore(new Date(sched.plannedStart), now)) {
        const totalDuration =
          new Date(sched.plannedEnd).getTime() -
          new Date(sched.plannedStart).getTime();
        const elapsed = now.getTime() - new Date(sched.plannedStart).getTime();
        const factor = Math.min(1, elapsed / totalDuration);
        totalPV += plannedQty * unitPrice * factor;
        totalPlannedHH += plannedHH * factor;
      }
    });

    const progressMap = new Map<string, number>();
    productionProgress.forEach((pp) => {
      progressMap.set(
        `${pp.elementId}-${pp.activityId}`,
        Number(pp.progressPercent || 0) / 100,
      );
    });

    schedules.forEach((sched) => {
      const progress =
        progressMap.get(`${sched.elementId}-${sched.activityId}`) || 0;
      const unitPrice = costMap.get(sched.activityId) || 0;
      const plannedQty = Number(sched.plannedQuantity || 0);
      totalEV += plannedQty * unitPrice * progress;
    });

    const totalActualHH = timeRecords.length * 8;
    const spi = totalPV > 0 ? totalEV / totalPV : 1;
    const cpi = totalActualHH > 0 ? totalEV / (totalActualHH * 50) : 1;

    return {
      spi: Number(spi.toFixed(2)),
      cpi: Number(cpi.toFixed(2)),
      plannedProgress: totalPV,
      actualProgress: totalEV,
      plannedHH: totalPlannedHH,
      actualHH: totalActualHH,
      plannedCost: totalPV,
      actualCost: totalActualHH * 50,
    };
  }

  /**
   * Obtém desempenho detalhado por equipe
   */
  async getTeamPerformance(projectId: string) {
    const teams = await prisma.team.findMany({
      where: { site: { projectId } },
      include: {
        _count: { select: { timeRecords: true } },
      },
    });

    const production = await prisma.mapElementProductionProgress.findMany({
      where: { projectId },
    });

    return teams.map((team) => {
      const teamProduction = production.filter((p) => {
        const history = p.history as any[];
        return (
          Array.isArray(history) && history.some((h) => h.teamId === team.id)
        );
      });

      const executedQty = teamProduction.length;
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
   * Obtém a distribuição de custos por categoria (Handcrafted Mock Logic)
   */
  async getCostDistribution(projectId: string) {
    const unitCosts = await prisma.activityUnitCost.findMany({
      where: { projectId },
    });

    const categoryMap: Record<string, number> = {
      "Mão de Obra": 0,
      Materiais: 0,
      Equipamentos: 0,
      Indiretos: 0,
    };

    unitCosts.forEach((uc) => {
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
