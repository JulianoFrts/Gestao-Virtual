import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- OTIMIZAÇÃO ORGANIZACIONAL ---");

  // 1. Identificar funções que devem ser MOD (Operacional direto)
  // Baseando-se no que geralmente é considerado Mão de Obra Direta em obras de transmissão
  const directFunctions = [
    "MONTADOR",
    "AUXILIAR DE MONTAGEM",
    "PEDREIRO",
    "AUXILIAR DE PEDREIRO",
    "ARMADOR",
    "CARPINTEIRO",
    "SERVENTE",
    "ELETRICISTA",
    "MOTORISTA",
    "OPERADOR DE MUNCK",
    "OPERADOR DE MOTONIVELADORA",
    "OPERADOR DE RETROESCAVADEIRA",
    "TOPÓGRAFO",
    "AUXILIAR DE TOPOGRAFIA",
    "MARTELETEIRO",
  ];

  console.log("Reclassificando cargos indevidamente em MOI...");
  await prisma.jobFunction.updateMany({
    where: {
      OR: [
        { name: { in: directFunctions } },
        { name: { contains: "MONTADOR", mode: "insensitive" } },
        { name: { contains: "AJUDANTE", mode: "insensitive" } },
        { name: { contains: "ENCARREGADO", mode: "insensitive" } },
      ],
    },
    data: { description: "MOD" },
  });

  // 2. Limitar MOI em no máximo 120
  const moiUsers = await prisma.user.findMany({
    where: { jobFunction: { description: "MOI" } },
    select: { id: true, name: true, jobFunction: { select: { name: true } } },
  });

  console.log(`\nColaboradores em MOI: ${moiUsers.length}`);

  if (moiUsers.length > 120) {
    console.log("Otimizando excedente de MOI para MOD...");
    // Priorizaremos manter em MOI funções puramente administrativas (Engenheiros Seniors, Adm, Financeiro)
    // Funções de apoio técnico de campo podem ir para MOD se necessário
    const fieldSupport = [
      "TÉCNICO",
      "ENCARREGADO",
      "FISCAL",
      "AUXILIAR TÉCNICO",
    ];

    const usersToReclassify = moiUsers
      .filter((u) =>
        fieldSupport.some((fs) =>
          u.jobFunction?.name.toUpperCase().includes(fs),
        ),
      )
      .slice(0, moiUsers.length - 120);

    for (const user of usersToReclassify) {
      // Na verdade, alteramos a FUNÇÃO, mas se a função serve para vários,
      // o ideal é garantir que a função seja MOD.
    }

    // Simplificando: Garantir que funções de supervisão de campo sejam MOD
    await prisma.jobFunction.updateMany({
      where: {
        description: "MOI",
        OR: [
          { name: { contains: "ENCARREGADO", mode: "insensitive" } },
          { name: { contains: "TÉCNICO", mode: "insensitive" } },
          { name: { contains: "GESTOR", mode: "insensitive" } },
        ],
      },
      data: { description: "MOD" },
    });
  }

  // 3. Alocar funcionários sem equipes
  const unassigned = await prisma.$queryRaw<any[]>`
    SELECT id FROM users 
    WHERE id NOT IN (SELECT user_id FROM team_members);
  `;
  console.log(
    `\nDetectados ${unassigned.length} funcionários sem equipe. Alocando...`,
  );

  if (unassigned.length > 0) {
    // Alocar em blocos de 10 em novas equipes genéricas ou existentes
    const batchSize = 10;
    for (let i = 0; i < unassigned.length; i += batchSize) {
      const batch = unassigned.slice(i, i + batchSize);
      const teamName = `Equipe de Apoio ${Math.floor(i / batchSize) + 1}`;

      let team = await prisma.team.findFirst({ where: { name: teamName } });
      if (!team) {
        team = await prisma.team.create({
          data: { name: teamName, isActive: true },
        });
      }

      const teamMembersData = batch.map((u) => ({
        teamId: team!.id,
        userId: u.id,
      }));

      await prisma.teamMember.createMany({
        data: teamMembersData,
        skipDuplicates: true,
      });
    }
  }

  const finalMoiCount = await prisma.user.count({
    where: { jobFunction: { description: "MOI" } },
  });
  console.log(`\n--- RESULTADO FINAL ---`);
  console.log(`Total MOI: ${finalMoiCount}`);
  console.log(`Distribuição concluída.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
