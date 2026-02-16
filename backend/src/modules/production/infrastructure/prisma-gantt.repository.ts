import { prisma } from "@/lib/prisma/client";
import { GanttRepository } from "../domain/gantt.repository";

export class PrismaGanttRepository implements GanttRepository {
    async listWorkStagesByProject(projectId: string): Promise<any[]> {
        return prisma.workStage.findMany({
            where: {
                OR: [{ projectId }, { site: { projectId } }],
            },
            include: {
                progress: {
                    orderBy: { recordedDate: "desc" },
                    take: 1,
                },
                productionActivity: {
                    include: {
                        category: true,
                    },
                },
            },
            orderBy: { displayOrder: "asc" },
        });
    }

    async listSchedulesByProject(projectId: string): Promise<any[]> {
        return prisma.activitySchedule.findMany({
            where: {
                element: { projectId },
            },
            select: {
                activityId: true,
                plannedStart: true,
                plannedEnd: true,
                plannedQuantity: true,
                plannedHHH: true,
            },
        });
    }
}
