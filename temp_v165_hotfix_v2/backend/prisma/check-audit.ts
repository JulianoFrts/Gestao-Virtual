import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("--- AUDIT STATUS ---");
  try {
    const pendingLogs = await prisma.mapElementProductionProgress.count({
      where: { currentStatus: "PENDING" },
    });
    console.log("Pending Items (PENDING Status):", pendingLogs);

    const requiresApprovalLogs = await prisma.mapElementProductionProgress.count({
      where: { requiresApproval: true },
    });
    console.log("Items requiring Approval:", requiresApprovalLogs);

    const approvalByStatus = await prisma.mapElementProductionProgress.groupBy({
      by: ["currentStatus"],
      _count: true,
    });
    console.log("Items by Status:", approvalByStatus);
  } catch (err) {
    console.error("Error:", err);
  }
}

check().finally(() => prisma.$disconnect());
