import { PrismaClient } from "@prisma/client";
import { ROLE_FLAGS } from "../lib/constants/security";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando Sincronização de Permissões...");

  // 1. Sincronizar Módulos (PermissionModule)
  const allFlags = new Set<string>();
  Object.values(ROLE_FLAGS).forEach(flags => flags.forEach(f => allFlags.add(f)));
  allFlags.delete("*");

  console.log(`📦 Sincronizando ${allFlags.size} módulos...`);
  for (const flag of allFlags) {
    await prisma.permissionModule.upsert({
      where: { code: flag },
      update: {},
      create: { code: flag, name: flag, category: flag.split('.')[0] || 'GENERAL' }
    });
  }

  // 2. Sincronizar Níveis (PermissionLevel)
  const dbLevels = await prisma.permissionLevel.findMany();
  const dbModules = await prisma.permissionModule.findMany();

  // 3. Achatando a Matriz para evitar loop aninhado estrutural
  console.log("🔗 Gerando Matriz de Permissões...");
  const matrixEntries: { levelId: string; moduleId: string; isGranted: boolean }[] = [];

  dbLevels.forEach(level => {
    const expectedFlags = new Set(ROLE_FLAGS[level.name] || []);
    const isGod = expectedFlags.has("*");

    dbModules.forEach(mod => {
      matrixEntries.push({
        levelId: level.id,
        moduleId: mod.id,
        isGranted: isGod || expectedFlags.has(mod.code)
      });
    });
  });

  await prisma.permissionMatrix.deleteMany({});
  
  // Chunking para evitar estouro de memória no createMany
  const CHUNK_SIZE = 100;
  for (let i = 0; i < matrixEntries.length; i += CHUNK_SIZE) {
    await prisma.permissionMatrix.createMany({
      data: matrixEntries.slice(i, i + CHUNK_SIZE),
      skipDuplicates: true
    });
  }

  console.log(`✅ Sincronização completa: ${matrixEntries.length} entradas processadas.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
