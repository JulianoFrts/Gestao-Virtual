import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const reports = await prisma.dailyReport.findMany({
    where: { status: "PROGRAMMED" },
    orderBy: { createdAt: "desc" },
    take: 5
  });
  console.log(JSON.stringify(reports, null, 2));
}
main().finally(() => prisma.$disconnect());
