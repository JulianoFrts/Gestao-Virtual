import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Diagnosticando map_element_technical_data ---");

  const count = await prisma.mapElementTechnicalData.count();
  console.log(`Total de elementos na tabela: ${count}`);

  const byProject = await prisma.mapElementTechnicalData.groupBy({
    by: ["projectId"],
    _count: {
      id: true,
      externalId: true,
    },
  });

  console.log("\nContagem por Projeto:");
  for (const group of byProject) {
    // Buscar nome do projeto
    const project = await prisma.project
      .findUnique({
        where: { id: group.projectId || "undefined" },
        select: { name: true, code: true },
      })
      .catch(() => null);

    console.log(`Projeto ID: ${group.projectId}`);
    console.log(
      `  Nome: ${project?.name || "N/A"} (${project?.code || "N/A"})`,
    );
    console.log(`  Total: ${group._count.id}`);

    // Amostra de tipos
    const sampleTypes = await prisma.mapElementTechnicalData.findMany({
      where: { projectId: group.projectId },
      select: { elementType: true },
      distinct: ["elementType"],
    });
    console.log(
      `  Tipos encontrados: ${sampleTypes.map((t) => t.elementType).join(", ")}`,
    );
  }

  // Verificar elemento específico mencionado pelo usuário
  const specificId = "7e53beb7-bc53-4b7a-98d3-e2b687c2dbcd";
  const element = await prisma.mapElementTechnicalData.findFirst({
    where: {
      OR: [{ id: specificId }, { externalId: "TRIO_C1" }, { name: "TRIO_C1" }],
    },
  });

  if (element) {
    console.log("\nElemento TRIO_C1 ou ID específico encontrado:");
    console.log(JSON.stringify(element, null, 2));
  } else {
    console.log("\nElemento TRIO_C1 não encontrado.");
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
