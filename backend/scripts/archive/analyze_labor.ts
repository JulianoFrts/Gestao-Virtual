import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- ANÁLISE DE MÃO DE OBRA ---");

  // 1. Contagem atual
  const users = await prisma.user.findMany({
    select: {
      id: true,
      jobFunction: true,
      laborType: true,
    },
  });

  const moiCount = users.filter((u) => u.laborType === "MOI").length;
  const modCount = users.filter((u) => u.laborType === "MOD").length;
  console.log(`Atual: MOI=${moiCount}, MOD=${modCount}`);

  // 2. Listar funções MOI
  const moiFunctions = [
    ...new Set(
      users.filter((u) => u.laborType === "MOI").map((u) => u.jobFunction),
    ),
  ];
  console.log("\nFunções MOI atuais:");
  console.log(moiFunctions);

  // 3. Identificar funcionários sem equipe
  const members = await prisma.teamMember.findMany({
    select: { userId: true },
  });
  const assignedUserIds = new Set(members.map((m) => m.userId));

  const unassignedUsers = users.filter((u) => !assignedUserIds.has(u.id));
  console.log(`\nFuncionários sem equipe: ${unassignedUsers.length}`);

  // 4. Detalhes dos não alocados
  const unassignedByRole = unassignedUsers.reduce(
    (acc, u) => {
      const role = u.jobFunction || "N/A";
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  console.log("\nNão alocados por função:");
  console.log(unassignedByRole);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
