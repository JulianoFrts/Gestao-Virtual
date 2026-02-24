import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. Find Canteiro Principal
  const site = await prisma.site.findFirst({
    where: {
      name: {
        contains: "Canteiro Principal",
        mode: "insensitive",
      },
    },
  });

  if (!site) {
    console.error("Canteiro Principal not found!");
    // List all sites to help identification
    const allSites = await prisma.site.findMany();
    console.log("Available sites:", JSON.stringify(allSites, null, 2));
    return;
  }

  console.log(
    `Found Canteiro Principal: ${site.name} (ID: ${site.id}, CompanyID: ${site.companyId})`,
  );

  // 2. Update Teams with siteId is null
  const teamsUpdate = await prisma.team.updateMany({
    where: {
      siteId: null,
      companyId: site.companyId, // Safety: only update if it's the same company or we might need to set companyId too
    },
    data: {
      siteId: site.id,
    },
  });
  console.log(`Updated ${teamsUpdate.count} orphaned teams.`);

  // Also update teams where companyId might be null
  const teamsCompanyUpdate = await prisma.team.updateMany({
    where: {
      companyId: null,
    },
    data: {
      companyId: site.companyId,
    },
  });
  console.log(`Updated ${teamsCompanyUpdate.count} teams with null companyId.`);

  // 3. Update Users (Employees) with siteId is null
  const usersUpdate = await prisma.user.updateMany({
    where: {
      siteId: null,
      companyId: site.companyId,
    },
    data: {
      siteId: site.id,
    },
  });
  console.log(`Updated ${usersUpdate.count} orphaned users.`);

  // Also update users where companyId might be null
  const usersCompanyUpdate = await prisma.user.updateMany({
    where: {
      companyId: null,
    },
    data: {
      companyId: site.companyId,
    },
  });
  console.log(`Updated ${usersCompanyUpdate.count} users with null companyId.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
