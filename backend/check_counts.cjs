
const { PrismaClient } = require('@prisma/client');

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
    
    const allProjects = await prisma.project.findMany({ select: { id: true, name: true } });
    console.log('Projects:', allProjects);

    const allSites = await prisma.site.findMany({ select: { id: true, name: true, projectId: true } });
    console.log('Sites:', allSites);

    const allStages = await prisma.workStage.findMany({ select: { id: true, name: true, projectId: true, siteId: true } });
    console.log('WorkStages (First 5):', allStages.slice(0, 5));
    console.log('-----------------');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
