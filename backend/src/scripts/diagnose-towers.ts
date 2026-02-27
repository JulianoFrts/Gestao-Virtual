import { prisma } from "../lib/prisma/client";

async function main() {
  console.log('--- DIAGNÓSTICO DE TORRES (INTERNAL) ---');

  try {
    // 1. Verificar Projetos
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, companyId: true }
    });
    console.log(`Total de Projetos: ${projects.length}`);
    
    if (projects.length === 0) {
      console.log('AVISO: Nenhum projeto encontrado no banco de dados.');
      return;
    }

    for (const project of projects) {
      console.log(`
Projeto: ${project.name} (${project.id})`);
      
      // 2. Verificar Elementos Técnicos
      const elementsCount = await prisma.mapElementTechnicalData.count({
        where: { projectId: project.id, elementType: 'TOWER' }
      });
      console.log(` - Torres (TechnicalData): ${elementsCount}`);

      const withCoords = await prisma.mapElementTechnicalData.count({
        where: { 
          projectId: project.id, 
          elementType: 'TOWER',
          latitude: { not: null },
          longitude: { not: null }
        }
      });
      console.log(` - Torres COM coordenadas: ${withCoords}`);
      console.log(` - Torres SEM coordenadas: ${elementsCount - withCoords}`);

      // 3. Verificar Produção Legada vinculada ao projeto
      const prodWithMetadata = await prisma.towerProduction.findMany({
          where: { projectId: project.id },
          take: 5
      });
      console.log(`\n   Amostra de Metadados (TowerProduction):`);
      prodWithMetadata.forEach(p => {
          const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : p.metadata;
          console.log(`   - ${p.towerId}: Lat=${meta?.latitude}, Lng=${meta?.longitude}`);
      });

      const constWithMetadata = await prisma.towerConstruction.findMany({
          where: { projectId: project.id },
          take: 5
      });
      console.log(`\n   Amostra de Metadados (TowerConstruction):`);
      constWithMetadata.forEach(c => {
          const meta = typeof c.metadata === 'string' ? JSON.parse(c.metadata) : c.metadata;
          console.log(`   - ${c.towerId}: Lat=${meta?.latitude}, Lng=${meta?.longitude}`);
      });

      if (elementsCount > 0) {
          const sample = await prisma.mapElementTechnicalData.findFirst({
              where: { projectId: project.id, elementType: 'TOWER' }
          });
          console.log(`   Amostra Technical: ID=${sample?.id}, Name=${sample?.name}, Lat=${sample?.latitude}, Lng=${sample?.longitude}`);
      }
    }

    // 5. Verificar totais globais de tabelas órfãs
    const orphanProd = await prisma.towerProduction.count({ where: { projectId: { notIn: projects.map(p => p.id) } } });
    const orphanConst = await prisma.towerConstruction.count({ where: { projectId: { notIn: projects.map(p => p.id) } } });
    
    if (orphanProd > 0 || orphanConst > 0) {
        console.log(`
AVISO: Encontrados registros órfãos (sem projeto válido):`);
        console.log(` - TowerProduction órfãos: ${orphanProd}`);
        console.log(` - TowerConstruction órfãos: ${orphanConst}`);
    }

  } catch (err) {
    console.error('Erro durante o diagnóstico:', err);
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
