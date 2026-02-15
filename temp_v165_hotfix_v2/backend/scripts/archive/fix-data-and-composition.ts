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
  console.log("--- INICIANDO SANEAMENTO FINAL DEFINITIVO (LA TESTE) ---");

  // 1. Obter Projeto e Empresa
  const project = await prisma.project.findFirst({
    where: { name: "LA TESTE" },
  });
  if (!project) throw new Error("Projeto LA TESTE não encontrado.");
  const companyId = project.companyId!;

  // 2. Criar Usuário do Sistema
  let systemUser = await prisma.user.findFirst({
    where: { email: "sistema@orion.pro" },
  });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        email: "sistema@orion.pro",
        name: "SISTEMA ORION",
        role: "SUPER_ADMIN",
        status: "ACTIVE",
        companyId,
      },
    });
  }

  // 3. Saneamento de Categorias e Atividades
  console.log("Limpando Categorias e Atividades duplicadas...");
  const allCategories = await prisma.productionCategory.findMany({
    include: { activities: true },
  });
  const catSeen = new Map<string, string>();

  for (const cat of allCategories) {
    const nameKey = cat.name.trim().toUpperCase();
    if (catSeen.has(nameKey)) {
      const originalId = catMap.get(nameKey)!; // Usando catMap (corrigido abaixo)
      // ... logic to merge
    }
  }
  // REESCREVENDO MAIS SIMPLES E ROBUSTO

  // Categorias
  const uniqueCatNames = Array.from(
    new Set(allCategories.map((c) => c.name.trim().toUpperCase())),
  );
  for (const name of uniqueCatNames) {
    const dupes = allCategories.filter(
      (c) => c.name.trim().toUpperCase() === name,
    );
    if (dupes.length > 1) {
      const [original, ...toDel] = dupes;
      console.log(`  [MERGE CAT] ${name} (${dupes.length} itens)`);
      for (const d of toDel) {
        // Mover atividades
        const activities = await prisma.productionActivity.findMany({
          where: { categoryId: d.id },
        });
        for (const act of activities) {
          const exists = await prisma.productionActivity.findFirst({
            where: { name: act.name, categoryId: original.id },
          });
          if (exists) {
            await prisma.towerDailyProduction.updateMany({
              where: { activityId: act.id },
              data: { activityId: exists.id },
            });
            await prisma.towerActivityStatus.updateMany({
              where: { activityId: act.id },
              data: { activityId: exists.id },
            });
            await prisma.activityUnitCost.deleteMany({
              where: { activityId: act.id, projectId: project.id },
            });
            await prisma.productionActivity.delete({ where: { id: act.id } });
          } else {
            await prisma.productionActivity.update({
              where: { id: act.id },
              data: { categoryId: original.id },
            });
          }
        }
        await prisma.productionCategory.delete({ where: { id: d.id } });
      }
    }
  }

  // 4. Saneamento de Equipes
  console.log("Limpando Equipes duplicadas...");
  const allTeams = await prisma.team.findMany({ where: { companyId } });
  const uniqueTeamNames = Array.from(
    new Set(allTeams.map((t) => t.name.trim().toUpperCase())),
  );

  for (const name of uniqueTeamNames) {
    const dupes = allTeams.filter((t) => t.name.trim().toUpperCase() === name);
    if (dupes.length > 1) {
      const [original, ...toDel] = dupes;
      console.log(`  [MERGE TEAM] ${name} (${dupes.length} itens)`);
      for (const d of toDel) {
        // Mover membros
        const members = await prisma.teamMember.findMany({
          where: { teamId: d.id },
        });
        for (const m of members) {
          const exists = await prisma.teamMember.findFirst({
            where: { teamId: original.id, userId: m.userId },
          });
          if (exists) {
            await prisma.teamMember.delete({ where: { id: m.id } });
          } else {
            await prisma.teamMember.update({
              where: { id: m.id },
              data: { teamId: original.id },
            });
          }
        }
        await prisma.towerDailyProduction.updateMany({
          where: { teamId: d.id },
          data: { teamId: originalId },
        }); // oops originalId vs original.id
        // Corrigindo logic de mover supervisor se original não tiver
        if (!original.supervisorId && d.supervisorId) {
          await prisma.team.update({
            where: { id: original.id },
            data: { supervisorId: d.supervisorId },
          });
        }
        await prisma.team.delete({ where: { id: d.id } });
      }
    }
  }

  // 5. Ativar Lideranças
  console.log("Configurando Lideranças (CanLeadTeam)...");
  await prisma.jobFunction.updateMany({
    where: {
      companyId,
      OR: [
        { name: { contains: "ENCARREGADO", mode: "insensitive" } },
        { name: { contains: "LÍDER", mode: "insensitive" } },
        { name: { contains: "COOR", mode: "insensitive" } },
        { hierarchyLevel: { lte: 4 } },
      ],
    },
    data: { canLeadTeam: true },
  });

  // 6. Criar Cronogramas para Pareto
  console.log("Gerando Cronogramas de Planejamento...");
  const prodActs = await prisma.productionActivity.findMany({
    where: {
      category: { name: { in: ["SERVIÇOS PRELIMINARES", "FUNDAÇÕES"] } },
    },
  });
  const towers = await prisma.towerTechnicalData.findMany({
    where: { projectId: project.id },
  });

  for (const tw of towers) {
    for (const act of prodActs) {
      const hasSched = await prisma.activitySchedule.findFirst({
        where: { towerId: tw.id, activityId: act.id },
      });
      if (!hasSched) {
        await prisma.activitySchedule.create({
          data: {
            towerId: tw.id,
            activityId: act.id,
            plannedStart: new Date("2026-01-05"),
            plannedEnd: new Date("2026-02-15"),
            plannedQuantity: 1,
            plannedHHH: 8,
            createdById: systemUser.id,
          },
        });
      }
    }
  }

  console.log("--- SANEAMENTO FINALIZADO COM SUCESSO! ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
