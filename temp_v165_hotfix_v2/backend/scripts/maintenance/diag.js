
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const towers = await prisma.mapElementTechnicalData.findMany({
    where: { elementType: 'TOWER' },
    take: 5,
    include: {
      document: true
    }
  });
  console.log('Towers found:', towers.length);
  towers.forEach(t => {
    console.log(`Tower: ${t.name}, DocID: ${t.documentId}, SiteID in Doc: ${t.document?.siteId}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
