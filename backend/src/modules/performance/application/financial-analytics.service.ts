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

        // 1. Fetch all necessary data from the project
        const [Towers, categories, unitCosts] = await Promise.all([
            prisma.tower.findMany(
                {
                where: { projectId },
                include: {
                    activitySchedules: true,
                    activityStatuses: true
                }
            }),
            prisma.productionCategory.findMany({
                include: {
                    activities: true
                }
            }),
            prisma.activityUnitCost.findMany({
                where: { projectId }
            })
        ]);

        const costMap = new Map<string, number>();
        unitCosts.forEach((uc: any) => costMap.set(uc.activityId, Number(uc.unitPrice || 0)));

        const items: {
            name: string;
            plannedEnd: Date;
            actualEnd?: Date;
            cost: number;
            isFinished: boolean;
        }[] = [];

        Towers.forEach((t: any) => {
            categories.forEach((cat: any) => {
                cat.activities.forEach((act: any) => {
                    const price = costMap.get(act.id) || 0;
                    if (price <= 0) return;

                    const schedule = t.activitySchedules?.find((s: any) => s.activityId === act.id);
                    const status = t.activityStatuses?.find((s: any) => s.activityId === act.id);

                    if (schedule && schedule.plannedEnd) {
                        const qty = Number(schedule.plannedQuantity || 1);
                        const itemValue = qty * price;

                        items.push({
                            name: act.name,
                            plannedEnd: startOfDay(new Date(schedule.plannedEnd)),
                            actualEnd: status?.endDate ? startOfDay(new Date(status.endDate)) : undefined,
                            cost: itemValue,
                            isFinished: status?.status === 'FINISHED'
                        });
                    }
                });
            });
        });

        if (items.length === 0) {
            return { curve: [], stats: { budget: 0, earned: 0 }, pareto: [] };
        }

        // 2. Define Time Range
        const allDates = items.flatMap(i => [i.plannedEnd, i.actualEnd].filter(Boolean) as Date[]);
        const minDate = allDates.reduce((a, b) => a < b ? a : b);
        const maxDate = allDates.reduce((a, b) => a > b ? a : b);

        const filterStart = startDate ? startOfDay(new Date(startDate)) : minDate;
        const filterEnd = endDate ? endOfDay(new Date(endDate)) : maxDate;

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

        // 3. Generate Curve
        let timeline: Date[];
        if (granularity === 'weekly') {
            timeline = eachWeekOfInterval({ start: filterStart, end: filterEnd }, { weekStartsOn: 1 });
        } else if (granularity === 'monthly') {
            timeline = eachMonthOfInterval({ start: filterStart, end: filterEnd });
        } else if (granularity === 'quarterly') {
            timeline = eachQuarterOfInterval({ start: filterStart, end: filterEnd });
        } else if (granularity === 'annual') {
            timeline = eachYearOfInterval({ start: filterStart, end: filterEnd });
        } else {
            timeline = [filterStart];
        }

        const curve = timeline.map((period) => {
            let periodEnd: Date;
            if (granularity === 'weekly') periodEnd = endOfWeek(period, { weekStartsOn: 1 });
            else if (granularity === 'monthly') periodEnd = endOfMonth(period);
            else if (granularity === 'quarterly') periodEnd = endOfQuarter(period);
            else if (granularity === 'annual') periodEnd = endOfYear(period);
            else periodEnd = filterEnd;

            const plannedAcc = items
                .filter(i => isBefore(i.plannedEnd, periodEnd))
                .reduce((acc, curr) => acc + curr.cost, 0);

            const actualAcc = items
                .filter(i => i.actualEnd && isBefore(i.actualEnd, periodEnd))
                .reduce((acc, curr) => acc + curr.cost, 0);

            let label: string;
            if (granularity === 'weekly') label = `S${format(period, 'ww')} - ${format(period, 'dd/MM')}`;
            else if (granularity === 'monthly') label = format(period, 'MMM/yy', { locale: ptBR });
            else if (granularity === 'quarterly') label = `${Math.floor(period.getMonth() / 3) + 1}º Trim/${format(period, 'yy')}`;
            else if (granularity === 'annual') label = format(period, 'yyyy');
            else label = 'GERAL';

            return {
                period: label,
                planned: plannedAcc,
                actual: actualAcc
            };
        });

        const pareto = Object.entries(periodActivityCosts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        return {
            curve,
            stats: { budget: totalBudget, earned: totalEarned },
            pareto
        };
    }
}
