const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function main() {
    console.log('--- VERIFICAÇÃO DE ALINHAMENTO DE ETAPAS ---');
    
    const project = await prisma.project.findFirst();
    if (!project) {
        console.log('Nenhum projeto encontrado.');
        return;
    }

    console.log(`Projeto: ${project.name} (${project.id})`);

    const stages = await prisma.workStage.findMany({
        where: { site: { projectId: project.id } },
        include: { site: true }
    });

    console.log(`Etapas encontradas: ${stages.length}`);
    for (const s of stages) {
        console.log(`- [${s.id}] ${s.name} (Activity: ${s.productionActivityId})`);
        
        if (s.productionActivityId) {
            const progress = await prisma.mapElementProductionProgress.findMany({
                where: { activityId: s.productionActivityId },
                include: { element: true }
            });
            console.log(`  Progresso Registrado: ${progress.length} elementos`);
            if (progress.length > 0) {
                const avg = progress.reduce((acc, p) => acc + Number(p.progressPercent), 0) / progress.length;
                console.log(`  Média de Progresso: ${avg.toFixed(2)}%`);
            }
        }
    }

    const allProgress = await prisma.mapElementProductionProgress.findMany({
        take: 5,
        include: { element: true }
    });

    console.log('\nExemplo de Progresso de Produção:');
    allProgress.forEach(p => {
        console.log(`- Element: ${p.element.objectId}, Activity: ${p.activityId}, Progress: ${p.progressPercent}%`);
    });
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
