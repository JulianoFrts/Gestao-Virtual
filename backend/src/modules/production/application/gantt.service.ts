import { GanttRepository } from "../domain/gantt.repository";

export type GanttNode = {
    id: string;
    name: string;
    parentId: string | null;
    categoryName: string | null;
    weight: number;
    progress: number;
    plannedStart: string | null;
    plannedEnd: string | null;
    plannedQuantity: number;
    plannedHHH: number;
    children: GanttNode[];
};

export class GanttService {
    constructor(private readonly repository: GanttRepository) { }

    public async getGanttData(projectId: string): Promise<GanttNode[]> {
        const [stages, schedules] = await Promise.all([
            this.repository.listWorkStagesByProject(projectId),
            this.repository.listSchedulesByProject(projectId),
        ]);

        const scheduleMap = this.buildScheduleMap(schedules);
        const nodeMap = new Map<string, GanttNode>();
        const roots: GanttNode[] = [];

        // Build flat map of nodes
        for (const stage of stages) {
            const latestProgress = stage.progress?.[0];
            const activityId = stage.productionActivityId;
            const schedule = activityId ? scheduleMap.get(activityId) : undefined;

            const node: GanttNode = {
                id: stage.id,
                name: stage.name,
                parentId: stage.parentId,
                categoryName: stage.productionActivity?.category?.name || null,
                weight: Number(stage.weight || 1),
                progress: Number(latestProgress?.actualPercentage || 0),
                plannedStart: schedule?.start?.toISOString() || null,
                plannedEnd: schedule?.end?.toISOString() || null,
                plannedQuantity: schedule?.quantity || 0,
                plannedHHH: schedule?.hhh || 0,
                children: [],
            };

            nodeMap.set(stage.id, node);
        }

        // Build hierarchy
        for (const node of nodeMap.values()) {
            if (node.parentId && nodeMap.has(node.parentId)) {
                nodeMap.get(node.parentId)!.children.push(node);
            } else {
                roots.push(node);
            }
        }

        // Calculate aggregated progress
        for (const root of roots) {
            this.calculateAggregatedProgress(root);
        }

        return roots;
    }

    private buildScheduleMap(schedules: any[]): Map<string, { start: Date; end: Date; quantity: number; hhh: number }> {
        const scheduleMap = new Map<string, { start: Date; end: Date; quantity: number; hhh: number }>();

        for (const sched of schedules) {
            const existing = scheduleMap.get(sched.activityId);
            const start = new Date(sched.plannedStart);
            const end = new Date(sched.plannedEnd);
            const qty = Number(sched.plannedQuantity || 0);
            const hhh = Number(sched.plannedHHH || 0);

            if (!existing) {
                scheduleMap.set(sched.activityId, { start, end, quantity: qty, hhh });
            } else {
                scheduleMap.set(sched.activityId, {
                    start: start < existing.start ? start : existing.start,
                    end: end > existing.end ? end : existing.end,
                    quantity: existing.quantity + qty,
                    hhh: existing.hhh + hhh,
                });
            }
        }

        return scheduleMap;
    }

    private calculateAggregatedProgress(node: GanttNode): number {
        if (node.children.length === 0) {
            return node.progress;
        }

        let totalWeight = 0;
        let weightedProgress = 0;

        for (const child of node.children) {
            const childProgress = this.calculateAggregatedProgress(child);
            totalWeight += child.weight;
            weightedProgress += child.weight * childProgress;
        }

        if (totalWeight === 0) return 0;
        node.progress = weightedProgress / totalWeight;
        return node.progress;
    }
}
