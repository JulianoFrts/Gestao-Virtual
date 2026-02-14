const { PrismaClient } = require("@prisma/client");

async function main() {
  console.log("--- PRISMA CJS DIAGNOSTICS ---");

  let prisma;
  try {
    console.log("Attempting new PrismaClient()...");
    prisma = new PrismaClient();
    console.log("✅ Instance created");

    await prisma.$connect();
    console.log("✅ Connected successfully!");
  } catch (err) {
    console.error("❌ FAILED:");
    console.error(err);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main();
