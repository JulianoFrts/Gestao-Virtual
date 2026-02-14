
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function diagnose() {
  console.log('--- Diagnosis Start ---');
  
  const towersCount = await prisma.mapElementTechnicalData.count({
    where: { elementType: 'TOWER' }
  });
  console.log(`Total Towers: ${towersCount}`);
  
  const towersWithDoc = await prisma.mapElementTechnicalData.count({
    where: { 
      elementType: 'TOWER',
      documentId: { not: null }
    }
  });
  console.log(`Towers with Document: ${towersWithDoc}`);
  
  const documentsWithSite = await prisma.constructionDocument.count({
    where: { siteId: { not: null } }
  });
  console.log(`Documents with Site: ${documentsWithSite}`);
  
  const towersWithSite = await prisma.mapElementTechnicalData.count({
    where: { 
      elementType: 'TOWER',
      document: { siteId: { not: null } }
    }
  });
  console.log(`Towers linked to a Site (via Document): ${towersWithSite}`);
  
  const samples = await prisma.mapElementTechnicalData.findMany({
    where: { elementType: 'TOWER' },
    take: 5,
    include: { document: true }
  });
  console.log('Sample Towers data:', JSON.stringify(samples, null, 2));

  console.log('--- Diagnosis End ---');
}

diagnose()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
