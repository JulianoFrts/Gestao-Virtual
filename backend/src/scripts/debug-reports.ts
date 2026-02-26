import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    // Buscar os últimos 5 relatórios enviados
    const lastSent = await prisma.dailyReport.findMany({
      where: { status: 'SENT' },
      take: 5 /* literal */,
      orderBy: { createdAt: 'desc' },
      select: {
          id: true,
          status: true,
          reportDate: true,
          teamId: true
      }
    });

    console.log('--- Relatórios PENDENTES (SENT) no BD ---');
    console.log(JSON.stringify(lastSent, null, 2));

    if (lastSent.length > 0) {
        const ids = lastSent.map(r => r.id);
        console.log(`\nTestando busca por IDs: ${ids.join(', ')}`);
        
        const found = await prisma.dailyReport.findMany({
            where: { id: { in: ids } }
        });
        
        console.log(`Encontrados por ID: ${found.length}`);
    }

  } catch (error) {
    console.error('Erro:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
