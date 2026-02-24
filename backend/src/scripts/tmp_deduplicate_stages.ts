import "dotenv/config";
import { prisma } from "../lib/prisma/client";

async function deduplicateWorkStages() {
  console.log("🚀 Iniciando deduplicação de WorkStage...");

  // 1. Buscar todas as etapas
  const stages = await prisma.workStage.findMany({
    include: {
      stageProgress: true,
      subStages: true,
    },
  });

  console.log(`📊 Encontradas ${stages.length} etapas no total.`);

  // 2. Agrupar por chave (Projeto, Site, Pai, Nome)
  const groups = new Map<string, typeof stages>();

  for (const stage of stages) {
    const key = `${stage.projectId}-${stage.siteId || "null"}-${stage.parentId || "root"}-${stage.name.trim().toUpperCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(stage);
  }

  let deletedCount = 0;
  let mergedProgressCount = 0;

  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(
        `🔍 Grupo de duplicatas encontrado: ${key} (${group.length} itens)`,
      );

      // Ordenar por:
      // 1. Quantidade de progresso (decrescente)
      // 2. Data de criação (crescente - mais antigo primeiro)
      const sorted = [...group].sort(
        (a, b) =>
          b.stageProgress.length - a.stageProgress.length ||
          a.createdAt.getTime() - b.createdAt.getTime(),
      );

      const master = sorted[0];
      const slaves = sorted.slice(1);

      for (const slave of slaves) {
        console.log(`  🔗 Mesclando slave ${slave.id} no master ${master.id}`);

        // Mover progressos
        if (slave.stageProgress.length > 0) {
          await prisma.stageProgress.updateMany({
            where: { stageId: slave.id },
            data: { stageId: master.id },
          });
          mergedProgressCount += slave.stageProgress.length;
        }

        // Mover sub-etapas
        if (slave.subStages.length > 0) {
          await prisma.workStage.updateMany({
            where: { parentId: slave.id },
            data: { parentId: master.id },
          });
        }

        // Deletar o slave
        await prisma.workStage.delete({
          where: { id: slave.id },
        });
        deletedCount++;
      }
    }
  }

  console.log(`\n✨ Limpeza concluída!`);
  console.log(`🗑️  Etapas duplicadas removidas: ${deletedCount}`);
  console.log(`📈 Registros de progresso mesclados: ${mergedProgressCount}`);
}

async function deduplicateTowerActivityGoals() {
  console.log("\n🚀 Iniciando deduplicação de TowerActivityGoal...");

  const goals = await prisma.towerActivityGoal.findMany();
  console.log(`📊 Encontrados ${goals.length} metas no total.`);

  const groups = new Map<string, typeof goals>();
  for (const goal of goals) {
    const key = `${goal.projectId}-${goal.parentId || "root"}-${goal.name.trim().toUpperCase()}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(goal);
  }

  let deletedCount = 0;
  for (const [key, group] of groups.entries()) {
    if (group.length > 1) {
      console.log(
        `🔍 Grupo de duplicatas (Metas) encontrado: ${key} (${group.length} itens)`,
      );

      const sorted = [...group].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      const master = sorted[0];
      const slaves = sorted.slice(1);

      for (const slave of slaves) {
        await prisma.towerActivityGoal.delete({ where: { id: slave.id } });
        deletedCount++;
      }
    }
  }
  console.log(`🗑️  Metas duplicadas removidas: ${deletedCount}`);
}

async function runCleanup() {
  await deduplicateWorkStages();
  await deduplicateTowerActivityGoals();
}

runCleanup()
  .catch((e) => {
    console.error("💥 Erro durante a limpeza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
