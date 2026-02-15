import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- OPERAÇÃO DE SANEAMENTO RADICAL V7 (LA TESTE) ---");

  // 1. Identificar Projeto
  const project = await prisma.project.findFirst({
    where: { name: "LA TESTE" },
  });
  if (!project) throw new Error("Projeto LA TESTE não encontrado.");
  const companyId = project.companyId!;

  // 2. Coleta de IDs para Exclusão Cirúrgica
  console.log("Mapeando registros dependentes...");
  const towers = await prisma.towerTechnicalData.findMany({
    where: { projectId: project.id },
    select: { id: true },
  });
  const towerIds = towers.map((t) => t.id);

  const logs = await prisma.towerActivityLog.findMany({
    where: { towerId: { in: towerIds } },
    select: { id: true },
  });
  const logIds = logs.map((l) => l.id);

  const activityTeams = await prisma.towerActivityTeam.findMany({
    where: { activityLogId: { in: logIds } },
    select: { id: true },
  });
  const activityTeamIds = activityTeams.map((t) => t.id);

  // 3. Exclusão em Ordem Inversa de Dependência
  console.log("Limpando tabelas de produção (Logs, Times de Campo)...");

  await prisma.towerActivityTeamMember.deleteMany({
    where: { teamId: { in: activityTeamIds } },
  });

  await prisma.towerActivityTeam.deleteMany({
    where: { id: { in: activityTeamIds } },
  });

  await prisma.towerActivityLog.deleteMany({
    where: { id: { in: logIds } },
  });

  const statuses = await prisma.towerActivityStatus.findMany({
    where: { towerId: { in: towerIds } },
    select: { id: true },
  });
  const statusIds = statuses.map((s) => s.id);

  await prisma.activityAssignment.deleteMany({
    where: { towerStatusId: { in: statusIds } },
  });

  console.log("Limpando Produção, Status e Cronogramas...");
  await prisma.towerDailyProduction.deleteMany({
    where: { towerId: { in: towerIds } },
  });
  await prisma.towerActivityStatus.deleteMany({
    where: { id: { in: statusIds } },
  });
  await prisma.activitySchedule.deleteMany({
    where: { towerId: { in: towerIds } },
  });
  await prisma.activityUnitCost.deleteMany({
    where: { projectId: project.id },
  });

  // 4. Unificar Categorias e Atividades (Configuração de Custos)
  console.log("Unificando categorias e atividades mapeadas...");
  const categories = await prisma.productionCategory.findMany({
    include: { activities: true },
  });
  const uniqueCatNames = new Set<string>();

  for (const cat of categories) {
    const name = cat.name.trim().toUpperCase();
    if (uniqueCatNames.has(name)) {
      const targetCat = await prisma.productionCategory.findFirst({
        where: { name: cat.name, id: { not: cat.id } },
      });
      if (targetCat) {
        console.log(`  [CLEAN] Mesclando cat: ${cat.name}`);
        const acts = await prisma.productionActivity.findMany({
          where: { categoryId: cat.id },
        });
        for (const act of acts) {
          const exists = await prisma.productionActivity.findFirst({
            where: { name: act.name, categoryId: targetCat.id },
          });
          if (exists) {
            await prisma.productionActivity.delete({ where: { id: act.id } });
          } else {
            await prisma.productionActivity.update({
              where: { id: act.id },
              data: { categoryId: targetCat.id },
            });
          }
        }
        await prisma.productionCategory.delete({ where: { id: cat.id } });
      }
    } else {
      uniqueCatNames.add(name);
    }
  }

  // 5. Unificar Equipes
  console.log("Unificando equipes...");
  const teams = await prisma.team.findMany({ where: { companyId } });
  const uniqueTeamNames = new Set<string>();

  for (const t of teams) {
    const name = t.name.trim().toUpperCase();
    if (uniqueTeamNames.has(name)) {
      const targetTeam = await prisma.team.findFirst({
        where: { name: t.name, companyId, id: { not: t.id } },
      });
      if (targetTeam) {
        console.log(`  [CLEAN] Mesclando equipe: ${t.name}`);
        const members = await prisma.teamMember.findMany({
          where: { teamId: t.id },
        });
        for (const m of members) {
          const exists = await prisma.teamMember.findFirst({
            where: { teamId: targetTeam.id, userId: m.userId },
          });
          if (exists) {
            await prisma.teamMember.delete({ where: { id: m.id } });
          } else {
            await prisma.teamMember.update({
              where: { id: m.id },
              data: { teamId: targetTeam.id },
            });
          }
        }
        await prisma.team.delete({ where: { id: t.id } });
      }
    } else {
      uniqueTeamNames.add(name);
    }
  }

  // 6. Configurar Lideranças (Funções)
  console.log("Configurando JobFunctions...");
  await prisma.jobFunction.updateMany({
    where: {
      companyId,
      OR: [
        { name: { contains: "ENCARREGADO", mode: "insensitive" } },
        { name: { contains: "LÍDER", mode: "insensitive" } },
        { name: { contains: "COORDENADOR", mode: "insensitive" } },
        { hierarchyLevel: { lte: 4 } },
      ],
    },
    data: { canLeadTeam: true },
  });

  console.log("--- SANEAMENTO V7 CONCLUÍDO! ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
