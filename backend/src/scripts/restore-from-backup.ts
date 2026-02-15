import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/prisma/client";

async function importSeedFile(filePath: string, modelName: string) {
  if (!fs.existsSync(filePath)) return;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📥 [RESTORE] ${modelName}: Agendando ${data.length} registros...`);

  let success = 0;
  let failed = 0;

  for (const item of data) {
    try {
      const model = (prisma as any)[modelName];
      if (model) {
        // v98.4: Smart Sanitization
        // Removemos apenas objetos de relação (que o Prisma não aceita em upsert direto com ID)
        // Mantemos campos Json (como 'permissions', 'metadata', 'oldValues', 'newValues')
        const cleanItem: any = {};

        // Lista de campos que sabemos serem relações no nosso schema
        const relationFields = [
          'user', 'company', 'project', 'site', 'address', 'affiliation',
          'jobFunction', 'members', 'supervisedTeams', 'team', 'supervisor',
          'dailyReports', 'auditLogs', 'timeRecords', 'permissionsMatrix',
          'parent', 'children', 'productionActivity', 'target', 'createdBy',
          'accounts', 'sessions', 'timeRecordsCreated', 'receivedMessages'
        ];

        for (const [key, value] of Object.entries(item)) {
          if (value !== null && typeof value === "object" && !(value instanceof Date)) {
            // Se o campo estiver na lista de relações ou se parecer com uma relação (contém sub-objetos complexos com IDs)
            if (relationFields.includes(key) || (value as any).id) {
              continue;
            }
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
      if (failed < 10) {
        console.warn(`⚠️ [${modelName}] Falha no ID ${item.id}:`, error.message);
      }
    }
  }
  console.log(`✅ [${modelName}] Concluído: ${success} sucessos, ${failed} falhas.`);
}

async function main() {
  const backupDir = path.join(process.cwd(), "prisma", "seeds-backup");
  if (!fs.existsSync(backupDir)) {
    console.log("❌ Diretório de backup não encontrado.");
    return;
  }

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));

  const order = [
    "companies",
    "projects",
    "sites",
    "users",
    "auth-credentials",
    "job-functions",
    "permission-levels",
    "permission-modules",
    "permission-matrix",
    "production-categories",
    "production-activities",
    "map-elements",
    "work-stages",
    "teams",
    "team-members",
    "circuits",
    "segments",
    "conductors",
    "map-element-progress",
    "activity-schedules",
    "stage-progress",
    "daily-reports",
    "time-records",
    "audit-logs",
    "site-responsibles",
  ];

  for (const table of order) {
    const file = files.find((f) => f.includes(`-${table}.json`));
    if (file) {
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
        "work-stages": "workStage",
        "teams": "team",
        "team-members": "teamMember",
        "circuits": "circuit",
        "segments": "segment",
        "conductors": "conductor",
        "map-element-progress": "mapElementProductionProgress",
        "activity-schedules": "activitySchedule",
        "stage-progress": "stageProgress",
        "daily-reports": "dailyReport",
        "time-records": "timeRecord",
        "audit-logs": "auditLog",
        "site-responsibles": "siteResponsible",
      };

      await importSeedFile(path.join(backupDir, file), modelMapping[table]);
    }
  }

  console.log("✨ Restauração v98.4 completa!");
}

main()
  .catch((e) => {
    console.error("💥 Erro fatal na restauração:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
