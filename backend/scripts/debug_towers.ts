import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.towerProduction.count();
  console.log("Total towers in TowerProduction:", count);

  if (count > 0) {
    const samples = await prisma.towerProduction.findMany({ take: 5 });
    console.log("Samples:", JSON.stringify(samples, null, 2));

    const projectIds = await prisma.towerProduction.groupBy({
      by: ["projectId"],
      _count: { _all: true },
    });
    console.log(
      "Projects in TowerProduction:",
      JSON.stringify(projectIds, null, 2),
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
