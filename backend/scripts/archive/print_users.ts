import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        role: true,
        hierarchyLevel: true,
      },
      orderBy: [{ hierarchyLevel: "desc" }, { name: "asc" }],
    });
    console.log("--- USER LIST ---");
    console.table(users);
    console.log("------------------");
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
