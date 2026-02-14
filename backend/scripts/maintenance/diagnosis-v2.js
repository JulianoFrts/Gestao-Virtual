import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function diagnose() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    
    const projects = await prisma.project.findMany({
      select: { id: true, name: true }
    });
    console.log('--- PROJECTS ---');
    console.log(JSON.stringify(projects, null, 2));

    for (const project of projects) {
        const sites = await prisma.site.findMany({
            where: { projectId: project.id },
            select: { id: true, name: true }
        });
        console.log(`\n--- SITES for Project: ${project.name} ---`);
        console.log(JSON.stringify(sites, null, 2));

        const towerCount = await prisma.mapElementTechnicalData.count({
            where: { projectId: project.id, elementType: 'TOWER' }
        });
        console.log(`\nTotal Towers for project ${project.name}: ${towerCount}`);

        if (towerCount > 0) {
            // Check sample towers and their documents
            const sampleTowers = await prisma.mapElementTechnicalData.findMany({
                where: { projectId: project.id, elementType: 'TOWER' },
                take: 10,
                include: {
                    document: {
                        select: {
                            id: true,
                            name: true,
                            siteId: true
                        }
                    }
                }
            });
            console.log(`\nSample Towers for project ${project.name}:`);
            console.log(JSON.stringify(sampleTowers, null, 2));
            
            // Count towers by document and site
            const towers = await prisma.mapElementTechnicalData.findMany({
                where: { projectId: project.id, elementType: 'TOWER' },
                select: {
                    document: {
                        select: {
                            siteId: true
                        }
                    }
                }
            });
            
            const stats = towers.reduce((acc, t) => {
                const sId = t.document?.siteId || 'none';
                acc[sId] = (acc[sId] || 0) + 1;
                return acc;
            }, {});
            console.log(`\nTowers per Site ID for project ${project.name}:`, stats);
        }

        const stageCount = await prisma.workStage.count({
            where: { projectId: project.id }
        });
        console.log(`\nTotal Work Stages for project ${project.name}: ${stageCount}`);
        
        const stages = await prisma.workStage.findMany({
            where: { projectId: project.id },
            select: { id: true, name: true, siteId: true },
        });
        console.log(`\nWork Stages for project ${project.name}:`);
        console.log(JSON.stringify(stages, null, 2));
    }

  } catch (error) {
    console.error('Diagnosis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
