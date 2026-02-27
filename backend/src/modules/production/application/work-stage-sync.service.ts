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
                OR: [
                    { siteId: siteId || null },
                    { siteId: null }
                ]
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

        // 3. Função recursiva para calcular o progresso na memória
        const calculatedProgress = new Map<string, number>();

        const calculateProgress = (nodeId: string): number => {
            const node = stageMap.get(nodeId);
            if (!node) return 0;
            
            // Se não tiver filhos, apenas retornamos o progresso atual.
            if (node.children.length === 0) {
                calculatedProgress.set(node.id, node.actualPercentage);
                return node.actualPercentage;
            }

            // Se tiver filhos, calculamos a média ponderada
            let totalWeight = 0;
            let totalWeightedProgress = 0;

            for (const child of node.children) {
                const childProgress = calculateProgress(child.id);
                const weight = Number(child.weight) || 0;

                totalWeight += weight;
                totalWeightedProgress += childProgress * weight;
            }

            const aggregatedProgress = totalWeight > 0 ? totalWeightedProgress / totalWeight : 0;
            const finalProgress = Math.min(100, aggregatedProgress);

            calculatedProgress.set(node.id, finalProgress);
            return finalProgress;
        };

        // Iniciar cálculo a partir das raízes
        for (const rootId of rootIds) {
            calculateProgress(rootId);
        }

        // 4. Persistir progresso agregado em lote (SELECT UPDATE)
        await this.persistProgressBatch(calculatedProgress);

        logger.info(`[WorkStageSyncService] Sincronização recursiva concluída`, { projectId, siteId });
    }

    private async persistProgressBatch(calculatedProgress: Map<string, number>) {
        if (calculatedProgress.size === 0) return;

        const today = this.timeProvider ? this.timeProvider.now() : this.timeProvider.now();
        today.setHours(0, 0, 0, 0);

        const stageIds = Array.from(calculatedProgress.keys());

        // SELECT: Buscar progresso de hoje para todas as etapas calculadas
        const existingProgresses = await prisma.stageProgress.findMany({
            where: {
                stageId: { in: stageIds },
                recordedDate: today
            }
        });

        const existingMap = new Map(existingProgresses.map(p => [p.stageId, p]));

        const toCreate = [];
        const toUpdate: { id: string, actualPercentage: number }[] = [];

        for (const [stageId, progress] of calculatedProgress.entries()) {
            const existing = existingMap.get(stageId);
            
            if (existing) {
                // UPDATE PRE-CHECK: Evita atualizar se a diferença for irrisória (falso update)
                if (Math.abs(Number(existing.actualPercentage) - progress) > 0.01) {
                    toUpdate.push({
                        id: existing.id,
                        actualPercentage: progress
                    });
                }
            } else {
                toCreate.push({
                    stageId,
                    actualPercentage: progress,
                    recordedDate: today,
                    notes: "Agregação Ponderada (Recursive Sync)"
                });
            }
        }

        const transactions: unknown[] = [];

        // Inserções em Lote (createMany)
        if (toCreate.length > 0) {
            transactions.push(
                prisma.stageProgress.createMany({
                    data: toCreate,
                    skipDuplicates: true
                })
            );
        }

        // Atualizações em Lote ($transaction com múltiplos updates)
        for (const update of toUpdate) {
            transactions.push(
                prisma.stageProgress.update({
                    where: { id: update.id },
                    data: { 
                        actualPercentage: update.actualPercentage,
                        notes: "Agregação Ponderada (Recursive Sync)"
                    }
                })
            );
        }

        if (transactions.length > 0) {
            await prisma.$transaction(transactions);
            logger.info(`[WorkStageSyncService] Persistência em lote concluída: ${toCreate.length} novos, ${toUpdate.length} atualizados.`);
        } else {
            logger.info(`[WorkStageSyncService] Nenhum progresso novo ou alterado para persistir (Pre-check validou ausência de mudanças).`);
        }
    }
}
