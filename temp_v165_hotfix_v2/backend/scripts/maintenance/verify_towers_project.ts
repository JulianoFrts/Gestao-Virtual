import { prisma } from "@/lib/prisma/client";

async function main() {
  console.log("--- Verifying TowerTechnicalData ---");
  const count = await prisma.towerTechnicalData.count();
  console.log(`Total Towers: ${count}`);

  const sample = await prisma.towerTechnicalData.findMany({
    take: 5,
    select: {
      id: true,
      objectId: true,
      projectId: true,
      createdAt: true,
    },
  });

  console.log("Sample Towers:", JSON.stringify(sample, null, 2));

  const projects = await prisma.project.findMany({
    select: { id: true, name: true },
  });
  console.log("Available Projects:", JSON.stringify(projects, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
