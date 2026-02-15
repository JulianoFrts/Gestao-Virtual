import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- LISTAGEM DE CARGOS E USUÁRIOS ---");

  const jobs = await prisma.jobFunction.findMany({
    include: {
      _count: {
        select: { users: true },
      },
    },
  });

  console.log("Cargos encontrados:");
  jobs.forEach((j) => {
    console.log(`- ${j.name} (ID: ${j.id}): ${j._count.users} usuários`);
  });

  const usersWithoutJob = await prisma.user.count({
    where: { functionId: null },
  });
  console.log(`\nUsuários sem cargo: ${usersWithoutJob}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
