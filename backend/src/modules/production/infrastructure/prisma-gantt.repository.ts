import { prisma } from "@/lib/prisma/client";
import { GanttRepository } from "../domain/gantt.repository";

export class PrismaGanttRepository implements GanttRepository {
    async listWorkStagesByProject(projectId: string): Promise<any[]> {
        return prisma.workStage.findMany({
            where: {
                OR: [{ projectId }, { site: { projectId } }],
            },
            include: {
                stageProgress: {
                    orderBy: { recordedDate: "desc" },
                    take: 1,
                },
                activity: {
                    include: {
                        productionCategory: true,
                    },
                },
            },
            orderBy: { displayOrder: "asc" },
        });
    }

    async listSchedulesByProject(projectId: string): Promise<any[]> {
        return prisma.activitySchedule.findMany({
            where: {
                mapElementTechnicalData: { projectId },
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
