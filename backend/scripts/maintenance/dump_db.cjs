const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const prisma = new PrismaClient();

async function main() {
  const data = {
    companies: await prisma.company.findMany(),
    projects: await prisma.project.findMany(),
    sites: await prisma.site.findMany(),
    users: await prisma.user.findMany({
      select: { id: true, email: true, companyId: true, role: true },
    }),
  };
  fs.writeFileSync("db_dump.json", JSON.stringify(data, null, 2));
  console.log("✅ Dados exportados para db_dump.json");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
