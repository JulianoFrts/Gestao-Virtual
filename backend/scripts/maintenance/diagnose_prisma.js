import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  console.log("--- PRISMA ADAPTER DIAGNOSTICS ---");
  console.log("Node version:", process.version);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is missing");
    return;
  }

  let prisma;
  try {
    console.log("Attempting new PrismaClient({ adapter })...");
    const pool = new pg.Pool({ connectionString });
    const adapter = new PrismaPg(pool);

    prisma = new PrismaClient({
      adapter,
      log: ["query", "info", "warn", "error"],
    });
    console.log("✅ Instance created");
  } catch (err) {
    console.error("❌ FAILED DURING INSTANTIATION:");
    console.error(err);
    return;
  }

  try {
    console.log("Attempting $connect()...");
    await prisma.$connect();
    console.log("✅ Connected successfully!");

    console.log("Attempting simple query...");
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("✅ Query result:", JSON.stringify(result));
  } catch (err) {
    console.error("❌ FAILED DURING CONNECTION OR QUERY:");
    console.error(err);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main().catch(console.error);
