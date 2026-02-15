import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- INSPECTING DATA ---");

  console.log("\n--- TEAMS ---");
  const teams = await prisma.team.findMany({ include: { members: true } });
  if (teams.length === 0) console.log("No teams found.");
  teams.forEach((t) => {
    console.log(`TEAM_NAME: "${t.name}" (Members: ${t.members.length})`);
  });

  console.log("\n--- USERS (First 5) ---");
  const users = await prisma.user.findMany({
    take: 5,
    include: {
      jobFunction: true,
      teamMemberships: { include: { team: true } },
    },
  });
  users.forEach((u) => {
    const teamNames = u.teamMemberships
      .map((tm) => tm.team.name.replace(/\n/g, " "))
      .join(", ");
    console.log(
      `User: ${u.name}, Function: ${u.jobFunction?.name || "Null"}, Teams: [${teamNames}]`,
    );
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
