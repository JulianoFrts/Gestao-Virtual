import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMetadata() {
  try {
    const stages = await prisma.workStage.findMany({
      where: {
        site: {
            projectId: '8d025577-d162-4a44-8d76-059887b2ce53'
        }
      },
      select: {
        id: true,
        name: true,
        metadata: true
      },
      take: 5
    });

    console.log('--- Work Stages Metadata Check ---');
    console.log(JSON.stringify(stages, null, 2));
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMetadata();
