import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- OTIMIZAÇÃO DE EQUIPES ---");

  // 1. Reclassificar funções de MOI para MOD que não fazem sentido ser indiretas
  const moiToModNames = [
    "APONTADOR",
    "ALMOXARIFE",
    "AUXILIAR DE ALMOXARIFADO",
    "ENCARREGADO DE ARMAÇAO",
    "ENCARREGADO DE MONTAGEM AT",
    "ENCARREGADO DE LANÇAMENTO",
    "ENCARREGADO DE OBRA CIVIL",
  ];

  await prisma.jobFunction.updateMany({
    where: {
      name: { in: moiToModNames },
      description: "MOI",
    },
    data: { description: "MOD" },
  });

  // 2. Garantir que MOI não passe de 120 (Se passar, precisamos de mais lógica)
  const moiUsers = await prisma.$queryRaw<any[]>`
    SELECT COUNT(u.id) FROM users u
    JOIN job_functions f ON u.function_id = f.id
    WHERE f.description = 'MOI';
  `;
  console.log(`\nTotal MOI após reclassificação inicial: ${moiUsers[0].count}`);

  // 3. Alocar funcionários sem equipe
  const unassigned = await prisma.$queryRaw<any[]>`
    SELECT u.id FROM users u
    WHERE u.id NOT IN (SELECT user_id FROM team_members);
  `;
  console.log(`\nAlocando ${unassigned.length} funcionários...`);

  if (unassigned.length > 0) {
    // Buscar uma equipe padrão ou criar uma
    let defaultTeam = await prisma.team.findFirst({
      where: { name: "Apoio Geral" },
    });
    if (!defaultTeam) {
      defaultTeam = await prisma.team.create({
        data: {
          name: "Apoio Geral",
          isActive: true,
          displayOrder: 99,
        },
      });
    }

    const data = unassigned.map((u) => ({
      teamId: defaultTeam!.id,
      userId: u.id,
    }));

    await prisma.teamMember.createMany({
      data,
      skipDuplicates: true,
    });
    console.log(
      `Alocados ${data.length} funcionários na equipe "${defaultTeam.name}".`,
    );
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
