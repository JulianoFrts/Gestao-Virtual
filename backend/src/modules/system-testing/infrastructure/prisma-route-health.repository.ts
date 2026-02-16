import { prisma } from "@/lib/prisma/client";
import { RouteHealthRepository, RouteHealthResult } from "../domain/route-health.repository";

export class PrismaRouteHealthRepository implements RouteHealthRepository {
    async saveHistory(result: RouteHealthResult, performerId: string): Promise<void> {
        await (prisma as any).routeHealthHistory.create({
            data: {
                route: result.route,
                status: result.status,
                latency: result.latency,
                code: result.code,
                message: result.message,
                performerId: performerId,
            },
        });
    }
}
