import { prisma } from "../src/lib/prisma/client";
import { ProductionFactory } from "../src/modules/production/application/production.factory";

async function debugProduction() {
  console.log("=== Debugging Production Data ===");

  const service = ProductionFactory.create();
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  for (const p of projects) {
    console.log(`\nChecking Project: ${p.id} (${p.name})`);

    // Count raw records first
    const towerProdCount = await prisma.towerProduction.count({
      where: { projectId: p.id },
    });
    const towerConstCount = await prisma.towerConstruction.count({
      where: { projectId: p.id },
    });
    const mapElementCount = await prisma.mapElementTechnicalData.count({
      where: { projectId: p.id, elementType: "TOWER" },
    });

    console.log(`- TowerProduction: ${towerProdCount}`);
    console.log(`- TowerConstruction: ${towerConstCount}`);
    console.log(`- MapElement (TOWER): ${mapElementCount}`);

    // Call service method
    const results = await service.listProjectProgress(p.id);
    console.log(
      `- Service listProjectProgress returned: ${results.length} items`,
    );

    if (results.length > 0 && results.length < towerProdCount) {
      console.log(
        `!!! WARNING: Service returned fewer items than in TowerProduction (${results.length} vs ${towerProdCount})`,
      );

      // Let's check why - check the repository logic again
      // It fetches TowerProduction, then TowerConstruction, then MapElementTechnicalData
      // and merges them. If mergedResults is smaller, some towers might be lost?
    }
  }
}

debugProduction()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
