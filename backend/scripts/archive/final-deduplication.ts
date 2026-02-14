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
  console.log("--- INICIANDO DESDUPLICAÇÃO FINAL DE PRODUÇÃO ---");

  // 1. Obter todas as categorias
  const categories = await prisma.productionCategory.findMany({
    include: { activities: true },
  });

  const categoriesByName = new Map<string, (typeof categories)[0][]>();
  for (const cat of categories) {
    const name = cat.name.trim().toUpperCase();
    if (!categoriesByName.has(name)) categoriesByName.set(name, []);
    categoriesByName.get(name)!.push(cat);
  }

  for (const [name, dupes] of categoriesByName.entries()) {
    if (dupes.length <= 1) continue;

    console.log(`\n[CAT] Unificando: ${name} (${dupes.length} ocorrências)`);
    const [master, ...others] = dupes;

    for (const other of others) {
      console.log(`  - Mesclando categoria ID: ${other.id} -> ${master.id}`);

      for (const act of other.activities) {
        const actName = act.name.trim().toUpperCase();

        // Procurar se já existe atividade com mesmo nome na master
        const masterAct = await prisma.productionActivity.findFirst({
          where: {
            categoryId: master.id,
            name: { equals: act.name, mode: "insensitive" },
          },
        });

        if (masterAct) {
          console.log(
            `    [ACT] Unificando Atividade: ${act.name} (IDs: ${act.id} -> ${masterAct.id})`,
          );

          // Mover TODAS as relações da atividade duplicada para a master

          // 1. TowerDailyProduction
          await prisma.towerDailyProduction.updateMany({
            where: { activityId: act.id },
            data: { activityId: masterAct.id },
          });

          // 2. ActivitySchedule
          // Nota: ActivitySchedule costuma ter unique towerId_activityId
          const schedules = await prisma.activitySchedule.findMany({
            where: { activityId: act.id },
          });
          for (const s of schedules) {
            const exists = await prisma.activitySchedule.findFirst({
              where: { towerId: s.towerId, activityId: masterAct.id },
            });
            if (exists) {
              await prisma.activitySchedule.delete({ where: { id: s.id } });
            } else {
              await prisma.activitySchedule.update({
                where: { id: s.id },
                data: { activityId: masterAct.id },
              });
            }
          }

          // 3. TowerActivityStatus
          // Nota: TowerActivityStatus tem unique towerId_activityId
          const statuses = await prisma.towerActivityStatus.findMany({
            where: { activityId: act.id },
          });
          for (const st of statuses) {
            const exists = await prisma.towerActivityStatus.findFirst({
              where: { towerId: st.towerId, activityId: masterAct.id },
            });
            if (exists) {
              // Mover assignments antes de deletar
              await prisma.activityAssignment.updateMany({
                where: { towerStatusId: st.id },
                data: { towerStatusId: exists.id },
              });
              // Mover logs vinculados ao status
              await prisma.towerActivityLog.updateMany({
                where: { towerId: st.towerId, activityId: act.id },
                data: { activityId: masterAct.id },
              });
              await prisma.towerActivityStatus.delete({ where: { id: st.id } });
            } else {
              await prisma.towerActivityStatus.update({
                where: { id: st.id },
                data: { activityId: masterAct.id },
              });
              // Atualizar logs também
              await prisma.towerActivityLog.updateMany({
                where: { towerId: st.towerId, activityId: act.id },
                data: { activityId: masterAct.id },
              });
            }
          }

          // 4. TowerActivityLog (Restantes)
          await prisma.towerActivityLog.updateMany({
            where: { activityId: act.id },
            data: { activityId: masterAct.id },
          });

          // 5. ActivityUnitCost
          // Nota: ActivityUnitCost tem unique projectId_activityId
          const costs = await prisma.activityUnitCost.findMany({
            where: { activityId: act.id },
          });
          for (const c of costs) {
            const exists = await prisma.activityUnitCost.findFirst({
              where: { projectId: c.projectId, activityId: masterAct.id },
            });
            if (exists) {
              await prisma.activityUnitCost.delete({ where: { id: c.id } });
            } else {
              await prisma.activityUnitCost.update({
                where: { id: c.id },
                data: { activityId: masterAct.id },
              });
            }
          }

          // 6. WorkStage
          await prisma.workStage.updateMany({
            where: { productionActivityId: act.id },
            data: { productionActivityId: masterAct.id },
          });

          // Finalmente deletar a atividade duplicada
          await prisma.productionActivity.delete({ where: { id: act.id } });
        } else {
          // Se não existe na master, apenas movemos a atividade para a categoria master
          console.log(
            `    [MOVE] Atividade única: ${act.name} movida para ${master.name}`,
          );
          await prisma.productionActivity.update({
            where: { id: act.id },
            data: { categoryId: master.id },
          });
        }
      }

      // Deletar a categoria duplicada (agora vazia)
      await prisma.productionCategory.delete({ where: { id: other.id } });
    }
  }

  console.log("\n--- SANEAMENTO DE DUPLICATAS CONCLUÍDO COM SUCESSO ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
