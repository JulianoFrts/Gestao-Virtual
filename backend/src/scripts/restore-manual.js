import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

// v207: Restore Script (JS Version - Full Restore)
// Expansão para incluir Teams, Logs, Reports e dados operacionais

async function importSeedFile(filePath, modelName) {
    if (!fs.existsSync(filePath)) return;

    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    console.log(`📥 [RESTORE/v207-JS] ${modelName}: Processando ${data.length} registros...`);

    let success = 0;
    let failed = 0;

    for (const item of data) {
        try {
            const model = prisma[modelName];
            if (model) {
                const cleanItem = {};

                // Relations conhecidas para ignorar (evita erro de input invalido)
                const relationFields = [
                    'user', 'company', 'project', 'site', 'address', 'affiliation',
                    'jobFunction', 'members', 'supervisedTeams', 'team', 'supervisor',
                    'dailyReports', 'auditLogs', 'timeRecords', 'permissionsMatrix',
                    'level', 'module', 'document', 'activitySchedules', 'productionProgress',
                    'createdDocuments', 'authCredential', 'accounts', 'sessions',
                    'classifications', 'systemMessages', 'userAffiliations', 'workStages',
                    'mapElementTechnicalData', 'mapElementVisibility', 'delegations',
                    'stageProgressUpdates', 'delayReasonUpdates', 'auditPerformed',
                    'routeChecksPerformed', 'receivedMessages'
                ];

                for (const [key, value] of Object.entries(item)) {
                    // 1. Ignora Arrays (relations one-to-many)
                    if (Array.isArray(value)) {
                        if (value.length > 0 && typeof value[0] === 'object') continue;
                        if (value.length === 0) continue;
                    }

                    // 2. Ignora Objetos que parecem Relations
                    if (value !== null && typeof value === "object" && !(value instanceof Date)) {
                        const jsonFields = ['metadata', 'settings', 'displaySettings', 'geometry', 'path', 'customModelTransform'];
                        if (!jsonFields.includes(key)) {
                            if (relationFields.includes(key) || value.id) continue;
                        }
                    }

                    // 3. Converte Datas
                    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                        cleanItem[key] = new Date(value);
                        continue;
                    }

                    // 4. Fix Collision 'address'
                    if (key === 'address') {
                        if (modelName === 'user') continue;
                        if (typeof value === 'object' && value !== null) continue;
                    }

                    // 5. User -> JobFunction Fix
                    if (modelName === 'user' && key === 'functionId') {
                        if (value) {
                            cleanItem['jobFunction'] = { connect: { id: value } };
                        }
                        continue;
                    }

                    cleanItem[key] = value;
                }

                // Custom Where logic
                let whereClause = { id: item.id };

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
                    if (item.projectId && item.externalId) {
                        whereClause = {
                            projectId_externalId: {
                                projectId: item.projectId,
                                externalId: item.externalId
                            }
                        };
                        delete cleanItem.id;
                    }
                }
                // v207: Fix para modelos sem ID único (se houver, ex. tabelas de join puro sem ID)
                // Mas a maioria tem ID. Se não tiver, upsert falha sem unique input.
                // TeamMember tem ID? Sim (nos seeds antigos tinha). 

                await model.upsert({
                    where: whereClause,
                    update: cleanItem,
                    create: cleanItem,
                });
                success++;
            }
        } catch (error) {
            failed++;
            if (!error.message.includes('Unique constraint')) {
                if (failed <= 3) console.warn(`⚠️ [${modelName}] Erro no registro:`, error.message);
            }
        }
    }
    console.log(`✅ [${modelName}] Concluído: ${success} OK, ${failed} falhas.`);
}

async function grantPrivileges() {
    console.log("🛡️  [v207] Aplicando Permission Booster via Prisma Client...");
    try {
        await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO public;`);
        console.log("✅ [v207] Booster aplicado com sucesso!");
    } catch (e) {
        console.warn("⚠️ [v207] Falha no Booster Interno (prosseguindo):", e.message);
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

    // ORDEM V207: COMPLEXA (Tudo)
    const order = [
        // --- ESTÁGIO 1: CORE (Já Restaurado) ---
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
        "work-stages",

        // --- ESTÁGIO 2: OPERACIONAL (Equipes e Tarefas) ---
        "teams",
        "team-members",
        "activity-schedules",
        "production-progress",
        "stage-progress",

        // --- ESTÁGIO 3: REGISTROS DIÁRIOS E LOGS ---
        "time-records",
        "daily-reports",
        "audit-logs",
        "system-messages",
        "user-affiliations",
        "sessions",
        "accounts"
    ];

    const modelMapping = {
        // Stage 1
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
        "work-stages": "workStage",

        // Stage 2
        "teams": "team",
        "team-members": "teamMember",
        "activity-schedules": "activitySchedule",
        "production-progress": "productionProgress",
        "stage-progress": "stageProgress",

        // Stage 3
        "time-records": "timeRecord",
        "daily-reports": "dailyReport",
        "audit-logs": "auditLog",
        "system-messages": "systemMessage",
        "user-affiliations": "userAffiliation",
        "sessions": "session",
        "accounts": "account"
    };

    for (const table of order) {
        const file = files.find((f) => f.endsWith(`-${table}.json`));
        if (file) {
            await importSeedFile(path.join(backupDir, file), modelMapping[table]);
        }
    }
    console.log("✨ Restauração v207 (COMPLETA) finalizada!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
