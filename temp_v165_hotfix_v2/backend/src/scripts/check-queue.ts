import { prisma } from "@/lib/prisma/client";

async function check() {
  const counts = await prisma.taskQueue.groupBy({
    by: ["status"],
    _count: {
      id: true,
    },
  });
  console.log("Status counts:", JSON.stringify(counts, null, 2));

  const recent = await prisma.taskQueue.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log(
    "Recent tasks:",
    JSON.stringify(
      recent.map((t: any) => ({
        id: t.id,
        type: t.type,
        status: t.status,
        error: t.error,
        createdAt: t.createdAt,
      })),
      null,
      2,
    ),
  );
}

check()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
