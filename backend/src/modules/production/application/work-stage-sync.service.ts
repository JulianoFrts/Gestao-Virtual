import { prisma } from "@/lib/prisma/client";
import { logger } from "@/lib/utils/logger";
import { WorkStage } from "@prisma/client";

interface SyncNode extends WorkStage {
    children: SyncNode[];
    actualPercentage: number;
}

export class WorkStageSyncService {
    /**
     * Sincroniza o progresso de todas as etapas (pais e filhos)
     * Realiza a agregação ponderada de baixo para cima (Bottom-up)
     */
    async syncAllStages(projectId: string, siteId?: string) {
        logger.info(`[WorkStageSyncService] Iniciando sincronização recursiva`, { projectId, siteId });

        // 1. Buscar todas as etapas do projeto/canteiro
        const stages = await prisma.workStage.findMany({
            where: {
                projectId,
                siteId: siteId || null
            },
            include: {
                stageProgress: {
                    orderBy: { recordedDate: "desc" },
                    take: 1
                }
            }
        });

        if (stages.length === 0) return;

        // 2. Construir mapa e identificar raízes
        const stageMap = new Map<string, SyncNode>();
        const rootIds: string[] = [];

        stages.forEach(s => {
            stageMap.set(s.id, {
                ...s,
                children: [],
                actualPercentage: Number(s.stageProgress[0]?.actualPercentage || 0)
            });
        });

        stages.forEach(s => {
            if (s.parentId && stageMap.has(s.parentId)) {
                stageMap.get(s.parentId)!.children.push(stageMap.get(s.id)!);
            } else {
                rootIds.push(s.id);
            }
        });

        // 3. Função recursiva para calcular e persistir progresso
        const calculateAndPersist = async (nodeId: string): Promise<number> => {
            const node = stageMap.get(nodeId);
            if (!node) return 0;
            
            // Se não tiver filhos, apenas retornamos o progresso atual.
            if (node.children.length === 0) {
                return node.actualPercentage;
            }

            // Se tiver filhos, calculamos a média ponderada
            let totalWeight = 0;
            let totalWeightedProgress = 0;

            for (const child of node.children) {
                const childProgress = await calculateAndPersist(child.id);
                const weight = Number(child.weight) || 0;

                totalWeight += weight;
                totalWeightedProgress += childProgress * weight;
            }

            const aggregatedProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
            const finalProgress = Math.min(100, aggregatedProgress);

            // 4. Persistir progresso agregado
            await this.updateStageProgress(node.id, finalProgress);

            return finalProgress;
        };

        // Iniciar cálculo a partir das raízes
        for (const rootId of rootIds) {
            await calculateAndPersist(rootId);
        }

        logger.info(`[WorkStageSyncService] Sincronização recursiva concluída`, { projectId, siteId });
    }

    private async updateStageProgress(stageId: string, progress: number) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Buscar progresso de hoje
        const existing = await prisma.stageProgress.findFirst({
            where: { stageId, recordedDate: today }
        });

        if (existing) {
            // Só atualizar se o progresso mudou significativamente
            if (Math.abs(Number(existing.actualPercentage) - progress) > 0.01) {
                await prisma.stageProgress.update({
                    where: { id: existing.id },
                    data: { 
                        actualPercentage: progress,
                        notes: "Agregação Ponderada (Recursive Sync)"
                    }
                });
            }
        } else {
            await prisma.stageProgress.create({
                data: {
                    stageId,
                    actualPercentage: progress,
                    recordedDate: today,
                    notes: "Agregação Ponderada (Recursive Sync)"
                }
            });
        }
    }
}
