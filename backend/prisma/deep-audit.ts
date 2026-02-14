import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function deepAudit() {
  console.log(
    '🔍 Auditoria Profunda: Investigando "Abertura de Acessos" (200%)...\n',
  );

  const activityName = "Abertura de Acessos";

  // 1. Achar a atividade e suas categorias
  const activity = await prisma.productionActivity.findFirst({
    where: { name: { contains: activityName, mode: "insensitive" } },
  });

  if (!activity) {
    console.log("❌ Atividade não encontrada.");
    return;
  }

  console.log(`✅ Atividade ID: ${activity.id} (${activity.name})`);

  // 2. Achar WorkStages vinculadas
  const stages = await (prisma as any).workStage.findMany({
    where: { productionActivityId: activity.id },
    include: { site: true },
  });

  console.log(`📝 Encontradas ${stages.length} etapas de obra vinculadas.`);

  for (const stage of stages) {
    console.log(`\n--- Analisando Etapa: [${stage.id}] ${stage.name} ---`);
    console.log(`📍 Site: ${stage.site?.name} (ID: ${stage.siteId})`);
    const projectId = stage.site?.projectId;
    console.log(`🏗️ Projeto: ${projectId}`);

    // 3. Contar torres do projeto
    const towerCount = await (prisma as any).towerTechnicalData.count({
      where: { projectId },
    });
    console.log(`🗼 Torres no Projeto (DB Count): ${towerCount}`);

    // 4. Listar Status de Atividade
    const statuses = await (prisma as any).towerActivityStatus.findMany({
      where: {
        activityId: activity.id,
        tower: { projectId },
      },
      include: { tower: true },
    });

    console.log(`📝 Registros de Status (Actual Rows): ${statuses.length}`);

    let sum = 0;
    const towerTracker = new Set();
    const duplicates = [];

    for (const s of statuses) {
      sum += Number(s.progressPercent || 0);
      if (towerTracker.has(s.towerId)) {
        duplicates.push(s);
      }
      towerTracker.add(s.towerId);

      if (Number(s.progressPercent) > 100) {
        console.log(
          `   ⚠️ VALOR INVÁLIDO: Torre ${s.tower.objectId} tem ${s.progressPercent}%`,
        );
      }
    }

    console.log(`➕ Soma Real dos Progressos: ${sum}`);
    if (towerCount > 0) {
      console.log(`🧮 Percentual Calculado: ${(sum / towerCount).toFixed(2)}%`);
    }

    if (duplicates.length > 0) {
      console.log(
        `❌ ERRO: Encontradas ${duplicates.length} duplicatas na mesma torre!`,
      );
      duplicates.forEach((d) => console.log(`   - Torre ID: ${d.towerId}`));
    }

    // 5. Verificar o valor gravado na StageProgress
    const progress = await (prisma as any).stageProgress.findFirst({
      where: { stageId: stage.id },
      orderBy: { recordedDate: "desc" },
    });

    console.log(
      `💾 Valor gravado no Banco (StageProgress): ${progress?.actualPercentage || 0}%`,
    );
  }
}

deepAudit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
