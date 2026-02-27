import { prisma } from "../src/lib/prisma/client";
import { ProjectService } from "../src/modules/projects/application/project.service";
import { PrismaProjectRepository } from "../src/modules/projects/infrastructure/prisma-project.repository";

async function main() {
  const repo = new PrismaProjectRepository();
  const service = new ProjectService(repo);
  
  console.log("🚀 Simulando listagem de projetos para ADMIN...");
  
  try {
    const result = await service.listProjects({
      where: {}, // Admin vê tudo
      page: 1,
      limit: 10,
      include: {
        company: { select: { id: true, name: true } },
        _count: { select: { sites: true, userAffiliations: true } }
      }
    });

    console.log("✅ API retornou com sucesso!");
    console.log(`📊 Total: ${result.pagination.total}`);
    console.log("📄 Itens:", JSON.stringify(result.items, null, 2));
  } catch (error) {
    console.error("❌ Erro na API de Projetos:", error);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
