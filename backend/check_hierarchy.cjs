
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const stages = await prisma.workStage.findMany({
        where: { projectId: 'proj_lateste' },
        select: { id: true, name: true, parentId: true, displayOrder: true }
    });

    const parents = stages.filter(s => !s.parentId).sort((a,b) => a.displayOrder - b.displayOrder);
    
    console.log(`Total Stages: ${stages.length}`);
    console.log(`Total Parents: ${parents.length}`);
    
    for (const p of parents) {
        const children = stages.filter(s => s.parentId === p.id);
        console.log(`Parent: ${p.name} (ID: ${p.id}) - Children: ${children.length}`);
        if (children.length > 0) {
            children.forEach(c => console.log(`  - ${c.name} (ID: ${c.id})`));
        } else {
            console.log(`  [WARNING] No children for this parent! Grid will hide it.`);
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
