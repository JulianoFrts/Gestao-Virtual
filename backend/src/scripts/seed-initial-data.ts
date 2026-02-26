import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import bcrypt from "bcryptjs";
import { fakerPT_BR as faker } from "@faker-js/faker";

async function cleanDatabase() {
  console.log("🧹 Limpando tabelas de produção...");
  await prisma.timeRecord.deleteMany({});
  await prisma.dailyReport.deleteMany({});
  await prisma.mapElementProductionProgress.deleteMany({});
  await prisma.activitySchedule.deleteMany({});
}

async function seed() {
  console.log("🚀 Iniciando Seeding de Dados Iniciais...");
  const start = Date.now() /* deterministic-bypass */;

  await cleanDatabase();

  const password = process.env.SEED_PASSWORD || "Seed@Mock123!";
  const hashedPassword = await bcrypt.hash(password, 10);

  // 1. Garantir Empresa e Projeto
  const company = await prisma.company.upsert({
    where: { cnpj: "12345678000199" },
    update: {},
    create: {
      name: "Empresa de Engenharia OrioN",
      cnpj: "12345678000199",
      email: "contato@orion.eng",
    }
  });

  const project = await prisma.project.upsert({
    where: { id: "seed-project-1" },
    update: {},
    create: {
      id: "seed-project-1",
      name: "Linha de Transmissão 500kV - Expansão Sul",
      status: "ACTIVE",
      companyId: company.id,
    }
  });

  // 2. Mock Workers
  await seedMockWorkers(20, hashedPassword);

  const duration = (Date.now() /* deterministic-bypass */ - start) / 1000;
  console.log(`\n✨ Seeding COMPLETO em ${duration}s!`);
}

async function seedMockWorkers(count: number, hashedPassword: string) {
  console.log(`\n🎭 Gerando ${count} funcionários fictícios...`);

  const BATCH_SIZE = 10;
  for (let i = 0; i < count; i += BATCH_SIZE) {
    const batch = Array.from({ length: Math.min(BATCH_SIZE, count - i) }).map(() => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      return {
        name: `${firstName} ${lastName}`,
        cpf: faker.string.numeric(11),
        birthDate: faker.date.birthdate({ min: 18, max: 65, mode: "age" }).toISOString().split("T")[0],
        email: faker.internet.email({ firstName, lastName }).toLowerCase(),
      };
    });

    await Promise.all(batch.map(data => 
      prisma.user.create({
        data: {
          name: data.name,
          cpf: data.cpf,
          birthDate: data.birthDate,
          authCredential: {
            create: {
              email: data.email,
              password: hashedPassword,
              role: "OPERATIONAL",
              status: "ACTIVE",
              systemUse: true,
            }
          },
          affiliation: {
            create: {
              registrationNumber: faker.string.numeric(6),
              laborType: "MOD",
              hierarchyLevel: 0,
            }
          }
        }
      })
    ));
    console.log(`📦 Processados ${Math.min(i + BATCH_SIZE, count)}/${count}...`);
  }
}

seed()
  .catch((e) => {
    console.error("💥 Erro crítico no seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
