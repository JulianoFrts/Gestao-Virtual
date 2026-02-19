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
    endOfYear
} from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FinancialDataParams {
    projectId: string;
    granularity: 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'total';
    startDate?: string;
    endDate?: string;
}

export class FinancialAnalyticsService {
    async getFinancialData(params: FinancialDataParams) {
        const { projectId, granularity, startDate, endDate } = params;

        // 1. Busca de Dados
        const { towers, categories, unitCosts } = await this.fetchRawData(projectId);
        const costMap = this.buildCostMap(unitCosts);

        // 2. Processamento de Itens Individuais
        const items = this.processTowersToItems(towers, categories, costMap);
        if (items.length === 0) {
            return { curve: [], stats: { budget: 0, earned: 0 }, pareto: [] };
        }

        // 3. Determinação do Intervalo e Filtros
        const { filterStart, filterEnd } = this.resolveDateInterval(items, startDate, endDate);

        // 4. Cálculo de Totais e Pareto
        const { totalBudget, totalEarned, periodActivityCosts } = this.calculateSummaries(items, filterStart, filterEnd);

        // 5. Geração da Curva
        const timeline = this.generateTimeline(filterStart, filterEnd, granularity);
        const curve = timeline.map(period => this.calculatePeriodData(period, items, granularity, filterEnd));

        const pareto = this.generatePareto(periodActivityCosts);

        return { curve, stats: { budget: totalBudget, earned: totalEarned }, pareto };
    }

    private async fetchRawData(projectId: string) {
        const [towers, categories, unitCosts] = await Promise.all([
            prisma.mapElementTechnicalData.findMany({
                where: { projectId, elementType: 'TOWER' },
                include: { activitySchedules: true, mapElementProductionProgress: true }
            }),
            prisma.productionCategory.findMany({ include: { productionActivities: true } }),
            prisma.activityUnitCost.findMany({ where: { projectId } })
        ]);
        return { towers, categories, unitCosts };
    }

    private buildCostMap(unitCosts: any[]) {
        const costMap = new Map<string, number>();
        unitCosts.forEach((uc: any) => costMap.set(uc.activityId, Number(uc.unitPrice || 0)));
        return costMap;
    }

    private processTowersToItems(towers: any[], categories: any[], costMap: Map<string, number>) {
        const items: any[] = [];
        towers.forEach((t: any) => {
            categories.forEach((cat: any) => {
                cat.productionActivities.forEach((act: any) => {
                    const price = costMap.get(act.id) || 0;
                    if (price <= 0) return;

                    const schedule = t.activitySchedules?.find((s: any) => s.activityId === act.id);
                    const status = t.mapElementProductionProgress?.find((s: any) => s.activityId === act.id);

                    if (schedule?.plannedEnd) {
                        items.push({
                            name: act.name,
                            plannedEnd: startOfDay(new Date(schedule.plannedEnd)),
                            actualEnd: status?.endDate ? startOfDay(new Date(status.endDate)) : undefined,
                            cost: Number(schedule.plannedQuantity || 1) * price,
                            isFinished: status?.status === 'FINISHED'
                        });
                    }
                });
            });
        });
        return items;
    }

    private resolveDateInterval(items: any[], startDate?: string, endDate?: string) {
        const allDates = items.flatMap(i => [i.plannedEnd, i.actualEnd].filter(Boolean) as Date[]);
        const minDate = allDates.reduce((a, b) => a < b ? a : b);
        const maxDate = allDates.reduce((a, b) => a > b ? a : b);

        return {
            filterStart: startDate ? startOfDay(new Date(startDate)) : minDate,
            filterEnd: endDate ? endOfDay(new Date(endDate)) : maxDate
        };
    }

    private calculateSummaries(items: any[], filterStart: Date, filterEnd: Date) {
        let totalBudget = 0;
        let totalEarned = 0;
        const periodActivityCosts: Record<string, number> = {};

        items.forEach(item => {
            if (isWithinInterval(item.plannedEnd, { start: filterStart, end: filterEnd })) {
                totalBudget += item.cost;
            }

            if (item.isFinished && item.actualEnd) {
                if (isWithinInterval(item.actualEnd, { start: filterStart, end: filterEnd })) {
                    totalEarned += item.cost;
                }
            }

            const refDate = item.actualEnd || item.plannedEnd;
            if (isWithinInterval(refDate, { start: filterStart, end: filterEnd })) {
                periodActivityCosts[item.name] = (periodActivityCosts[item.name] || 0) + item.cost;
            }
        });

        return { totalBudget, totalEarned, periodActivityCosts };
    }

    private generateTimeline(start: Date, end: Date, granularity: string): Date[] {
        if (granularity === 'weekly') return eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
        if (granularity === 'monthly') return eachMonthOfInterval({ start, end });
        if (granularity === 'quarterly') return eachQuarterOfInterval({ start, end });
        if (granularity === 'annual') return eachYearOfInterval({ start, end });
        return [start];
    }

    private calculatePeriodData(period: Date, items: any[], granularity: string, filterEnd: Date) {
        let periodEnd: Date;
        if (granularity === 'weekly') periodEnd = endOfWeek(period, { weekStartsOn: 1 });
        else if (granularity === 'monthly') periodEnd = endOfMonth(period);
        else if (granularity === 'quarterly') periodEnd = endOfQuarter(period);
        else if (granularity === 'annual') periodEnd = endOfYear(period);
        else periodEnd = filterEnd;

        const plannedAcc = items.filter(i => isBefore(i.plannedEnd, periodEnd)).reduce((acc, curr) => acc + curr.cost, 0);
        const actualAcc = items.filter(i => i.actualEnd && isBefore(i.actualEnd, periodEnd)).reduce((acc, curr) => acc + curr.cost, 0);

        let label: string;
        if (granularity === 'weekly') label = `S${format(period, 'ww')} - ${format(period, 'dd/MM')}`;
        else if (granularity === 'monthly') label = format(period, 'MMM/yy', { locale: ptBR });
        else if (granularity === 'quarterly') label = `${Math.floor(period.getMonth() / 3) + 1}º Trim/${format(period, 'yy')}`;
        else if (granularity === 'annual') label = format(period, 'yyyy');
        else label = 'GERAL';

        return { period: label, planned: plannedAcc, actual: actualAcc };
    }

    private generatePareto(costs: Record<string, number>) {
        return Object.entries(costs)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);
    }
}
