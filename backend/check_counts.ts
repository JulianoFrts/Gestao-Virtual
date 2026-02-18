
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const stages = await prisma.workStage.count();
    const activities = await prisma.productionActivity.count();
    const projects = await prisma.project.count();
    const sites = await prisma.site.count();
    
    console.log('--- DB COUNTS ---');
    console.log(`Projects: ${projects}`);
    console.log(`Sites: ${sites}`);
    console.log(`ProductionActivities: ${activities}`);
    console.log(`WorkStages: ${stages}`);
    console.log('-----------------');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
