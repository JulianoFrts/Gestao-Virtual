import { prisma } from "../backend/src/lib/prisma/client";
import { ROLE_FLAGS } from "../backend/src/lib/constants/security";

async function verifyPermissions() {
  console.log("=== INICIANDO AUDITORIA DE PERMISSÕES NO BANCO DE DADOS ===\n");

  try {
    // 1. Carregar dados atuais do banco
    const dbLevels = await prisma.permissionLevel.findMany();
    const dbModules = await prisma.permissionModule.findMany();
    const dbMatrix = await prisma.permissionMatrix.findMany();

    const dbLevelNames = dbLevels.map((l) => l.name);
    const dbModuleCodes = dbModules.map((m) => m.code);

    console.log(`Níveis no Banco: ${dbLevels.length}`);
    console.log(`Módulos no Banco: ${dbModules.length}`);
    console.log(`Entradas na Matriz: ${dbMatrix.length}\n`);

    // 2. Verificar Níveis (PermissionLevel)
    const expectedLevels = Object.keys(ROLE_FLAGS);
    const missingLevels = expectedLevels.filter(
      (l) => !dbLevelNames.includes(l),
    );

    if (missingLevels.length > 0) {
      console.warn("⚠️ Níveis Faltantes no Banco:", missingLevels);
    } else {
      console.log(
        "✅ Todos os Níveis definidos em constantes existem no banco.",
      );
    }

    // 3. Verificar Módulos (PermissionModule)
    const allExpectedFlags = new Set<string>();
    Object.values(ROLE_FLAGS).forEach((flags) => {
      flags.forEach((f) => {
        if (f !== "*") allExpectedFlags.add(f);
      });
    });

    const missingModules = Array.from(allExpectedFlags).filter(
      (f) => !dbModuleCodes.includes(f),
    );

    if (missingModules.length > 0) {
      console.warn("⚠️ Módulos (Flags) Faltantes no Banco:", missingModules);
    } else {
      console.log(
        "✅ Todos os Módulos (Flags) definidos em constantes existem no banco.",
      );
    }

    // 4. Verificar Matriz (PermissionMatrix)
    console.log("\n--- Auditando Matriz de Permissões ---");

    let inconsistencies = 0;
    for (const levelName of expectedLevels) {
      const level = dbLevels.find((l) => l.name === levelName);
      if (!level) continue;

      const expectedFlags = ROLE_FLAGS[levelName];
      const actualGrantedModules = dbMatrix
        .filter((m) => m.levelId === level.id && m.isGranted)
        .map((m) => dbModules.find((mod) => mod.id === m.moduleId)?.code)
        .filter(Boolean) as string[];

      // Se for God Role, esperamos que tenha '*' ou pelo menos as flags base se não for wildcard real no banco
      if (expectedFlags.includes("*")) {
        // Para God Roles, geralmente não listamos tudo na matriz individualmente se o middleware já trata o '*'
        console.log(`ℹ️ ${levelName} é GOD ROLE (Wildcard).`);
        continue;
      }

      const missingInMatrix = expectedFlags.filter(
        (f) => !actualGrantedModules.includes(f),
      );
      const extraInMatrix = actualGrantedModules.filter(
        (f) => !expectedFlags.includes(f),
      );

      if (missingInMatrix.length > 0 || extraInMatrix.length > 0) {
        inconsistencies++;
        console.log(`❌ Inconsistência em ${levelName}:`);
        if (missingInMatrix.length > 0)
          console.log(`   - Faltando no Banco: ${missingInMatrix.join(", ")}`);
        if (extraInMatrix.length > 0)
          console.log(
            `   - Extra no Banco (não deveria ter): ${extraInMatrix.join(", ")}`,
          );
      }
    }

    if (inconsistencies === 0) {
      console.log(
        "✅ Matriz de Permissões está sincronizada com as constantes.",
      );
    }

    console.log("\n=== FIM DA AUDITORIA ===");
  } catch (error) {
    console.error("❌ Erro durante a auditoria:", error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyPermissions();
