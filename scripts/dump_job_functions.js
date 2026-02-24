const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Fetching job functions (JS version)...");
  try {
    const count = await prisma.jobFunction.count();
    console.log("Total Count:", count);

    const functions = await prisma.jobFunction.findMany({
      take: 100,
      orderBy: { name: "asc" },
    });

    console.log("First 100 job functions:");
    functions.forEach((f) => {
      console.log(
        `- ${f.name} (ID: ${f.id}, CoID: ${f.companyId}, Level: ${f.hierarchyLevel})`,
      );
    });
  } catch (error) {
    console.error("Query failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
