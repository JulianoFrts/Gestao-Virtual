import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- VERIFICANDO DUPLICIDADE DE MEMBROS ---");

  const duplicates = await prisma.$queryRaw`
    SELECT "user_id", COUNT("team_id") as team_count, array_agg("team_id") as teams
    FROM "team_members"
    GROUP BY "user_id"
    HAVING COUNT("team_id") > 1;
  `;

  if (Array.isArray(duplicates) && duplicates.length > 0) {
    console.log(
      `Detectados ${duplicates.length} usuários em múltiplas equipes:`,
    );
    for (const dup of duplicates) {
      const user = await prisma.user.findUnique({
        where: { id: dup.user_id },
        select: { name: true, email: true },
      });

      const teamNames = await prisma.team.findMany({
        where: { id: { in: dup.teams } },
        select: { name: true },
      });

      console.log(
        `- Usuário: ${user?.name || "Vazio"} (${user?.email || dup.user_id})`,
      );
      console.log(
        `  Equipes (${dup.team_count}): ${teamNames.map((t) => t.name).join(", ")}`,
      );
    }
  } else {
    console.log("Nenhum membro duplicado encontrado na tabela team_members.");
  }

  // Verificar também se o supervisor de uma equipe é membro de outra (ou da mesma)
  console.log("\n--- VERIFICANDO SUPERVISORES QUE TAMBÉM SÃO MEMBROS ---");
  const teamsWithSupervisors = await prisma.team.findMany({
    where: { NOT: { supervisorId: null } },
    select: { id: true, name: true, supervisorId: true },
  });

  for (const team of teamsWithSupervisors) {
    const isMember = await prisma.teamMember.findFirst({
      where: { userId: team.supervisorId! },
    });

    if (isMember) {
      const user = await prisma.user.findUnique({
        where: { id: team.supervisorId! },
        select: { name: true },
      });
      console.log(
        `- Alerta: ${user?.name || "Vazio"} é SUPERVISOR da equipe "${team.name}" e também está na lista de membros (ou de outra equipe).`,
      );
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
