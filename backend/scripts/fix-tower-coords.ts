import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function syncCoords() {
  console.log('--- INICIANDO SINCRONIZAÇÃO DE COORDENADAS ---');
  
  // 1. Buscar todos os dados técnicos de construção
  const constructionData = await prisma.towerConstruction.findMany({
    select: {
      towerId: true,
      projectId: true,
      metadata: true
    }
  });

  console.log(`Encontrados ${constructionData.length} registros técnicos.`);

  let updatedCount = 0;

  for (const item of constructionData) {
    const meta = (item.metadata as any) || {};
    const lat = meta.latitude || meta.lat || 0;
    const lng = meta.longitude || meta.lng || 0;
    const elev = meta.elevacao || meta.elevation || 0;

    if (lat !== 0 && lng !== 0) {
      // 2. Tentar encontrar a torre correspondente na Produção
      const production = await prisma.towerProduction.findUnique({
        where: {
          projectId_towerId: {
            projectId: item.projectId!,
            towerId: item.towerId
          }
        }
      });

      if (production) {
        const prodMeta = (production.metadata as any) || {};
        
        // 3. Injetar coordenadas no metadata da produção
        await prisma.towerProduction.update({
          where: { id: production.id },
          data: {
            metadata: {
              ...prodMeta,
              latitude: lat,
              longitude: lng,
              elevation: elev
            }
          }
        });
        updatedCount++;
      }
    }
  }

  console.log(`
Sincronização concluída! ${updatedCount} torres movidas do oceano para suas coordenadas reais.`);
}

syncCoords().catch(console.error).finally(() => prisma.$disconnect());
