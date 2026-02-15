import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { prisma } from "../lib/prisma/client";

async function importSeedFile(filePath: string, modelName: string) {
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  console.log(`📥 Importando ${data.length} registros para ${modelName}...`);

  for (const item of data) {
    try {
      // Usar upsert para evitar duplicatas e permitir atualizações
      // Nota: o modelo exato no prisma pode variar (ex: company vs companies em JSON)
      const model = (prisma as any)[modelName];
      if (model) {
        await model.upsert({
          where: { id: item.id },
          update: item,
          create: item,
        });
      }
    } catch (error) {
      console.warn(`⚠️ Falha ao importar registro ${item.id} em ${modelName}:`, error);
    }
  }
}

async function main() {
  const backupDir = path.join(process.cwd(), "prisma", "seeds-backup");
  if (!fs.existsSync(backupDir)) {
    console.log("❌ Diretório de backup não encontrado.");
    return;
  }

  const files = fs.readdirSync(backupDir).filter((f) => f.endsWith(".json"));

  // Ordem de importação é importante por causa das FKs
  // Esta lista pode ser refinada
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

  console.log("✨ Restauração concluída!");
}

main()
  .catch((e) => {
    console.error("💥 Erro na restauração:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
