import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const violations = await prisma.governanceAuditHistory.findMany({
      where: { status: "OPEN" },
      orderBy: { severity: "desc" },
    });

    console.log(`Found ${violations.length} active violations.`);

    // Group by Violation Type
    const grouped = violations.reduce(
      (acc, v) => {
        const key = v.violation || "Unknown";
        if (!acc[key]) acc[key] = [];
        acc[key].push(v);
        return acc;
      },
      {} as Record<string, typeof violations>,
    );

    for (const [type, list] of Object.entries(grouped)) {
      console.log(`\n=== ${type} (${list.length}) ===`);
      // Show first 5 examples
      list.slice(0, 5).forEach((v) => {
        console.log(` - [${v.severity}] ${v.file}: ${v.message}`);
      });
      if (list.length > 5) console.log(`   ... and ${list.length - 5} more`);
    }
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
