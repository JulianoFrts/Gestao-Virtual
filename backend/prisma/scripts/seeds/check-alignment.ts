import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkAlignment() {
  console.log(
    "🔍 Verificando Alinhamento entre Sites e Trechos de Torres...\n",
  );

  const sites = await (prisma as any).site.findMany({
    include: { project: true },
  });

  for (const site of sites) {
    console.log(`📍 Canteiro (Site): ${site.name} (ID: ${site.id})`);
    console.log(`🏗️ Projeto: ${site.project.name}`);

    const trechos = await (prisma as any).towerTechnicalData.groupBy({
      by: ["trecho"],
      where: { projectId: site.projectId },
      _count: { _all: true },
    });

    console.log("🗼 Trechos encontrados nas torres deste projeto:");
    if (trechos.length === 0) {
      console.log("   ❌ Nenhuma torre encontrada para este projeto.");
    }
    trechos.forEach((t: any) => {
      console.log(`   - Trecho: "${t.trecho}" (${t._count._all} torres)`);
    });

    const exactMatch = trechos.some((t: any) => t.trecho === site.name);
    console.log(
      `✅ Match Exato com Nome do Site? ${exactMatch ? "SIM" : "NÃO"}`,
    );
    console.log("--------------------------------------------------\n");
  }
}

checkAlignment()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
