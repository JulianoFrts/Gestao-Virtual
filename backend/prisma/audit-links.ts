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

async function audit() {
  console.log("🔍 Iniciando Auditoria Completa de Vínculos...\n");

  const linkedStages = await prisma.workStage.findMany({
    where: { productionActivityId: { not: null } },
    include: { productionActivity: true },
  });

  console.log(`🔗 Etapas Vinculadas à Produção: ${linkedStages.length}\n`);

  for (const stage of linkedStages) {
    if (!stage.productionActivityId) continue;

    // Progressos lançados nas torres (Elementos)
    const towerCount = await prisma.mapElementProductionProgress.count({
      where: { activityId: stage.productionActivityId },
    });

    // Lançamentos de HH (Relatórios Diários - Aproximação por elementos ativos)
    const hhCount = await prisma.mapElementProductionProgress.count({
      where: { 
          activityId: stage.productionActivityId,
          currentStatus: { not: 'PENDING' }
      },
    });

    // Configuração de Custo
    const unitCost = await prisma.activityUnitCost.findFirst({
      where: { activityId: stage.productionActivityId },
    });

    // Agendamento (Planejado)
    const scheduleCount = await prisma.activitySchedule.count({
      where: { activityId: stage.productionActivityId },
    });

    // Sincronização com o Avanço Físico (StageProgress)
    const lastProgress = await prisma.stageProgress.findFirst({
      where: { stageId: stage.id },
      orderBy: { recordedDate: "desc" },
    });

    const status = towerCount > 0 ? "🟢 ATIVA" : "⚪️ INATIVA";
    const syncStatus = lastProgress
      ? `✅ SINCRONIZADA (${lastProgress.actualPercentage.toFixed(2)}%)`
      : "❌ NÃO SINCRONIZADA";
    const costStatus = unitCost
      ? `💰 R$ ${unitCost.unitPrice}/un`
      : "⚠️ SEM CUSTO";
    const hhStatus = hhCount > 0 ? `👷 ${hhCount} RDOs` : "⌛️ SEM HH";

    console.log(`[${stage.name}]`);
    console.log(
      `   - Produção: ${status} (${towerCount} torres) | HH: ${hhStatus}`,
    );
    console.log(`   - Avanço:   ${syncStatus}`);
    console.log(
      `   - Custo:    ${costStatus} | Planejado: ${scheduleCount > 0 ? "✅" : "❌"}`,
    );
    console.log("---------------------------------------------------------");
  }

  console.log("\n📊 Resumo Final:");
  const totalProductionActivities = await prisma.productionActivity.count();
  const untrackedActivities = await prisma.productionActivity.findMany({
    where: { workStages: { none: {} } },
  });

  console.log(
    `- Total de Atividades de Produção: ${totalProductionActivities}`,
  );
  console.log(
    `- Atividades NÃO rastreadas no cronograma: ${untrackedActivities.length}`,
  );
  untrackedActivities.forEach((a) =>
    console.log(`   ⚠️ [${a.name}] não possui vínculo com nenhuma etapa!`),
  );

  console.log("\n✅ Auditoria Finalizada.");
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
