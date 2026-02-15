import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function auditLeaders() {
  console.log("--- AUDITANDO LÍDERES DE EQUIPE (MODO ESM) ---");

  try {
    const teamsWithSupervisors = await prisma.team.findMany({
      where: { supervisorId: { not: null } },
      include: { supervisor: { include: { jobFunction: true } } },
    });

    console.log(
      `Encontradas ${teamsWithSupervisors.length} equipes com supervisores.`,
    );

    let fixedCount = 0;

    for (const team of teamsWithSupervisors) {
      const leader = team.supervisor;
      if (!leader) continue;

      if (!leader.jobFunction || !leader.jobFunction.canLeadTeam) {
        console.log(
          `Equipe "${team.name}": Líder "${leader.name}" não tem flag canLeadTeam.`,
        );

        if (leader.functionId) {
          await prisma.jobFunction.update({
            where: { id: leader.functionId },
            data: { canLeadTeam: true },
          });
          fixedCount++;
          console.log(
            `  -> JobFunction "${leader.jobFunction?.name || "Vazio"}" atualizada para canLeadTeam: true`,
          );
        }
      }
    }

    console.log(`--- FIM DA AUDITORIA: ${fixedCount} funções corrigidas. ---`);
  } catch (err) {
    console.error("Erro na auditoria:", err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

auditLeaders();
