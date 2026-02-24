import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function diagnose() {
  const projectId = "78059739-6abc-46de-a50d-13404567b7a8"; // Common context project ID if applicable, better to get all

  console.log("--- Database Diagnostic ---");

  const totalProjects = await prisma.project.count();
  console.log("Total Projects:", totalProjects);

  const activeProjects = await prisma.project.findMany({
    select: { id: true, name: true },
  });
  console.log("Projects list:", activeProjects);

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
        const sampleProd = await prisma.towerProduction.findFirst({
          where: { projectId: p.id },
        });
        console.log(`  - Sample Production Metadata:`, sampleProd?.metadata);
      }
      if (mapCount > 0) {
        const sampleMap = await prisma.mapElementTechnicalData.findFirst({
          where: { projectId: p.id },
        });
        console.log(`  - Sample Map Metadata:`, sampleMap?.metadata);
      }
    }
  }
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
