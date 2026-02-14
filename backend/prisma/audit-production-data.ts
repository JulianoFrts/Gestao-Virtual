import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function audit() {
  console.log("🔍 Iniciando Auditoria de Dados de Produção...\n");

  // Buscar as etapas que estão com progresso alto ou suspeito
  const stages = await (prisma as any).workStage.findMany({
    where: { productionActivityId: { not: null } },
    include: {
      site: { include: { project: true } },
      progress: { orderBy: { recordedDate: "desc" }, take: 1 },
    },
  });

  for (const stage of stages) {
    const latestProgress = stage.progress[0]?.actualPercentage || 0;
    if (latestProgress > 100 || stage.name.includes("Abertura")) {
      console.log(
        `🚩 Analisando Etapa: [${stage.name}] - Progresso Atual: ${latestProgress}%`,
      );

      const projectId = stage.site?.projectId;
      if (!projectId) {
        console.log("   ❌ Erro: Etapa sem vínculo de projeto.");
        continue;
      }

      // 1. Verificar total de torres no projeto
      const totalTowers = await (prisma as any).towerTechnicalData.count({
        where: { projectId },
      });

      // 2. Verificar registros de status da atividade
      const statuses = await (prisma as any).towerActivityStatus.findMany({
        where: {
          activityId: stage.productionActivityId,
          tower: { projectId },
        },
      });

      const sumProgress = statuses.reduce(
        (acc: number, s: any) => acc + Number(s.progressPercent || 0),
        0,
      );

      console.log(`   📊 Projeto ID: ${projectId}`);
      console.log(`   🗼 Total de Torres no Projeto: ${totalTowers}`);
      console.log(`   📝 Registros de Status Encontrados: ${statuses.length}`);
      console.log(`   ➕ Soma dos Percentuais: ${sumProgress}`);

      if (totalTowers > 0) {
        const calculated = sumProgress / totalTowers;
        console.log(`   🧮 Cálculo (Soma/Total): ${calculated.toFixed(2)}%`);

        if (calculated > 100) {
          console.log("   ⚠️ ALERTA: Cálculo ultrapassou 100%!");
          // Verificar se existem IDs de torres duplicados que não deveriam estar no projeto
          const towerIds = statuses.map((s: any) => s.towerId);
          const uniqueTowerIds = new Set(towerIds);
          if (uniqueTowerIds.size !== towerIds.length) {
            console.log(
              `   ❌ ERRO: Existem ${towerIds.length - uniqueTowerIds.size} registros DUPLICADOS para a mesma torre/atividade!`,
            );
          }
        }
      }
      console.log("--------------------------------------------------\n");
    }
  }
}

audit()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
