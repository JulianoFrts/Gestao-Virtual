import { prisma } from "../src/lib/prisma/client";

async function debugTowers() {
  console.log("=== Debugging Tower Counts ===");

  const totalLegacy = await prisma.mapElementTechnicalData.count({
    where: { elementType: "TOWER" },
  });
  console.log(`MapElementTechnicalData (TOWER): ${totalLegacy}`);

  const totalProduction = await prisma.towerProduction.count();
  console.log(`TowerProduction: ${totalProduction}`);

  const totalConstruction = await prisma.towerConstruction.count();
  console.log(`TowerConstruction: ${totalConstruction}`);

  // Count by project
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });

  for (const p of projects) {
    const legacyCount = await prisma.mapElementTechnicalData.count({
      where: { projectId: p.id, elementType: "TOWER" },
    });
    const prodCount = await prisma.towerProduction.count({
      where: { projectId: p.id },
    });
    console.log(
      `Project: ${p.id} (${p.name}) - Legacy: ${legacyCount}, Production: ${prodCount}`,
    );
  }
}

debugTowers()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
