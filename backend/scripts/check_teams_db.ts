import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- TEAMS ---");
  const teams = await prisma.team.findMany({
    select: {
      id: true,
      name: true,
      siteId: true,
      companyId: true,
      site: {
        select: {
          id: true,
          name: true,
          projectId: true,
        },
      },
    },
  });
  console.log(JSON.stringify(teams, null, 2));

  console.log("\n--- SITES ---");
  const sites = await prisma.site.findMany({
    select: {
      id: true,
      name: true,
      projectId: true,
    },
  });
  console.log(JSON.stringify(sites, null, 2));

  console.log("\n--- PROJECTS ---");
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      name: true,
    },
  });
  console.log(JSON.stringify(projects, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
