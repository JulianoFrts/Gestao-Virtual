import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const towers = await prisma.towerProduction.findMany({
    take: 5,
    select: {
      towerId: true,
      metadata: true,
    },
  });

  console.log("Elevation samples:");
  towers.forEach((t) => {
    const meta = t.metadata as any;
    console.log(
      `Tower ${t.towerId}: metadata.elevacao=${meta?.elevacao}, metadata.elevation=${meta?.elevation}`,
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
