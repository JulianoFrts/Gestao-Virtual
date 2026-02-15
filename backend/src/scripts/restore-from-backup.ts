import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/prisma/client";

// v205: Restore Script Refined
// Adiciona suporte a functionId (User) e chaves compostas (MapElementTechnicalData)

async function importSeedFile(filePath: string, modelName: string) {
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📥 [RESTORE/v205] ${modelName}: Processando ${data.length} registros...`);

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
          'dailyReports', 'auditLogs', 'timeRecords', 'permissionsMatrix',
          'level', 'module', 'document', 'activitySchedules', 'productionProgress'
        ];

        for (const [key, value] of Object.entries(item)) {
          // Ignora campos de relação complexos
          if (value !== null && typeof value === "object" && !(value instanceof Date)) {
            if (relationFields.includes(key) || (value as any).id) continue;
          }
          // Converte datas
          if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
            cleanItem[key] = new Date(value);
            continue;
          }

          // v205: Correção Específica para User -> JobFunction
          if (modelName === 'user' && key === 'functionId') {
            if (value) {
              cleanItem['jobFunction'] = { connect: { id: value } };
            }
            continue; // Não adiciona functionId diretamente
          }

          cleanItem[key] = value;
        }

        // v205: Custom Where logic for Compound Keys
        let whereClause: any = { id: item.id };

        if (modelName === 'permissionMatrix') {
          whereClause = {
            levelId_moduleId: {
              levelId: item.levelId,
              moduleId: item.moduleId
            }
          };
        } else if (modelName === 'mapElementVisibility') {
          whereClause = {
            userId_projectId_elementId_documentId: {
              userId: item.userId,
              projectId: item.projectId,
              elementId: item.elementId,
              documentId: item.documentId
            }
          }
        } else if (modelName === 'mapElementTechnicalData') {
          // v205: Fix para MapElementTechnicalData (projectId + externalId)
          if (item.projectId && item.externalId) {
            whereClause = {
              projectId_externalId: {
                projectId: item.projectId,
                externalId: item.externalId
              }
            };
            delete cleanItem.id; // Remove ID do update para evitar conflito
          }
        }

        await model.upsert({
          where: whereClause,
          update: cleanItem,
          create: cleanItem,
        });
        success++;
      }
    } catch (error: any) {
      failed++;
      if (failed <= 3) console.warn(`⚠️ [${modelName}] Erro no registro:`, error.message);
    }
  }
  console.log(`✅ [${modelName}] Concluído: ${success} OK, ${failed} falhas.`);
}

async function grantPrivileges() {
  console.log("🛡️  [v205] Aplicando Permission Booster via Prisma Client...");
  try {
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
    console.log("✅ [v205] Booster aplicado com sucesso!");
  } catch (e: any) {
    console.warn("⚠️ [v205] Falha no Booster Interno (prosseguindo):", e.message);
  }
}

async function main() {
  await grantPrivileges();

  const backupDir = path.join(process.cwd(), "prisma", "seeds-backup");
  if (!fs.existsSync(backupDir)) {
    console.log("❌ Backup não encontrado em", backupDir);
    return;
  }

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));

  // ORDEM V205: Garantindo integridade referencial
  const order = [
    "companies",
    "job-functions",
    "users",
    "auth-credentials",
    "projects",
    "sites",
    "permission-levels",
    "permission-modules",
    "permission-matrix",
    "construction-documents",
    "production-categories",
    "production-activities",
    "map-elements",
    "work-stages"
  ];

  const modelMapping: Record<string, string> = {
    "companies": "company",
    "job-functions": "jobFunction",
    "users": "user",
    "auth-credentials": "authCredential",
    "projects": "project",
    "sites": "site",
    "permission-levels": "permissionLevel",
    "permission-modules": "permissionModule",
    "permission-matrix": "permissionMatrix",
    "construction-documents": "constructionDocument",
    "production-categories": "productionCategory",
    "production-activities": "productionActivity",
    "map-elements": "mapElementTechnicalData",
    "work-stages": "workStage"
  };

  for (const table of order) {
    const file = files.find((f) => f.endsWith(`-${table}.json`));
    if (file) {
      await importSeedFile(path.join(backupDir, file), modelMapping[table]);
    } else {
      console.log(`ℹ️ [SKIP] Arquivo para ${table} não encontrado.`);
    }
  }
  console.log("✨ Restauração v205 finalizada!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
