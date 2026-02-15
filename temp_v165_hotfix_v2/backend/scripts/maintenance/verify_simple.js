const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- CHECKING TOWERS ---");
  const towers = await prisma.towerTechnicalData.findMany({
    take: 3,
    select: {
      objectId: true,
      projectId: true,
    },
  });
  console.log(JSON.stringify(towers));

  console.log("--- CHECKING PROJECTS ---");
  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });
  console.log(JSON.stringify(projects));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
