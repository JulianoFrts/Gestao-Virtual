import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const extId = "0/3";
  const records = await prisma.mapElementTechnicalData.findMany({
    where: {
      OR: [{ externalId: extId }, { externalId: { contains: extId } }],
    },
  });

  console.log("--- MapElementTechnicalData Records ---");
  console.dir(records, { depth: null });

  const prod = await prisma.towerProduction.findMany({
    where: {
      towerId: extId,
    },
  });
  console.log("--- TowerProduction Records ---");
  console.dir(prod, { depth: null });

  const constr = await prisma.towerConstruction.findMany({
    where: {
      towerId: extId,
    },
  });
  console.log("--- TowerConstruction Records ---");
  console.dir(constr, { depth: null });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
