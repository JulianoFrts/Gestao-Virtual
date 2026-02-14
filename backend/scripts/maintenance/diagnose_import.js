import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function diagnose() {
  console.log("--- DIAGNÓSTICO DE IMPORTAÇÃO ---");

  // 1. Verificar últimas tarefas de importação
  const jobs = await prisma.taskQueue.findMany({
    where: { type: "EMPLOYEE_IMPORT" },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  console.log("\nÚltimos Jobs de Importação:");
  jobs.forEach((j) => {
    const results = j.payload && j.payload.results;
    console.log(`ID: ${j.id} | Status: ${j.status} | Created: ${j.createdAt}`);
    if (results) {
      console.log(
        `   Resultados: Total=${results.total}, Imported=${results.imported}, Failed=${results.failed}`,
      );
      if (results.errors && results.errors.length > 0) {
        console.log(`   Erros: ${JSON.stringify(results.errors.slice(0, 2))}`);
      }
    }
    if (j.error) console.log(`   Erro do Job: ${j.error}`);
  });

  // 2. Verificar funcionários no banco
  const workerCount = await prisma.user.count({
    where: { role: "WORKER" },
  });
  console.log(`\nTotal de funcionários (WORKER) no banco: ${workerCount}`);

  // 3. Verificar canteiro específico da imagem (se possível identificar ID)
  // Na imagem aparece "CANTEIRO ARAS" e "LT 500 KV RIO - CURITIBA"
  const siteAras = await prisma.site.findFirst({
    where: { name: { contains: "ARAS", mode: "insensitive" } },
  });

  if (siteAras) {
    const workersInSite = await prisma.user.count({
      where: { siteId: siteAras.id },
    });
    console.log(
      `Funcionários vinculados ao CANTEIRO ARAS (${siteAras.id}): ${workersInSite}`,
    );
  } else {
    console.log("Canteiro ARAS não encontrado no banco.");
  }

  await prisma.$disconnect();
}

diagnose().catch((err) => {
  console.error(err);
  process.exit(1);
});
