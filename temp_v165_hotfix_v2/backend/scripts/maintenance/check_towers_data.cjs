const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- VERIFICANDO DADOS DAS TORRES ---");

  const towers = await prisma.towerTechnicalData.findMany({
    orderBy: {
      objectSeq: "asc",
    },
    take: 50, // Pegar as primeiras 50 para conferir
  });

  console.log("Total de torres no banco:", towers.length);

  if (towers.length > 0) {
    console.log(
      JSON.stringify(
        towers.map((t) => ({
          id: t.objectId,
          seq: t.objectSeq,
          tipo: t.towerType,
          altura: t.objectHeight ? parseFloat(t.objectHeight.toString()) : null,
          fix_cond: t.fixConductor,
          x: t.xCoordinate ? parseFloat(t.xCoordinate.toString()) : null,
          y: t.yCoordinate ? parseFloat(t.yCoordinate.toString()) : null,
        })),
        null,
        2,
      ),
    );
  } else {
    console.log("Nenhuma torre encontrada no banco de dados.");
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
