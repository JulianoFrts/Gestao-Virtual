
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const duplicates = await prisma.workStage.groupBy({
        by: ['productionActivityId'],
        having: {
            productionActivityId: {
                _count: {
                    gt: 1
                }
            }
        },
        where: {
            productionActivityId: { not: null }
        }
    });

    if (duplicates.length > 0) {
        console.log("❌ Found duplicate productionActivityIds:", duplicates);
        const details = await prisma.workStage.findMany({
            where: {
                productionActivityId: { in: duplicates.map(d => d.productionActivityId) }
            },
            select: { id: true, name: true, productionActivityId: true }
        });
        console.log("Details:", details);
    } else {
        console.log("✅ No duplicate productionActivityIds found.");
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
