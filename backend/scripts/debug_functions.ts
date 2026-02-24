import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("--- Diagnóstico de Cargos (Job Functions) ---");

  const counts = await prisma.jobFunction.groupBy({
    by: ["companyId"],
    _count: {
      id: true,
    },
  });

  console.log("Cargos por Empresa:");
  counts.forEach((c) => {
    console.log(
      `- Empresa ID: ${c.companyId || "GLOBAL (Template)"} | Qtd: ${c._count.id}`,
    );
  });

  const total = await prisma.jobFunction.count();
  console.log(`Total de Cargos: ${total}`);

  // Mostrar os últimos 5 cargos criados
  const lastFive = await prisma.jobFunction.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    select: { name: true, companyId: true, createdAt: true },
  });

  console.log("\nÚltimos 5 Cargos Criados:");
  lastFive.forEach((f) => {
    console.log(
      `- ${f.name} (Empresa: ${f.companyId || "GLOBAL"}) | Criado em: ${f.createdAt}`,
    );
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
