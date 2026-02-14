import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.mapElementTechnicalData.count({
      where: { elementType: "SPAN" },
    });
    console.log(`\n\n[RESULT] Total SpanTechnicalData records: ${count}\n`);

    if (count === 0) {
      console.log(
        "No spans in DB. This is expected if you imported via Excel (Towers only).",
      );
      console.log("Cables are currently being synthesized by the frontend.");
    }
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
