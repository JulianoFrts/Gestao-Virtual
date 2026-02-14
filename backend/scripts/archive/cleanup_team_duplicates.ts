import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- LIMPANDO DUPLICIDADE DE MEMBROS ---");

  // 1. Identificar usuários com mais de uma equipe
  const duplicates: any[] = await prisma.$queryRaw`
    SELECT "user_id", COUNT("team_id") as team_count
    FROM "team_members"
    GROUP BY "user_id"
    HAVING COUNT("team_id") > 1;
  `;

  if (duplicates.length > 0) {
    console.log(
      `Encontrados ${duplicates.length} usuários duplicados. Iniciando limpeza...`,
    );

    for (const dup of duplicates) {
      const userId = dup.user_id;

      // Manter apenas a associação mais recente (ou a primeira que encontrar)
      const allAssociations = await prisma.teamMember.findMany({
        where: { userId },
        orderBy: { joinedAt: "desc" },
      });

      if (allAssociations.length > 1) {
        const toKeep = allAssociations[0]; // Mantém a mais recente
        const toDeleteIds = allAssociations.slice(1).map((a) => a.id);

        console.log(
          `- Usuário ${userId}: Mantendo equipe ${toKeep.teamId}, removendo ${toDeleteIds.length} duplicatas.`,
        );

        await prisma.teamMember.deleteMany({
          where: {
            id: { in: toDeleteIds },
          },
        });
      }
    }
    console.log("Limpeza concluída.");
  } else {
    console.log("Nenhuma duplicidade encontrada.");
  }

  // 2. Verificar supervisores que também são membros (opcional: remover da lista de membros se for supervisor da mesma equipe)
  // De acordo com o useTeams.ts, ele já trata isso, mas vamos limpar se estiver no mesmo time.
  const teams = await prisma.team.findMany({
    where: { NOT: { supervisorId: null } },
  });

  for (const team of teams) {
    const isMemberOfSameTeam = await prisma.teamMember.findFirst({
      where: {
        teamId: team.id,
        userId: team.supervisorId!,
      },
    });

    if (isMemberOfSameTeam) {
      console.log(
        `- Removendo supervisor ${team.supervisorId} da lista de membros da própria equipe: ${team.name}`,
      );
      await prisma.teamMember.delete({
        where: { id: isMemberOfSameTeam.id },
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
