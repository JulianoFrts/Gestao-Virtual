import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- STARTING MIGRATION: TEAMS -> JOB FUNCTIONS ---");

  // 1. Get all Teams with their members
  const teams = await prisma.team.findMany({
    include: {
      members: { include: { user: true } },
      company: true,
    },
  });

  console.log(`Found ${teams.length} teams.`);

  const createdFunctions = [];
  let updatedUsers = 0;

  for (const team of teams) {
    if (!team.companyId) {
      console.log(`Skipping Team "${team.name}" (No Company ID)`);
      continue;
    }

    // Clean name
    const cleanName = team.name.replace(/\s+/g, " ").trim();

    // Check if function exists
    let jobFunction = await prisma.jobFunction.findUnique({
      where: {
        companyId_name: {
          companyId: team.companyId,
          name: cleanName,
        },
      },
    });

    if (!jobFunction) {
      console.log(
        `Creating JobFunction: "${cleanName}" for Company ${team.companyId}...`,
      );
      jobFunction = await prisma.jobFunction.create({
        data: {
          name: cleanName,
          companyId: team.companyId,
          description: `Função criada automaticamente a partir da equipe ${cleanName}`,
        },
      });
      createdFunctions.push(cleanName);
    } else {
      console.log(`JobFunction "${cleanName}" already exists.`);
    }

    // Assign to users if they don't have a function
    for (const member of team.members) {
      if (!member.user.functionId) {
        console.log(
          `  -> Assigning user ${member.user.name} to function "${cleanName}"`,
        );
        await prisma.user.update({
          where: { id: member.user.id },
          data: { functionId: jobFunction.id },
        });
        updatedUsers++;
      }
    }
  }

  console.log("\n--- MIGRATION SUMMARY ---");
  console.log(`Created Functions: ${createdFunctions.length}`);
  console.log(`Updated Users: ${updatedUsers}`);
  console.log("Done.");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
