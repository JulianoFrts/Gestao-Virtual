import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not defined");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function sync() {
  console.log("🔄 Iniciando sincronização de progresso físico...\n");

  const stages = await (prisma as any).workStage.findMany({
    where: { productionActivityId: { not: null } },
    include: { site: true },
  });

  for (const stage of stages) {
    if (!stage.productionActivityId) continue;

    const projectId = stage.site?.projectId;
    if (!projectId) {
      console.log(
        `⚠️ Ignorando [${stage.name}]: Obra ou Trecho sem Vínculo de Projeto.`,
      );
      continue;
    }

    // 1. Total de Torres do Projeto
    const totalTowers = await prisma.mapElementTechnicalData.count({
      where: { projectId, elementType: 'TOWER' },
    });

    // 2. Soma de progresso da atividade
    const sumResult = await prisma.mapElementProductionProgress.aggregate({
      where: {
        activityId: stage.productionActivityId,
        projectId: projectId
      },
      _sum: { progressPercent: true },
    });

    const totalSum = Number(sumResult._sum.progressPercent || 0);
    const avgProgress = totalTowers > 0 ? totalSum / totalTowers : 0;

    console.log(
      `📈 [${stage.name}] -> Atividade: ${stage.productionActivityId}`,
    );
    console.log(
      `   Progresso Calculado: ${avgProgress.toFixed(2)}% (${totalSum}/${totalTowers} torres)`,
    );

    // 3. Atualizar ou Criar StageProgress para hoje
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.stageProgress.findFirst({
        where: { stageId: stage.id, recordedDate: today },
    });

    if (existing) {
        await prisma.stageProgress.update({
        where: { id: existing.id },
        data: { actualPercentage: avgProgress },
        });
    } else {
        await prisma.stageProgress.create({
        data: {
            stageId: stage.id,
            actualPercentage: avgProgress,
            recordedDate: today,
            notes: "Sincronização Automática",
        },
        });
    }
  }

  console.log("\n✅ Sincronização Concluída.");
}

sync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
