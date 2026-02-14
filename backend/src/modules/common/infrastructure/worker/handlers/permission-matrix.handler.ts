import { prisma } from "@/lib/prisma/client";

/**
 * Handler para processar atualizações da matriz de permissões.
 * Usado em modo síncrono durante desenvolvimento (sem worker).
 */
export class PermissionMatrixHandler {
    async handle(updates: Array<{ level_id: string; module_id: string; is_granted: boolean }>) {
        for (const update of updates) {
            await prisma.permissionMatrix.upsert({
                where: {
                    levelId_moduleId: {
                        levelId: update.level_id,
                        moduleId: update.module_id,
                    },
                },
                update: {
                    isGranted: update.is_granted,
                },
                create: {
                    levelId: update.level_id,
                    moduleId: update.module_id,
                    isGranted: update.is_granted,
                },
            });
        }
    }
}
