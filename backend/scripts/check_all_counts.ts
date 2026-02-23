import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Database Count Audit ===");

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  for (const project of projects) {
    console.log(`\nProject: ${project.name} (${project.id})`);

    const towerProd = await prisma.towerProduction.count({
      where: { projectId: project.id },
    });
    const towerConst = await prisma.towerConstruction.count({
      where: { projectId: project.id },
    });
    const mapElements = await prisma.mapElementTechnicalData.count({
      where: {
        projectId: project.id,
        elementType: "TOWER",
      },
    });

    console.log(`  - TowerProduction: ${towerProd}`);
    console.log(`  - TowerConstruction: ${towerConst}`);
    console.log(`  - MapElementTechnicalData (TOWER): ${mapElements}`);

    if (towerProd !== mapElements) {
      console.log(
        `  [!] MISMATCH DETECTED: TowerProduction (${towerProd}) vs MapElement (${mapElements})`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
