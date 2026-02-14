import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Connecting to database...");
  try {
    const users = await prisma.user.findMany({ take: 1 });
    console.log(`Successfully connected. Found ${users.length} users.`);
  } catch (error) {
    console.error("Error connecting to database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
