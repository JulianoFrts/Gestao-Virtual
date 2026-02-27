import { prisma } from "../lib/prisma/client";

async function main() {
  console.log('--- CORREÇÃO DE COORDENADAS DE TORRES ---');

  const constructions = await prisma.towerConstruction.findMany({
    where: {
      projectId: 'cmm41mlom000ctrpghi6qt1h0' // Projeto LA TESTE
    }
  });

  console.log(`Total de registros para processar: ${constructions.length}`);

  let updatedCount = 0;
  for (const constr of constructions) {
    const meta = typeof constr.metadata === 'string' ? JSON.parse(constr.metadata) : (constr.metadata as any);
    
    // As coordenadas parecem estar invertidas nos metadados legados
    // Lat: -43.76 (Long na verdade), Lng: -22.65 (Lat na verdade)
    const rawLat = parseFloat(meta?.latitude);
    const rawLng = parseFloat(meta?.longitude);

    if (!isNaN(rawLat) && !isNaN(rawLng) && rawLat !== 0 && rawLng !== 0) {
        // Correção da inversão: Lat deve ser ~ -22, Lng deve ser ~ -43
        const correctLat = rawLng;
        const correctLng = rawLat;

        const element = await prisma.mapElementTechnicalData.findFirst({
            where: { 
                projectId: constr.projectId,
                externalId: constr.towerId
            }
        });

        if (element) {
            await prisma.mapElementTechnicalData.update({
                where: { id: element.id },
                data: {
                    latitude: correctLat,
                    longitude: correctLng
                }
            });
            updatedCount++;
        }
    }
  }

  console.log(`Sucesso: ${updatedCount} torres atualizadas com coordenadas corrigidas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
