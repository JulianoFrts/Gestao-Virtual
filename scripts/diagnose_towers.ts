import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- DIAGNÓSTICO DE TORRES ---');

  // 1. Verificar Projetos
  const projects = await prisma.project.findMany({
    select: { id: true, name: true, companyId: true }
  });
  console.log(`Total de Projetos: ${projects.length}`);
  projects.forEach(p => console.log(` - Project ID: ${p.id} | Name: ${p.name} | Company ID: ${p.companyId}`));

  if (projects.length === 0) {
    console.log('AVISO: Nenhum projeto encontrado no banco de dados.');
    return;
  }

  // 2. Verificar Elementos Técnicos (MapElementTechnicalData)
  for (const project of projects) {
    const elements = await prisma.mapElementTechnicalData.count({
      where: { projectId: project.id, elementType: 'TOWER' }
    });
    console.log(`Projeto [${project.name}]: ${elements} torres encontradas.`);
    
    if (elements > 0) {
        const sample = await prisma.mapElementTechnicalData.findFirst({
            where: { projectId: project.id, elementType: 'TOWER' }
        });
        console.log(`   Amostra: ID=${sample?.id}, Name=${sample?.name}, Lat=${sample?.latitude}, Lng=${sample?.longitude}`);
    }
  }

  // 3. Verificar Fontes Legadas (TowerProduction / TowerConstruction)
  const prodCount = await prisma.towerProduction.count();
  const constCount = await prisma.towerConstruction.count();
  console.log(`Total TowerProduction: ${prodCount}`);
  console.log(`Total TowerConstruction: ${constCount}`);

  // 4. Verificar se há inconsistência de CompanyID
  const projectsWithNoCompany = projects.filter(p => !p.companyId);
  if (projectsWithNoCompany.length > 0) {
      console.log(`AVISO: ${projectsWithNoCompany.length} projetos sem CompanyID.`);
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
