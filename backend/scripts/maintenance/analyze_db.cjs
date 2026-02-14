const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- ANALISE DE DADOS ---");

  const companies = await prisma.company.findMany();
  console.log("Empresas:", JSON.stringify(companies, null, 2));

  const projects = await prisma.project.findMany();
  console.log("Projetos:", JSON.stringify(projects, null, 2));

  const sites = await prisma.site.findMany();
  console.log("Canteiros:", JSON.stringify(sites, null, 2));

  const users = await prisma.user.findMany({
    select: { id: true, email: true, companyId: true, role: true },
  });
  console.log("Usuarios:", JSON.stringify(users, null, 2));
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
