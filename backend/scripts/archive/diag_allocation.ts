import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- DIAGNÓSTICO DE ALOCAÇÃO ---");

  const userCountsByJob = await prisma.$queryRaw<any[]>`
    SELECT f.name, f.description, COUNT(u.id) as count
    FROM users u
    JOIN job_functions f ON u.function_id = f.id
    GROUP BY f.name, f.description
    ORDER BY count DESC;
  `;
  console.log("Distribuição por Cargo (Top 10):");
  console.log(userCountsByJob.slice(0, 10));

  const unassigned = await prisma.$queryRaw<any[]>`
    SELECT COUNT(*) FROM users 
    WHERE id NOT IN (SELECT user_id FROM team_members);
  `;
  console.log(`\nUsuários sem equipe: ${unassigned[0].count}`);

  const teams = await prisma.team.findMany({
    select: { id: true, name: true },
  });
  console.log(`\nEquipes existentes: ${teams.length}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
