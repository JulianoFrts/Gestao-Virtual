const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const projectId = "0d6675ac-16d2-428b-9127-2de7a4398d0b";
  console.log(`--- TORRES DO PROJETO: ${projectId} ---`);

  const towers = await prisma.towerTechnicalData.findMany({
    where: { projectId },
    orderBy: { objectSeq: "asc" },
  });

  console.log("Total:", towers.length);
  console.log(
    JSON.stringify(
      towers.map((t) => ({
        id: t.objectId,
        seq: t.objectSeq,
        tipo: t.towerType,
        altura: t.objectHeight ? parseFloat(t.objectHeight.toString()) : null,
        fix_cond: t.fixConductor,
      })),
      null,
      2,
    ),
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
