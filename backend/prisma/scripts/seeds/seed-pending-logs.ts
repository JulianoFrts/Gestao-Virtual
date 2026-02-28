import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const DATABASE_URL = "postgresql://orion:OrionPass123@localhost:5432/orion_db";
const pool = new pg.Pool({ connectionString: DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function seed() {
  console.log("🚀 GERANDO LOGS PENDENTES PARA VALIDAÇÃO...");
  try {
    const tower = await prisma.mapElementTechnicalData.findFirst({
        where: { elementType: 'TOWER' } 
    });
    const activity = await prisma.productionActivity.findFirst();
    const user = await prisma.user.findFirst({ 
        where: { authCredential: { role: "ADMIN" } } 
    });

    if (!tower || !activity || !user) {
      console.error("Dados base não encontrados para o seed.");
      return;
    }

    // Criar Progressão Pendente
    // MapElementProductionProgress assume o papel de Status e Log atual
    const status = await prisma.mapElementProductionProgress.upsert({
      where: {
        elementId_activityId: { elementId: tower.id, activityId: activity.id },
      },
      update: { requiresApproval: true, approvalReason: "Validação técnica de teste seed" },
      create: {
        projectId: tower.projectId, // Obrigatório
        elementId: tower.id,
        activityId: activity.id,
        currentStatus: "IN_PROGRESS",
        requiresApproval: true,
        approvalReason: "Validação técnica de teste seed",
        history: [{
            status: "IN_PROGRESS",
            progressPercent: 50,
            requiresApproval: true,
            changedById: user.id,
            comment: "Log de teste dinâmico seed",
            timestamp: new Date().toISOString()
        }]
      },
    });

    console.log("✅ Item pendente criado/atualizado com sucesso!", status);

    console.log("✅ 5 Logs pendentes criados com sucesso!");
  } catch (err) {
    console.error("Erro no seed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
