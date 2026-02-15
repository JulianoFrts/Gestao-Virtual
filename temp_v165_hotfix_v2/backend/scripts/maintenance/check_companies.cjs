const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, taxId: true },
  });
  console.log(`Found ${companies.length} companies.`);
  for (const c of companies) {
    console.log(`- [${c.id}] ${c.name} (taxId: "${c.taxId}")`);
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
