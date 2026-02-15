const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- CHECKING USERS ---");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
    },
  });
  console.log(JSON.stringify(users));

  console.log("--- CHECKING COMPANIES ---");
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });
  console.log(JSON.stringify(companies));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
