import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkTowers() {
  const towers = await prisma.towerProduction.findMany({
    take: 10,
    select: {
      id: true,
      towerId: true,
      projectId: true,
      metadata: true
    }
  });

  console.log('--- TOWERS SAMPLE ---');
  towers.forEach(t => {
    console.log(`ID: ${t.towerId} | Project: ${t.projectId} | Metadata:`, JSON.stringify(t.metadata));
  });
  
  const count = await prisma.towerProduction.count();
  console.log(`
Total towers in DB: ${count}`);
}

checkTowers().catch(console.error).finally(() => prisma.$disconnect());
