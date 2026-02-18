
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Creating WorkStages from ProductionActivities...");

    // 1. Get Project
    const project = await prisma.project.findFirst({
        where: { name: "LA TESTE" } // Or use 'proj_lateste' if sure
    });

    if (!project) {
        console.error("❌ Project 'LA TESTE' not found.");
        return;
    }
    const projectId = project.id;
    console.log(`Using Project: ${project.name} (${projectId})`);

    // 2. Get Categories with Activities
    const categories = await prisma.productionCategory.findMany({
        include: { productionActivities: true },
        orderBy: { order: 'asc' }
    });

    // 3. Create Stages
    for (const cat of categories) {
        // Create Parent Stage (Category)
        console.log(`Processing Category: ${cat.name}`);
        
        // Check if exists
        let parentStage = await prisma.workStage.findFirst({
            where: { 
                projectId, 
                name: cat.name,
                parentId: null
            }
        });

        if (!parentStage) {
            parentStage = await prisma.workStage.create({
                data: {
                    name: cat.name,
                    description: cat.description,
                    projectId,
                    displayOrder: cat.order,
                    weight: 0, // Parent usually has 0 or sum? Let's use 0 or 1.
                    siteId: null, // Global for project
                }
            });
            console.log(`  Created Parent Stage: ${cat.name}`);
        } else {
            console.log(`  Parent Stage exists: ${cat.name}`);
        }

        // Create Child Stages (Activities)
        if (cat.productionActivities && cat.productionActivities.length > 0) {
            for (const act of cat.productionActivities) {
                const existingChild = await prisma.workStage.findFirst({
                    where: {
                        projectId,
                        productionActivityId: act.id
                    }
                });

                if (!existingChild) {
                    await prisma.workStage.create({
                        data: {
                            name: act.name,
                            projectId,
                            parentId: parentStage.id,
                            productionActivityId: act.id,
                            displayOrder: act.order,
                            weight: act.weight,
                            siteId: null
                        }
                    });
                    console.log(`    Created Stage for Activity: ${act.name}`);
                } else {
                    console.log(`    Stage exists for Activity: ${act.name}`);
                }
            }
        }
    }

    console.log("✅ WorkStages creation completed.");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
