import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const categories = await prisma.productionCategory.findMany({
    orderBy: { order: "asc" },
    include: {
      productionActivities: {
        orderBy: { order: "asc" },
      },
    },
  });

  console.log(JSON.stringify(categories, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
