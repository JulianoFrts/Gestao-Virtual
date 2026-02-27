import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.authCredential.groupBy({
    by: ["role"],
    _count: {
      role: true,
    },
  });

  console.log("User counts by role:");
  counts.forEach((c) => {
    console.log(`${c.role}: ${c._count.role}`);
  });

  const total = await prisma.authCredential.count();
  console.log(`\nTotal users: ${total}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

```
