import { prisma } from "@/lib/prisma/client";

/**
 * Handler para processar atualizações da matriz de permissões.
 * Usado em modo síncrono durante desenvolvimento (sem worker).
 */
export class PermissionMatrixHandler {
    async handle(updates: Array<any>) {
        if (!updates || updates.length === 0) return;

        // Usar transação para evitar bloqueios longos e garantir atomicidade
        await prisma.$transaction(
            updates.map((update) => {
                const levelId = update.levelId || update.level_id;
                const moduleId = update.moduleId || update.module_id;
                const isGranted = update.isGranted !== undefined ? update.isGranted : update.is_granted;

                return prisma.permissionMatrix.upsert({
                    where: {
                        levelId_moduleId: {
                            levelId: levelId,
                            moduleId: moduleId,
                        },
                    },
                    update: { isGranted: isGranted },
                    create: {
                        levelId: levelId,
                        moduleId: moduleId,
                        isGranted: isGranted,
                    },
                });
            })
        );
    }
}
