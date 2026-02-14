import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("--- DB STATS ---");
  try {
    const roles = await prisma.user.groupBy({
      by: ["role"] as any,
      _count: true,
    });
    console.log("Users by Role:", roles);

    const mods = await prisma.jobFunction.count({
      where: { description: "MOD" },
    });
    const mois = await prisma.jobFunction.count({
      where: { description: "MOI" },
    });
    const undefineds = await prisma.jobFunction.count({
      where: { NOT: [{ description: "MOD" }, { description: "MOI" }] },
    });

    console.log(`Functions: MOD=${mods}, MOI=${mois}, Undefined=${undefineds}`);

    const teams = await prisma.team.findMany({
      include: {
        members: {
          include: {
            user: {
              include: {
                jobFunction: true,
              },
            },
          },
        },
      },
    });

    let mixedCount = 0;
    for (const t of teams) {
      const types = new Set(
        t.members.map((m) => m.user.jobFunction?.description || "MOD"),
      );
      if (types.size > 1) {
        mixedCount++;
        console.log(`Team "${t.name}" is mixed. Types:`, Array.from(types));
      }
    }
    console.log("Total Mixed Teams:", mixedCount);

    const leaders = await prisma.user.findMany({
      where: { jobFunction: { canLeadTeam: true } },
      take: 5,
    });
    console.log(
      "Example leaders found:",
      leaders.map((l) => l.name),
    );
  } catch (err) {
    console.error("Error in check:", err);
  }
}

check()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
