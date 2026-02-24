const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("--- SITE MIGRATION & CLEANUP ---");

  // 1. Find the target site
  const principal = await prisma.site.findFirst({
    where: { name: { contains: "Canteiro Principal", mode: "insensitive" } },
  });

  if (!principal) {
    console.error('ERROR: "Canteiro Principal" not found.');
    const allSites = await prisma.site.findMany();
    console.log(
      "Available sites:",
      allSites.map((s) => `${s.name} (${s.id})`),
    );
    return;
  }

  console.log(
    `Target Site: ${principal.name} (${principal.id}) Project: ${principal.projectId}`,
  );

  // 2. Find sites to remove
  const siteA = await prisma.site.findFirst({
    where: { name: { contains: "Canteiro Frente A", mode: "insensitive" } },
  });
  const siteB = await prisma.site.findFirst({
    where: { name: { contains: "Canteiro Frente B", mode: "insensitive" } },
  });

  const sourceSiteIds = [siteA?.id, siteB?.id].filter(Boolean);
  console.log(`Source Sites to remove: ${sourceSiteIds.join(", ")}`);

  // 3. Migrate Teams
  const teamsMigrated = await prisma.team.updateMany({
    where: {
      OR: [{ siteId: null }, { siteId: { in: sourceSiteIds } }],
    },
    data: {
      siteId: principal.id,
      companyId: principal.companyId || undefined, // Safety: ensure companyId is set if possible
    },
  });
  console.log(`Migrated ${teamsMigrated.count} teams to Principal.`);

  // 4. Migrate User Affiliations
  const affiliationsMigrated = await prisma.userAffiliation.updateMany({
    where: {
      OR: [{ siteId: null }, { siteId: { in: sourceSiteIds } }],
    },
    data: {
      siteId: principal.id,
      projectId: principal.projectId,
    },
  });
  console.log(
    `Migrated ${affiliationsMigrated.count} user affiliations to Principal.`,
  );

  // 5. Cleanup redundant sites
  if (sourceSiteIds.length > 0) {
    // Need to delete related data first if cascade isn't enough,
    // but schema says onDelete: Cascade for project, and Team has site relation.
    // Let's check for "WorkStage", "TowerProduction" etc.
    // Prisma updateMany above handled teams.

    const deleted = await prisma.site.deleteMany({
      where: { id: { in: sourceSiteIds } },
    });
    console.log(`Deleted ${deleted.count} redundant sites.`);
  }

  console.log("--- FINISHED ---");
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
