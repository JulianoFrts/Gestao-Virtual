import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";
import { JOB_HIERARCHY, PASSWORD_HASHES } from "../src/lib/constants/business";

console.log("Using DATABASE_URL:", process.env.DATABASE_URL);
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log("🚀 Iniciando Simulação - Projeto LA TESTE");

  // 1. Setup Company & Project
  let company = await prisma.company.findFirst({
    where: { name: "Orion Transmissão Simulada" },
  });
  if (!company) {
    company = await prisma.company.create({
      data: {
        name: "Orion Transmissão Simulada",
        address: "Simulated Address, BR",
        isActive: true,
        taxId: "00.000.000/0001-99",
      },
    });
    console.log("✅ Empresa criada:", company.name);
  }

  let project = await prisma.project.findFirst({
    where: { name: "LA TESTE", companyId: company.id },
  });
  if (!project) {
    project = await prisma.project.create({
      data: {
        name: "LA TESTE",
        code: "LAT-001",
        companyId: company.id,
        status: "active",
        description: "Projeto Simulado de Linha de Transmissão",
        estimatedCost: 15000000,
        plannedHours: 50000,
      },
    });
    console.log("✅ Projeto criado:", project.name);
  }

  const site = await prisma.site.create({
    data: {
      name: "Canteiro Principal",
      projectId: project.id,
      code: "CAN-01",
    },
  });

  // 2. Job Functions (Transmission Line Specific)
  const functionsList = [
    { name: "Encarregado de Linha Viva", level: JOB_HIERARCHY.LEADER }, // 3? Leader is 4 in our const, Engineer 3. 
    // Wait, let's map roughly. 
    // "Encarregado" -> LEADER (4). The seed used 3. 
    // "Montador" -> OPERATOR (6) or SKILLED (8). Seed used 2 (Coordinator??).
    // The seed levels 1, 2, 3 seem inverted or different scale.
    // 1 (Helper), 2 (Motorista/Montador/Operador), 3 (Encarregado/Topógrafo/Técnico).
    // This seed uses 1 = LOWEST, 3 = HIGHEST (canLeadTeam >= 3).
    // Our JOB_HIERARCHY has 1 = HIGHEST (Manager), 11 = LOWEST.
    // I MUST NOT uses JOB_HIERARCHY blindly here if the logic is inverted.

    // Let's check logic: `canLeadTeam: func.level >= 3`.
    // If I use JOB_HIERARCHY (1=High), then `canLeadTeam: level <= 4` (Leader and above).

    // So I should map:
    // "Ajudante Geral" (old 1) -> JOB_HIERARCHY.HELPER (11)
    // "Montador" (old 2) -> JOB_HIERARCHY.SKILLED (8) or JOB_HIERARCHY.OPERATOR (6)
    // "Encarregado" (old 3) -> JOB_HIERARCHY.LEADER (4)

    // New List using CONSTANTS:
    { name: "Encarregado de Linha Viva", level: JOB_HIERARCHY.LEADER },
    { name: "Montador de Torre", level: JOB_HIERARCHY.SKILLED },
    { name: "Ajudante Geral", level: JOB_HIERARCHY.HELPER },
    { name: "Operador de Guindaste", level: JOB_HIERARCHY.OPERATOR },
    { name: "Topógrafo", level: JOB_HIERARCHY.TECHNICIAN },
    { name: "Técnico de Segurança", level: JOB_HIERARCHY.TECHNICIAN },
    { name: "Motorista de Caminhão", level: JOB_HIERARCHY.OPERATOR },
  ];

  const jobFunctions = [];
  for (const func of functionsList) {
    let jf = await prisma.jobFunction.findFirst({
      where: { name: func.name, companyId: company.id },
    });
    if (!jf) {
      jf = await prisma.jobFunction.create({
        data: {
          name: func.name,
          companyId: company.id,
          hierarchyLevel: func.level,
          canLeadTeam: func.level <= JOB_HIERARCHY.LEADER, // Changed logic to match standard hierarchy
        },
      });
    }
    jobFunctions.push(jf);
  }
  console.log("✅ Funções criadas/recuperadas");

  // 3. Create 550 Employees
  // 3. Create 550 Employees
  console.log("👥 Gerando 550 funcionários...");
  // const usersData = []; // Removed
  for (let i = 0; i < 550; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const randomJob =
      jobFunctions[Math.floor(Math.random() * jobFunctions.length)];

    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    await prisma.user.create({
      data: {
        name: `${firstName} ${lastName}`,
        hierarchyLevel: 0,
        functionId: randomJob.id,
        authCredential: {
          create: {
            email,
            password: "$2b$10$EpI/f.f Q.q.q.q.q.q.q",
            role: "USER",
            status: "ACTIVE"
          }
        },
        affiliation: {
          create: {
            companyId: company.id,
            projectId: project.id,
            siteId: site.id
          }
        },
        registrationNumber: `REG-${1000 + i}`,
        cpf: faker.number.int({ min: 10000000000, max: 99999999999 }).toString()
      }
    });

    // usersData.push({ ... }); // Removed
  }

  // Insert safely in batches - REMOVIDO pois createMany não suporta nested
  console.log("✅ 550 Funcionários cadastrados");

  // 4. Production Activities & Costs
  const categories = [
    { name: "Fundação", order: 1 },
    { name: "Montagem", order: 2 },
    { name: "Lançamento de Cabos", order: 3 },
  ];

  const activitiesList = [
    {
      name: "Escavação Manual",
      cat: "Fundação",
      unit: "m³",
      price: 150.0,
      weight: 5,
    },
    {
      name: "Concretagem",
      cat: "Fundação",
      unit: "m³",
      price: 450.0,
      weight: 10,
    },
    {
      name: "Montagem de Estrutura",
      cat: "Montagem",
      unit: "kg",
      price: 12.5,
      weight: 15,
    },
    {
      name: "Torqueamento",
      cat: "Montagem",
      unit: "un",
      price: 500.0,
      weight: 2,
    },
    {
      name: "Lançamento Cabo Condutor",
      cat: "Lançamento de Cabos",
      unit: "km",
      price: 5000.0,
      weight: 20,
    },
    {
      name: "Lançamento Cabo Para-raios",
      cat: "Lançamento de Cabos",
      unit: "km",
      price: 3000.0,
      weight: 10,
    },
  ];

  for (const catData of categories) {
    let category = await prisma.productionCategory.findFirst({
      where: { name: catData.name },
    });
    if (!category) {
      category = await prisma.productionCategory.create({
        data: { name: catData.name, order: catData.order },
      });
    }

    const catActs = activitiesList.filter((a) => a.cat === catData.name);
    for (const actData of catActs) {
      let activity = await prisma.productionActivity.findFirst({
        where: { name: actData.name, categoryId: category.id },
      });
      if (!activity) {
        activity = await prisma.productionActivity.create({
          data: {
            name: actData.name,
            categoryId: category.id,
            weight: actData.weight,
          },
        });
      }

      // Unit Cost
      await prisma.activityUnitCost.upsert({
        where: {
          projectId_activityId: {
            projectId: project.id,
            activityId: activity.id,
          },
        },
        update: { unitPrice: actData.price, measureUnit: actData.unit },
        create: {
          projectId: project.id,
          activityId: activity.id,
          unitPrice: actData.price,
          measureUnit: actData.unit,
        },
      });
    }
  }
  console.log("✅ Atividades e Custos configurados");

  // 5. Towers (Simulation Data)
  console.log("🏗️ Gerando 50 Torres...");
  const towersData = [];
  for (let i = 1; i <= 50; i++) {
    towersData.push({
      projectId: project.id,
      companyId: company.id,
      elementType: 'TOWER',
      externalId: `T-${i.toString().padStart(3, "0")}/${i}`, // Was objectId
      metadata: {
        towerType: Math.random() > 0.5 ? "Suspension" : "Tension",
        objectHeight: 25 + Math.random() * 20,
        totalConcreto: 15 + Math.random() * 10,
        pesoEstrutura: 5000 + Math.random() * 2000,
        trecho: "Trecho 01",
      },
    });
  }
  await prisma.mapElementTechnicalData.createMany({
    data: towersData as any,
    skipDuplicates: true,
  });
  console.log("✅ Torres criadas");

  // 6. Simulate Execution
  console.log("🚀 Simulando execução de atividades...");
  const towers = await prisma.mapElementTechnicalData.findMany({
    where: { projectId: project.id, elementType: 'TOWER' },
  });
  const activities = await prisma.productionActivity.findMany();

  // Get some users to be foremen
  const userList = await prisma.user.findMany({
    where: { affiliation: { companyId: company.id } },
    take: 20,
  });

  for (const tower of towers) {
    for (const activity of activities) {
      // Randomly decide status
      const rand = Math.random();
      let status = "PENDING";
      let progress = 0;

      if (rand > 0.7) {
        status = "FINISHED";
        progress = 100;
      } else if (rand > 0.4) {
        status = "IN_PROGRESS";
        progress = Math.floor(Math.random() * 90);
      }

      if (status !== "PENDING") {
        await prisma.mapElementProductionProgress.upsert({
          where: {
            elementId_activityId: {
              elementId: tower.id,
              activityId: activity.id,
            },
          },
          update: { currentStatus: status as any, progressPercent: progress },
          create: {
            projectId: project.id,
            elementId: tower.id,
            activityId: activity.id,
            currentStatus: status as any,
            progressPercent: progress,
            startDate: new Date(),
            dailyProduction: {
              [new Date().toISOString().split('T')[0]]: {
                date: new Date().toISOString(),
                workersCount: Math.floor(Math.random() * 10) + 2,
                hoursWorked: 8,
                producedQuantity: Math.random() * 10,
                teamId: null,
              }
            }
          },
        });
      }
    }
  }

  console.log("✅ Simulação Completa com Sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
