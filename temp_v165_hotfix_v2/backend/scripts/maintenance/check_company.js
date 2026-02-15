const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- CHECKING COMPANY IDS ---");
  const total = await prisma.towerTechnicalData.count();
  const withCompany = await prisma.towerTechnicalData.count({
    where: { companyId: { not: null } },
  });
  const sample = await prisma.towerTechnicalData.findMany({
    take: 3,
    select: {
      objectId: true,
      projectId: true,
      companyId: true,
    },
  });

  console.log(`Total towers: ${total}`);
  console.log(`Towers with companyId set: ${withCompany}`);
  console.log("Samples:", JSON.stringify(sample));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
