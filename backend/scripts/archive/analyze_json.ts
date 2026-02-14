import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const teams = await prisma.team.findMany({
    select: { name: true, companyId: true, id: true },
  });
  const jobFunctions = await prisma.jobFunction.findMany({
    select: { name: true, companyId: true },
  });

  // Normalize logic
  const getKey = (name: string, companyId: string | null) =>
    `${(name || "").trim().toLowerCase()}|${companyId || "null"}`;
  const functionSet = new Set(
    jobFunctions.map((jf) => getKey(jf.name, jf.companyId)),
  );

  const toCreate = [];

  for (const team of teams) {
    if (!team.companyId) continue; // Skip teams without company for now

    // Clean name
    const cleanName = team.name.replace(/\s+/g, " ").trim();
    const key = getKey(cleanName, team.companyId);

    if (!functionSet.has(key)) {
      toCreate.push({
        name: cleanName,
        companyId: team.companyId,
        teamId: team.id,
      });
    }
  }

  console.log(JSON.stringify(toCreate, null, 2));
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
