import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- DETALHAMENTO DE MÃO DE OBRA ---");
  const jobs = await prisma.jobFunction.findMany({
    include: { _count: { select: { users: true } } },
  });

  console.log("Classificação por Cargo:");
  jobs
    .sort((a, b) => b._count.users - a._count.users)
    .forEach((j) => {
      console.log(
        `- [${j.description || "N/A"}] ${j.name}: ${j._count.users} usuários`,
      );
    });

  const totalMOI = jobs
    .filter((j) => j.description === "MOI")
    .reduce((acc, j) => acc + j._count.users, 0);
  console.log(`\nTOTAL MOI ATUAL: ${totalMOI}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
