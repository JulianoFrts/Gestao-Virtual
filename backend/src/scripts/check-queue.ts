import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const pendingTasks = await prisma.taskQueue.count({
      where: { status: 'pending' }
    });
    const processingTasks = await prisma.taskQueue.count({
      where: { status: 'processing' }
    });
    const failedTasks = await prisma.taskQueue.findMany({
      where: { status: 'failed' },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

    console.log('--- Resumo da Fila de Tarefas ---');
    console.log(`Pendentes: ${pendingTasks}`);
    console.log(`Processando: ${processingTasks}`);
    console.log('--- Últimas Falhas ---');
    console.log(JSON.stringify(failedTasks, null, 2));

    const pendingReports = await prisma.dailyReport.count({
      where: { status: 'SENT' }
    });
    console.log(`--- Relatórios Enviados (Não Aprovados): ${pendingReports} ---`);

  } catch (error) {
    console.error('Erro ao consultar BD:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
