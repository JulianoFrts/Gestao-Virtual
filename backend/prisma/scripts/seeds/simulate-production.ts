import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { PASSWORD_HASHES } from "../src/lib/constants/business";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- RE-SIMULANDO PRODUÇÃO E PLANEJAMENTO (LA TESTE) ---");

  // 1. Projeto e Empresa
  const project = await prisma.project.findFirst({
    where: { name: "LA TESTE" },
  });
  if (!project) throw new Error("Projeto LA TESTE não encontrado.");
  const companyId = project.companyId!;

  // 2. Usuário Sistema
  let systemUser = await prisma.user.findFirst({
    where: { authCredential: { email: "sistema@orion.pro" } },
  });
  if (!systemUser) {
    systemUser = await prisma.user.create({
      data: {
        name: "SISTEMA ORION",
        isSystemAdmin: true,
        authCredential: {
          create: {
            email: "sistema@orion.pro",
            password: PASSWORD_HASHES.DEFAULT_SEED,
            status: "ACTIVE",
            role: "SUPER_ADMIN",
          },
        },
        affiliation: {
          create: {
            companyId,
          },
        },
      },
    });
  }

  // 3. Categorias e Atividades (Idempotente)
  const categoryData = [
    {
      name: "SERVIÇOS PRELIMINARES",
      order: 1,
      activities: [
        { name: "Croqui de Acesso", unit: "KM", price: 5000 },
        { name: "Sondagem", unit: "UN", price: 1250 },
        { name: "Conferência de Perfil", unit: "UN", price: 850 },
        { name: "Supressão Vegetal (Área)", unit: "m²", price: 12.5 },
        { name: "Abertura de Acessos", unit: "UN", price: 4200 },
      ],
    },
    {
      name: "FUNDAÇÕES",
      order: 2,
      activities: [
        { name: "Escavação (Mastro/Pé)", unit: "UN", price: 18500 },
        { name: "Armação (Mastro/Pé)", unit: "UN", price: 9200 },
        { name: "Concretagem (Mastro/Pé)", unit: "UN", price: 35000 },
        { name: "Nivelamento / Preparação", unit: "UN", price: 1500 },
      ],
    },
  ];

  for (const c of categoryData) {
    let dbCat = await prisma.productionCategory.findFirst({
      where: { name: c.name },
    });
    if (!dbCat) {
      dbCat = await prisma.productionCategory.create({
        data: { name: c.name, order: c.order },
      });
    }

    for (const a of c.activities) {
      let dbAct = await prisma.productionActivity.findFirst({
        where: { name: a.name, categoryId: dbCat.id },
      });
      if (!dbAct) {
        dbAct = await prisma.productionActivity.create({
          data: { name: a.name, categoryId: dbCat.id, weight: 1.0 },
        });
      }

      // Custos
      await prisma.activityUnitCost.upsert({
        where: {
          projectId_activityId: { projectId: project.id, activityId: dbAct.id },
        },
        update: { unitPrice: a.price, measureUnit: a.unit },
        create: {
          projectId: project.id,
          activityId: dbAct.id,
          unitPrice: a.price,
          measureUnit: a.unit,
        },
      });
    }
  }

  // 4. Simular Produção
  const towers = await prisma.mapElementTechnicalData.findMany({
    where: { projectId: project.id, elementType: "TOWER" },
    take: 50,
  });
  const teams = await prisma.team.findMany({
    where: { companyId },
    take: 10,
    include: { supervisor: true },
  });
  const allActivities = await prisma.productionActivity.findMany({
    where: {
      category: { name: { in: ["SERVIÇOS PRELIMINARES", "FUNDAÇÕES"] } },
    },
  });

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 20);

  console.log(`Simulando produção para ${towers.length} torres...`);

  for (const tower of towers) {
    for (const act of allActivities) {
      // Cronograma (Obrigatório para Pareto)
      const pStart = new Date(startDate);
      const pEnd = new Date(startDate);
      pEnd.setDate(pEnd.getDate() + 15);

      await prisma.activitySchedule.create({
        data: {
          elementId: tower.id,
          activityId: act.id,
          plannedStart: pStart,
          plannedEnd: pEnd,
          plannedQuantity: 1,
          plannedHhh: 8,
          createdById: systemUser.id,
        },
      });

      // Status e Produção Real
      if (Math.random() > 0.4) {
        const team = teams[Math.floor(Math.random() * teams.length)];
        const isFinished = Math.random() > 0.6;
        const workDate = new Date(startDate);
        workDate.setDate(workDate.getDate() + Math.floor(Math.random() * 10));

        await prisma.mapElementProductionProgress.upsert({
          where: {
            elementId_activityId: { elementId: tower.id, activityId: act.id },
          },
          create: {
            projectId: project.id,
            elementId: tower.id,
            activityId: act.id,
            currentStatus: isFinished ? "FINISHED" : "IN_PROGRESS",
            progressPercent: isFinished ? 100 : 50,
            startDate: pStart,
            endDate: isFinished ? workDate : null,
            dailyProduction: {
              [workDate.toISOString().split("T")[0]]: {
                date: workDate.toISOString(),
                teamId: team.id,
                workersCount: 4,
                hoursWorked: 8,
                producedQuantity: isFinished ? 1 : 0.5,
                leadName: team.supervisor?.name || "Encarregado Geral",
              },
            },
          },
          update: {},
        });
      }
    }
  }

  console.log("--- RE-SIMULAÇÃO CONCLUÍDA COM SUCESSO! ---");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
