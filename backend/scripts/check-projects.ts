import { prisma } from "../src/lib/prisma/client";

async function main() {
  console.log("🔍 Verificando projetos no banco de dados...");
  
  const count = await prisma.project.count();
  const projects = await prisma.project.findMany({
    take: 10,
    select: {
      id: true,
      name: true,
      status: true,
      company: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`📊 Total de projetos encontrados: ${count}`);
  if (count > 0) {
    console.log("📋 Lista dos últimos projetos:");
    projects.forEach(p => {
      console.log(`- [${p.status}] ${p.name} (Empresa: ${p.company?.name || 'N/A'})`);
    });
  } else {
    console.log("⚠️ Nenhum projeto cadastrado.");
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
