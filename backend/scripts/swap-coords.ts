import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function swapCoords() {
  console.log('--- INVERTENDO LATITUDE E LONGITUDE ---');
  
  const towers = await prisma.towerProduction.findMany({
    select: {
      id: true,
      metadata: true
    }
  });

  let updatedCount = 0;

  for (const t of towers) {
    const meta = (t.metadata as any) || {};
    
    // Pegar valores atuais
    const currentLat = meta.latitude;
    const currentLng = meta.longitude;

    // Inverter se ambos existirem e parecerem trocados
    // (Geralmente no Brasil Longitude é entre -40 e -60, e Latitude entre -10 e -35)
    if (currentLat < -40 && currentLng > -40) {
      await prisma.towerProduction.update({
        where: { id: t.id },
        data: {
          metadata: {
            ...meta,
            latitude: currentLng,  // O que era Longitude vira Latitude
            longitude: currentLat, // O que era Latitude vira Longitude
          }
        }
      });
      updatedCount++;
    }
  }

  console.log(`
Inversão concluída! ${updatedCount} torres corrigidas.`);
}

swapCoords().catch(console.error).finally(() => prisma.$disconnect());
