import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function debug() {
  const projectId = "cmlzpj28k0002trjshyaex55o";
  console.log("Project ID:", projectId);

  const mapElements = await prisma.mapElementTechnicalData.count({
    where: { projectId },
  });
  console.log("Map Elements Count:", mapElements);

  const towerProd = await prisma.towerProduction.count({
    where: { projectId },
  });
  console.log("Tower Production Count:", towerProd);

  const towerConst = await prisma.towerConstruction.count({
    where: { projectId },
  });
  console.log("Tower Construction Count:", towerConst);

  if (mapElements > 0) {
    const sample = await prisma.mapElementTechnicalData.findFirst({
      where: { projectId },
    });
    console.log("Sample Map Element:", JSON.stringify(sample, null, 2));
  }
}

debug()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
