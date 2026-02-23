import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Querying map_element_technical_data ===");

  const results = await prisma.$queryRawUnsafe(`
    SELECT * 
    FROM "public"."map_element_technical_data" 
    ORDER BY "sequence" 
    LIMIT 1000 OFFSET 0;
  `);

  console.log(`Found ${(results as any[]).length} rows.`);

  // Imprime os 10 primeiros para verificar
  console.log("\nFirst 10 results:");
  const first10 = (results as any[]).slice(0, 10);
  console.dir(first10, { depth: null });

  // Agrupa por sequência para ver limites
  const sequences = (results as any[]).map((r) => r.sequence);
  const minSeq = Math.min(...sequences);
  const maxSeq = Math.max(...sequences);

  console.log(`\nSequence range: ${minSeq} to ${maxSeq}`);

  // Checa se há pular de sequência
  const missing = [];
  for (let i = minSeq; i <= maxSeq; i++) {
    if (!sequences.includes(i)) {
      missing.push(i);
    }
  }

  if (missing.length > 0) {
    if (missing.length > 20) {
      console.log(
        `Missing sequences: ${missing.slice(0, 10).join(", ")} ... and ${missing.length - 10} more`,
      );
    } else {
      console.log(`Missing sequences: ${missing.join(", ")}`);
    }
  } else {
    console.log("No missing sequences in range.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
