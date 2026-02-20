import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const level = await prisma.permissionLevel.findFirst({
            where: { name: 'VIEWER' }
        });
        
        if (!level) {
            console.log('Level Viewer not found');
            return;
        }
        
        const matrix = await prisma.permissionMatrix.findMany({
            where: { levelId: level.id, isGranted: true },
            include: { permissionModule: true }
        });
        
        console.log('Viewer explicitly granted permissions in DB:', matrix.map(m => m.permissionModule.code));
    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
