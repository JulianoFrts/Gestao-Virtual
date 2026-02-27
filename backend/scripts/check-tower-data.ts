import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const projectId = process.argv[2];
  if (!projectId) {
    console.error("Please provide a projectId");
    process.exit(1);
  }

  console.log(`Checking tower_production for project: ${projectId}`);
  const towers = await prisma.towerProduction.findMany({
    where: { projectId },
    take: 10,
    select: {
      towerId: true,
      metadata: true,
    },
  });

  console.log("Results (first 10):");
  towers.forEach((t) => {
    console.log(`Tower: ${t.towerId}`);
    console.log(`Metadata: ${JSON.stringify(t.metadata)}`);
  });
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
