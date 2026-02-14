const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkQueue() {
  try {
    const counts = await prisma.taskQueue.groupBy({
      by: ["status"],
      _count: {
        id: true,
      },
    });
    console.log("Task Queue Status:");
    console.table(counts);

    const recentTasks = await prisma.taskQueue.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        completedAt: true,
        error: true,
      },
    });
    console.log("\nRecent Tasks:");
    console.table(recentTasks);
  } catch (err) {
    console.error("Error checking TaskQueue:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQueue();
