import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando Processo de Conexão de Cabos (Vãos)...');

  const projects = await prisma.project.findMany();
  console.log(`Encontrados ${projects.length} projetos.`);

  for (const project of projects) {
    console.log(`\n📂 Processando Projeto: ${project.name} (${project.id})`);

    // Buscar torres do projeto
    const towers = await prisma.mapElementTechnicalData.findMany({
      where: {
        projectId: project.id,
        elementType: 'TOWER'
      },
      orderBy: [
        { sequence: 'asc' },
        { externalId: 'asc' }
      ]
    });

    console.log(`   - Encontradas ${towers.length} torres.`);

    if (towers.length < 2) {
      console.log('   - AVISO: Menos de 2 torres no projeto. Não é possível criar conexões.');
      continue;
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < towers.length - 1; i++) {
      const fromTower = towers[i];
      const toTower = towers[i + 1];

      try {
        // Upsert para não criar duplicatas
        await prisma.segment.upsert({
          where: {
            projectId_fromTowerId_toTowerId: {
              projectId: project.id,
              fromTowerId: fromTower.externalId,
              toTowerId: toTower.externalId
            }
          },
          update: {}, // Não atualizar nada se já existir
          create: {
            projectId: project.id,
            fromTowerId: fromTower.externalId,
            toTowerId: toTower.externalId,
            length: 0, 
          }
        });
        createdCount++;
      } catch (err) {
        console.error(`   - Erro ao conectar ${fromTower.externalId} -> ${toTower.externalId}`);
        skippedCount++;
      }
    }

    console.log(`   - ✅ Concluído: ${createdCount} vãos criados/garantidos, ${skippedCount} erros.`);
  }

  console.log('\n✨ Conexão de cabos finalizada!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
