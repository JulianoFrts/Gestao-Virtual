import { prisma } from "./lib/prisma/client";

async function main() {
  const project = await prisma.project.findFirst();
  if (!project) {
    console.log("No projects found");
    return;
  }
  console.log(`Using project: ${project.name} (${project.id})`);

  const towers = await prisma.mapElementTechnicalData.findMany({
    where: { 
      projectId: project.id,
      elementType: 'TOWER'
    },
    orderBy: { sequence: 'asc' }
  });

  console.log(`Found ${towers.length} towers`);
  towers.forEach((t: any) => {
    console.log(`- ID: ${t.id} | Ext: ${t.externalId} | Name: ${t.name} | Seq: ${t.sequence}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
