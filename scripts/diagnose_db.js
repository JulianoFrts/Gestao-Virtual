const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function diagnose() {
  console.log("--- Database Diagnostic (JS) ---");

  try {
    const activeProjects = await prisma.project.findMany({
      select: { id: true, name: true },
    });
    console.log("Projects found:", activeProjects.length);

    for (const p of activeProjects) {
      const mapCount = await prisma.mapElementTechnicalData.count({
        where: { projectId: p.id },
      });
      const prodCount = await prisma.towerProduction.count({
        where: { projectId: p.id },
      });
      const constrCount = await prisma.towerConstruction.count({
        where: { projectId: p.id },
      });

      if (mapCount > 0 || prodCount > 0 || constrCount > 0) {
        console.log(`Project: ${p.name} (${p.id})`);
        console.log(`  - MapElements: ${mapCount}`);
        console.log(`  - TowerProduction: ${prodCount}`);
        console.log(`  - TowerConstruction: ${constrCount}`);

        if (prodCount > 0) {
          const sample = await prisma.towerProduction.findFirst({
            where: { projectId: p.id },
          });
          console.log(
            `  - Sample Prod Meta:`,
            JSON.stringify(sample.metadata).substring(0, 200),
          );
        }
      }
    }
  } catch (err) {
    console.error("Prisma Error:", err);
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
