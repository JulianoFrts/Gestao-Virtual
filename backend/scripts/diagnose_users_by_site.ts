import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("--- Diagnóstico de Usuários por Canteiro ---");

  const siteCounts = await prisma.userAffiliation.groupBy({
    by: ["siteId"],
    _count: {
      userId: true,
    },
  });

  for (const count of siteCounts) {
    const site = count.siteId
      ? await prisma.site.findUnique({ where: { id: count.siteId } })
      : null;

    console.log(
      `Canteiro: ${site?.name || "Sem Canteiro"} (ID: ${count.siteId}) | Qtd Usuários: ${count._count.userId}`,
    );
  }

  const projectCounts = await prisma.userAffiliation.groupBy({
    by: ["projectId"],
    _count: {
      userId: true,
    },
  });

  console.log("\n--- Por Projeto ---");
  for (const count of projectCounts) {
    const project = await prisma.project.findUnique({
      where: { id: count.projectId },
    });
    console.log(
      `Projeto: ${project?.name || "Desconhecido"} (ID: ${count.projectId}) | Qtd Usuários: ${count._count.userId}`,
    );
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
