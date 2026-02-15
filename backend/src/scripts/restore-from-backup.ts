import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/prisma/client";
import { Prisma } from "@prisma/client";

// v98.5: Order Doctor & Type Armor Restore

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
        const cleanItem: any = {};

        // v98.5: Enhanced Sanitization & Type Conversion
        const relationFields = [
          'user', 'company', 'project', 'site', 'address', 'affiliation',
          'jobFunction', 'members', 'supervisedTeams', 'team', 'supervisor',
          'dailyReports', 'auditLogs', 'timeRecords', 'permissionsMatrix',
          'parent', 'children', 'productionActivity', 'target', 'createdBy',
          'accounts', 'sessions', 'timeRecordsCreated', 'receivedMessages',
          'delegations', 'conductors', 'segments', 'circuits', 'stageProgress',
          'updatedBy', 'recipientUser', 'ticketHistory', 'temporaryPermissions',
          'mapElementTechnicalData', 'mapElementVisibility', 'constructionDocuments',
          'model3DAnchors', 'cable3dSettings', 'delayReasons', 'unitCosts'
        ];

        for (const [key, value] of Object.entries(item)) {
          // 1. Remove Relations (Objects with IDs or known relation names)
          if (value !== null && typeof value === "object" && !(value instanceof Date)) {
            if (relationFields.includes(key) || (value as any).id) {
              continue;
            }
          }

          // 2. Type Conversion Armor & Special Connections
          if (key === 'functionId' && typeof value === 'string') {
            // Fix for 'Unknown argument functionId': use connect
            cleanItem['jobFunction'] = { connect: { id: value } };
            continue;
          }

          if (typeof value === "string") {
            // DateTime Conversion
            // Regex to check if string looks like an ISO Date (e.g., 2026-02-07T09:00:45.282Z)
            if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
              cleanItem[key] = new Date(value);
              continue;
            }
          }

          // Decimal Conversion
          // Prisma often handles decimals better as strings or Decimal objects, but standard JSON only has number/string.
          // If the field is known to be Decimal in schema, passing string is often safest for adapters.
          // However, we rely on Prisma's auto-detection. The error `missing field kind` suggests
          // that for some types, standard serialisation fails.
          // We will pass primitive types (string, number, boolean, date) directly.

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
      // Log only first 5 failures to avoid flooding
      if (failed <= 5) {
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

  // v98.5: Corrected Import Order
  // JobFunction MUST prevent User (User.functionId -> JobFunction)
  // Company before everything
  const order = [
    "companies",
    "job-functions", // Moved up!
    "projects",
    "sites",
    "users",
    "auth-credentials",
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

  console.log("✨ Restauração v98.5 completa!");
}

main()
  .catch((e) => {
    console.error("💥 Erro fatal na restauração:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
