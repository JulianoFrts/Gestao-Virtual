const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.productionCategory
  .findMany({ include: { activities: true } })
  .then((res) => {
    console.log(JSON.stringify(res, null, 2));
    prisma.$disconnect();
  });
