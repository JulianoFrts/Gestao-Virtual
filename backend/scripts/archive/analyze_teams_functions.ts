import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- ANALYSIS: TEAMS vs FUNCTIONS ---");

  // 1. Get all Teams
  const teams = await prisma.team.findMany({
    include: {
      members: { include: { user: { include: { jobFunction: true } } } },
      company: true,
    },
  });

  // 2. Get all JobFunctions
  const jobFunctions = await prisma.jobFunction.findMany();
  const functionNames = new Set(
    jobFunctions.map((jf) => jf.name.trim().toLowerCase()),
  );

  console.log(`\nFound ${teams.length} Teams.`);

  for (const team of teams) {
    // Clean team name: remove newlines, multiple spaces, trim
    const cleanName = team.name.replace(/\s+/g, " ").trim();
    const exists = functionNames.has(cleanName.toLowerCase());

    console.log(
      `\nTEAM: "${cleanName}" (Original: "${team.name.substring(0, 20)}...")`,
    );
    console.log(`   -> JobFunction Exists? ${exists ? "YES" : "NO"}`);
    console.log(`   -> Members: ${team.members.length}`);

    if (team.members.length > 0) {
      console.log(`   -> Users (Sample):`);
      team.members.slice(0, 3).forEach((m) => {
        console.log(
          `      - ${m.user.name} (Current Func: ${m.user.jobFunction?.name || "None"})`,
        );
      });
    }
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
