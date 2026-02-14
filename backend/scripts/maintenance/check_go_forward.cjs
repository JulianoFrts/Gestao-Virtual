const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const projectId = "0d6675ac-16d2-428b-9127-2de7a4398d0b";
  console.log(`--- TORRES DO PROJETO: ${projectId} (COM GO_FORWARD) ---`);

  const towers = await prisma.towerTechnicalData.findMany({
    where: { projectId },
    orderBy: { objectSeq: "asc" },
  });

  console.log("Total:", towers.length);
  console.log(
    JSON.stringify(
      towers
        .map((t) => ({
          id: t.objectId,
          seq: t.objectSeq,
          go_forward: t.goForward ? parseFloat(t.goForward.toString()) : null,
          tipo: t.towerType,
        }))
        .slice(0, 10),
      null,
      2,
    ),
  );
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
