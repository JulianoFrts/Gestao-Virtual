import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Checking Enum Role values...");

  try {
    const result = await prisma.$queryRawUnsafe(`
            SELECT e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'Role'
        `);
    console.log("PG Enum Values:", result);
  } catch (e) {
    console.error("Error querying PG enums:", e);
  }

  try {
    const users = await prisma.user.findMany({
      take: 5,
      select: { id: true, email: true, role: true },
    });
    console.log("Prisma User Sample (Standard):", users);
  } catch (e: any) {
    console.error("Prisma User Find Error:", e.message);
  }

  await prisma.$disconnect();
}

main();
