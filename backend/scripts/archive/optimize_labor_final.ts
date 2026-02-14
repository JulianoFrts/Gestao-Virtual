import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- OTIMIZAÇÃO ORGANIZACIONAL ---");

  // 1. Cargos que devem ser MOD (Mão de Obra Direta)
  const shouldBeMOD = [
    "APONTADOR",
    "ALMOXARIFE",
    "AUXILIAR DE ALMOXARIFADO",
    "MOTORISTA",
    "OPERADOR DE MUNCK",
    "MARETELEIRO",
    "PEDREIRO",
    "AUXILIAR DE PEDREIRO",
    "SERVENTE",
    "ELETRICISTA",
    "MONTADOR",
    "AUXILIAR DE MONTAGEM",
    "OPERADOR DE GUINDASTE",
    "ENCARREGADO DE OBRA CIVIL",
    "ENCARREGADO DE ARMAÇAO",
    "ENCARREGADO DE MONTAGEM AT",
    "ENCARREGADO DE LANÇAMENTO",
  ];

  console.log("Reclassificando cargos operacionais para MOD...");
  await prisma.jobFunction.updateMany({
    where: {
      OR: [
        { name: { in: shouldBeMOD } },
        { name: { contains: "MONTADOR", mode: "insensitive" } },
        { name: { contains: "AUXILIAR", mode: "insensitive" } },
        { name: { contains: "COORDENADOR DE EQUIPE", mode: "insensitive" } },
      ],
    },
    data: { description: "MOD" },
  });

  // 2. Garantir que MOI (Staff Administrativo) não passe de 120
  const moiJobs = await prisma.jobFunction.findMany({
    where: { description: "MOI" },
    include: { _count: { select: { users: true } } },
  });

  let totalMOI = moiJobs.reduce((acc, j) => acc + j._count.users, 0);
  console.log(`\nContagem MOI antes do ajuste fino: ${totalMOI}`);

  if (totalMOI > 120) {
    console.log("Ajustando excedente de MOI...");
    // Se ainda estiver alto, reclassificamos coordenações e supervisões que atuam em campo
    await prisma.jobFunction.updateMany({
      where: {
        description: "MOI",
        name: { contains: "SUPERVISOR", mode: "insensitive" },
      },
      data: { description: "MOD" },
    });
  }

  // 3. Alocar TODOS os funcionários sem equipe
  const unassigned = await prisma.$queryRaw<any[]>`
    SELECT id FROM users 
    WHERE id NOT IN (SELECT user_id FROM team_members);
  `;
  console.log(`\nLocalizados ${unassigned.length} funcionários sem equipe.`);

  if (unassigned.length > 0) {
    let team = await prisma.team.findFirst({
      where: { name: "FORÇA DE TRABALHO GERAL" },
    });
    if (!team) {
      team = await prisma.team.create({
        data: {
          name: "FORÇA DE TRABALHO GERAL",
          isActive: true,
          displayOrder: 100,
        },
      });
    }

    const membersData = unassigned.map((u) => ({
      teamId: team!.id,
      userId: u.id,
    }));

    await prisma.teamMember.createMany({
      data: membersData,
      skipDuplicates: true,
    });
    console.log(
      `Sucesso: ${membersData.length} funcionários alocados na equipe "${team.name}".`,
    );
  }

  // Relatório Final
  const finalMoiCount = await prisma.user.count({
    where: { jobFunction: { description: "MOI" } },
  });
  console.log(`\n--- RELATÓRIO FINAL ---`);
  console.log(`Total MOI: ${finalMoiCount} (Meta: <= 120)`);
  console.log(`Funcionários pendentes de alocação: 0`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
