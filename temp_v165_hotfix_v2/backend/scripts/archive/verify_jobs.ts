import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- VERIFICATION ---");
  const jobs = await prisma.jobFunction.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { users: { _count: "desc" } },
    take: 10,
  });

  console.log("Top 10 Jobs by User Count:");
  jobs.forEach((j) => {
    console.log(`- ${j.name}: ${j._count.users}`);
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
