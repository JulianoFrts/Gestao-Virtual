import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Fetching job functions...");
  const functions = await prisma.jobFunction.findMany({
    include: {
      company: { select: { name: true } },
    },
    take: 1000,
  });

  console.log(`Total functions found: ${functions.length}`);

  // Group by name to see duplicates clearly
  const grouped: Record<string, any[]> = {};
  functions.forEach((f) => {
    if (!grouped[f.name]) grouped[f.name] = [];
    grouped[f.name].push({
      id: f.id,
      company: f.company?.name || "GLOBAL (Template)",
      level: f.level,
      laborType: f.laborType,
    });
  });

  console.log("\nSummary of first 50 functions:");
  functions.slice(0, 50).forEach((f) => {
    console.log(
      `[${f.id}] Name: ${f.name} | Company: ${f.company?.name || "GLOBAL"} | Level: ${f.level}`,
    );
  });

  const duplicates = Object.entries(grouped).filter(
    ([name, list]) => list.length > 1,
  );
  if (duplicates.length > 0) {
    console.log("\nDetected Duplicates (Same Name):");
    duplicates.slice(0, 20).forEach(([name, list]) => {
      console.log(`- ${name}: ${list.length} instances`);
      list.forEach((item) => console.log(`  * ${item.id} - ${item.company}`));
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
