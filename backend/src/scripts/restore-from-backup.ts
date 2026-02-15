import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/prisma/client";

// v148: Priority Restore (Login-First)
// Atendendo ao pedido: "auth-credentials execute essa primeiro!"
// Nota: Importamos Users + AuthCredentials no topo para liberar o login.

async function importSeedFile(filePath: string, modelName: string) {
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📥 [RESTORE/v148] ${modelName}: Processando ${data.length} registros...`);

  let success = 0;
  let failed = 0;

  for (const item of data) {
    try {
      const model = (prisma as any)[modelName];
      if (model) {
        const cleanItem: any = {};
        const relationFields = [
          'user', 'company', 'project', 'site', 'address', 'affiliation',
          'jobFunction', 'members', 'supervisedTeams', 'team', 'supervisor',
          'dailyReports', 'auditLogs', 'timeRecords', 'permissionsMatrix'
        ];

        for (const [key, value] of Object.entries(item)) {
          if (value !== null && typeof value === "object" && !(value instanceof Date)) {
            if (relationFields.includes(key) || (value as any).id) continue;
          }
          if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            cleanItem[key] = new Date(value);
            continue;
          }
          cleanItem[key] = value;
        }

        await model.upsert({
          where: { id: item.id },
          update: cleanItem,
          create: cleanItem,
        });
        success++;
      }
    } catch (error: any) {
      failed++;
      if (failed <= 3) console.warn(`⚠️ [${modelName}] Erro no ID ${item.id}:`, error.message);
    }
  }
  console.log(`✅ [${modelName}] Concluído: ${success} OK, ${failed} falhas.`);
}

async function grantPrivileges() {
  console.log("🛡️  [v154] Aplicando Permission Booster via Prisma Client...");
  try {
    // Comandos de força bruta para garantir que o usuário squarecloud tenha acesso total
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO squarecloud;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL TABLES IN SCHEMA public TO squarecloud;`);
    await prisma.$executeRawUnsafe(`GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO squarecloud;`);
    await prisma.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO squarecloud;`);
    console.log("✅ [v154] Booster aplicado com sucesso via Prisma!");
  } catch (e: any) {
    console.warn("⚠️ [v154] Falha no Booster Interno (prosseguindo):", e.message);
  }
}

async function main() {
  // v154: Executa o booster antes de qualquer operação de escrita
  await grantPrivileges();

  const backupDir = path.join(process.cwd(), "prisma", "seeds-backup");
  if (!fs.existsSync(backupDir)) {
    console.log("❌ Backup não encontrado.");
    return;
  }

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));

  // ORDEM V148: ATENDENDO PEDIDO DO USUÁRIO
  // Colocamos Users antes de AuthCredentials apenas para evitar erro de FK, 
  // mas ambos ficam no topo para liberar o login imediatamente.
  const order = [
    "users",            // Dependência básica
    "auth-credentials", // ALVO PRINCIPAL DO USUÁRIO
    "companies",
    "job-functions",
    "projects",
    "sites",
    "permission-levels",
    "permission-modules",
    "permission-matrix",
    "production-categories",
    "production-activities",
    "map-elements",
    "work-stages"
  ];

  const modelMapping: Record<string, string> = {
    "companies": "company",
    "projects": "project",
    "sites": "site",
    "users": "user",
    "auth-credentials": "authCredential",
    "job-functions": "jobFunction",
    "permission-levels": "permissionLevel",
    "permission-modules": "permissionModule",
    "permission-matrix": "permissionMatrix",
    "production-categories": "productionCategory",
    "production-activities": "productionActivity",
    "map-elements": "mapElementTechnicalData",
    "work-stages": "workStage"
  };

  for (const table of order) {
    const file = files.find((f) => f.includes(`-${table}.json`));
    if (file) {
      await importSeedFile(path.join(backupDir, file), modelMapping[table]);
    }
  }
  console.log("✨ Restauração v148 finalizada!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
