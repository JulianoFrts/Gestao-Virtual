import { prisma } from "../src/lib/prisma/client";

async function run() {
  const data = await prisma.mapElementTechnicalData.findMany({
    where: { elementType: "TOWER" },
    orderBy: { sequence: "asc" },
    select: { externalId: true, sequence: true },
  });

  const missing = [];
  const seqs = data.map((d) => d.sequence);
  let last = seqs[0] - 1;
  for (let i = 0; i < seqs.length; i++) {
    if (seqs[i] !== last + 1) {
      missing.push(
        `Jump from ${last} to ${seqs[i]} (items: ${data[i - 1]?.externalId} to ${data[i]?.externalId})`,
      );
    }
    last = seqs[i];
  }

  console.log(`Total torres: ${data.length}`);
  console.log(`Min sequence: ${seqs[0]}`);
  console.log(`Max sequence: ${seqs[seqs.length - 1]}`);
  console.log("Jumps found:");
  missing.slice(0, 10).forEach((m) => console.log(m));
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
