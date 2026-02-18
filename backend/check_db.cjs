
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    const stages = await prisma.workStage.count();
    const activities = await prisma.productionActivity.count();
    const categories = await prisma.productionCategory.count();
    
    console.log('--- DB STATUS ---');
    console.log(`WorkStages: ${stages}`);
    console.log(`ProductionActivities: ${activities}`);
    console.log(`ProductionCategories: ${categories}`);
    
    const cats = await prisma.productionCategory.findMany({ include: { productionActivities: true } });
    console.log(JSON.stringify(cats, null, 2));

    console.log('--- STAGES ---');
    const stgs = await prisma.workStage.findMany({ select: { id: true, name: true } });
    console.log(stgs.map(s => s.name));
    
    console.log('-----------------');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
