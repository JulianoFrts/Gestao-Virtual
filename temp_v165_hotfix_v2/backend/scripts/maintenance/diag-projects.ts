import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNÓSTICO DE PROJETOS E TORRES ---');
    
    const projects = await prisma.project.findMany({
        include: {
            _count: {
                select: {
                    mapElementTechnicalData: true,
                    sites: true
                }
            }
        }
    });

    console.log(`\nEncontrados ${projects.length} projetos:`);
    for (const p of projects) {
        console.log(`- [${p.id}] ${p.name}`);
        console.log(`  Empresa: ${p.companyId}`);
        console.log(`  Torres: ${p._count.mapElementTechnicalData}`);
        console.log(`  Canteiros: ${p._count.sites}`);
    }

    const towerSample = await prisma.mapElementTechnicalData.findFirst({
        where: { elementType: 'TOWER' },
        include: {
            project: true,
            company: true
        }
    });

    if (towerSample) {
        console.log('\nExemplo de Torre:');
        console.log(`- ID: ${towerSample.id}`);
        console.log(`- Object ID: ${towerSample.externalId}`);
        console.log(`- Project ID: ${towerSample.projectId} (${towerSample.project?.name})`);
        console.log(`- Company ID: ${towerSample.companyId} (${towerSample.company?.name})`);
    } else {
        console.log('\nNenhuma torre encontrada no banco.');
    }

    const workStages = await prisma.workStage.findMany({
        include: {
            site: {
                include: {
                    project: true
                }
            }
        }
    });

    console.log(`\nEncontradas ${workStages.length} etapas de obra.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
