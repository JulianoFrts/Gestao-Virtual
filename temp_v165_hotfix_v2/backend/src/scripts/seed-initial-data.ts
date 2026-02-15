import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import bcrypt from "bcryptjs";
import { fakerPT_BR as faker } from "@faker-js/faker";

async function cleanDatabase() {
  console.log("🧹 Limpando tabelas existentes...");
  // Ordem reversa de dependências
  await prisma.userAffiliation.deleteMany({});
  await prisma.authCredential.deleteMany({});
  await prisma.site.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.userAddress.deleteMany({});
  await prisma.user.deleteMany({});
}

async function seedAdminUsers(hashedPassword: string) {
  const adminUsers = [
    {
      email: "juliano@gestaovirtual.com",
      name: "Juliano Freitas",
      role: "SUPER_ADMIN_GOD" as const,
    },
    {
      email: "socio@gestaovirtual.com",
      name: "Socio (Gestão Global)",
      role: "SOCIO_DIRETOR" as const,
    },
    {
      email: "admin@gestaovirtual.com",
      name: "Admin (Gestão Global)",
      role: "ADMIN" as const,
    },
    {
      email: "ti@gestaovirtual.com",
      name: "Suporte Técnico (Gestão Global)",
      role: "TI_SOFTWARE" as const,
    },
    {
      email: "pm@gestaovirtual.com",
      name: "GESTOR DE PROJETO (Gestão Global)",
      role: "GESTOR_PROJECT" as const,
    },
    {
      email: "pc@gestaovirtual.com",
      name: "GESTOR DE CANTEIRO (Gestão Global)",
      role: "GESTOR_CANTEIRO" as const,
    },
    {
      email: "trabalhador@gestaovirtual.com",
      name: "TRABALHADOR (Gestão Global)",
      role: "WORKER" as const,
    },
  ];

  console.log("👥 Criando usuários administrativos...");

  for (const admin of adminUsers) {
    try {
      await prisma.user.create({
        data: {
          name: admin.name,
          createdAt: new Date(),
          updatedAt: new Date(),
          authCredential: {
            create: {
              email: admin.email,
              password: hashedPassword,
              role: admin.role,
              status: "ACTIVE",
              systemUse: true,
            },
          },
          affiliation: {
            create: {},
          },
        },
      });
      console.log(`✅ Admin criado: ${admin.email}`);
    } catch (error) {
      console.error(`❌ Erro ao criar admin ${admin.email}:`, error);
    }
  }
}

async function seedMockWorkers(count: number, hashedPassword: string) {
  console.log(`\n🎭 Gerando ${count} funcionários fictícios...`);

  for (let i = 0; i < count; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();

    // Gerar CPF fictício (limpo conforme o esquema espera)
    const cpf = faker.string.numeric(11);

    try {
      await prisma.user.create({
        data: {
          name: fullName,
          cpf: cpf,
          birthDate: faker.date.birthdate({ min: 18, max: 65, mode: "age" }).toISOString().split('T')[0],
          registrationNumber: faker.string.numeric(6),
          createdAt: new Date(),
          updatedAt: new Date(),
          authCredential: {
            create: {
              email: email,
              password: hashedPassword,
              role: "WORKER",
              status: "ACTIVE",
              systemUse: true,
            },
          },
          affiliation: {
            create: {},
          },
          // O endereço agora é uma tabela separada (UserAddress)
          address: {
            create: {
              cep: "12345-678",
              street: faker.location.streetAddress(),
              neighborhood: "Centro",
              city: faker.location.city(),
              stateCode: "SP",
              stateName: "São Paulo"
            }
          }
        },
      });
      if ((i + 1) % 10 === 0)
        console.log(`📦 Processados ${i + 1}/${count} funcionários...`);
    } catch (_error) {
      console.error(`❌ Erro ao criar mock worker ${i}:`, _error);
      continue;
    }
  }
}

async function seedProjectInfrastructure() {
  console.log("🏗️ Criando infraestrutura de projetos e canteiros...");
  
  const company = await prisma.company.create({
    data: {
      name: "OrioN Energia S.A.",
      taxId: "12345678000199",
      isActive: true,
    }
  });

  const project = await prisma.project.create({
    data: {
      name: "LT 500kV Araraquara - Taubaté",
      code: "LT-ATA-500",
      description: "Linha de Transmissão de 500kV conectando Araraquara a Taubaté",
      status: "active",
      companyId: company.id,
      startDate: new Date("2024-01-01"),
      endDate: new Date("2025-12-31"),
    }
  });

  const sites = [
    { name: "Canteiro Central - Araraquara", code: "CC-ARA" },
    { name: "Frente de Serviço 01 - São Carlos", code: "FS-SCA" },
    { name: "Frente de Serviço 02 - Rio Claro", code: "FS-RCL" },
    { name: "Canteiro de Apoio - Taubaté", code: "CA-TAU" },
  ];

  for (const siteData of sites) {
    await prisma.site.create({
      data: {
        name: siteData.name,
        code: siteData.code,
        projectId: project.id,
      }
    });
  }

  return { companyId: company.id, projectId: project.id };
}

async function seedTeams(companyId: string, projectId: string, workers: any[]) {
  console.log("👷 Criando equipes e associando membros...");
  
  const sites = await prisma.site.findMany({ where: { projectId } });
  if (sites.length === 0) return [];

  const teamsData = [
    { name: "Equipe Alpha (Fundação)", laborType: "OWN" },
    { name: "Equipe Beta (Montagem)", laborType: "OWN" },
    { name: "Equipe Gama (Lançamento)", laborType: "OUTSOURCED" },
    { name: "Equipe Delta (Civil)", laborType: "OWN" },
  ];

  const createdTeams = [];

  for (const [index, teamData] of teamsData.entries()) {
    const site = sites[index % sites.length];
    
    // Pegar um subconjunto de trabalhadores
    const teamWorkers = workers.slice(index * 10, (index + 1) * 10);
    if (teamWorkers.length === 0) continue;

    const team = await prisma.team.create({
      data: {
        name: teamData.name,
        companyId,
        siteId: site.id,
        isActive: true,
        laborType: teamData.laborType,
        members: {
          create: teamWorkers.map(w => ({
            userId: w.id
          }))
        }
      },
      include: { members: true }
    });
    createdTeams.push(team);
    console.log(`✅ Equipe criada: ${team.name} com ${teamWorkers.length} membros`);
  }

  return createdTeams;
}

async function seedTimeRecords(workers: any[], companyId: string) {
  console.log("⏰ Gerando registros de ponto (TimeRecords)...");
  
  const daysFn = [0, 1, 2, 3, 4]; // Hoje e 4 dias atrás
  let totalRecords = 0;

  for (const worker of workers) {
    for (const daysAgo of daysFn) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      // Random start time (07:00 - 09:00)
      const startHour = faker.number.int({ min: 7, max: 9 });
      const startMin = faker.number.int({ min: 0, max: 59 });
      const entryDate = new Date(date);
      entryDate.setHours(startHour, startMin, 0);

      // Random exit time (16:00 - 18:00)
      const exitHour = faker.number.int({ min: 16, max: 18 });
      const exitMin = faker.number.int({ min: 0, max: 59 });
      const exitDate = new Date(date);
      exitDate.setHours(exitHour, exitMin, 0);

      // Create Entry
      await prisma.timeRecord.create({
        data: {
          userId: worker.id,
          companyId,
          recordType: "entry",
          recordedAt: entryDate,
          latitude: -23.550520,
          longitude: -46.633308,
          createdById: worker.id // Self reported
        }
      });

      // Create Exit (sometimes missing to simulate real data)
      if (Math.random() > 0.1) {
        await prisma.timeRecord.create({
          data: {
            userId: worker.id,
            companyId,
            recordType: "exit",
            recordedAt: exitDate,
            latitude: -23.550520,
            longitude: -46.633308,
            createdById: worker.id
          }
        });
        totalRecords += 2;
      } else {
        totalRecords += 1;
      }
    }
  }
  console.log(`✨ Criados ${totalRecords} registros de ponto.`);
}

async function seedDailyReports(teams: any[], companyId: string) {
  console.log("📋 Gerando relatórios diários de obra (RDO)...");
  
  const daysFn = [0, 1, 2, 3]; // Últimos 4 dias
  let totalReports = 0;

  for (const team of teams) {
    for (const daysAgo of daysFn) {
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);

      await prisma.dailyReport.create({
        data: {
          teamId: team.id,
          companyId,
          reportDate: date,
          activities: faker.lorem.paragraph(),
          observations: Math.random() > 0.7 ? faker.lorem.sentence() : null,
          createdBy: "System Seed",
          metadata: {
            weather: "Sunny",
            temperature: "25C"
          }
        }
      });
      totalReports++;
    }
  }
  console.log(`✨ Criados ${totalReports} relatórios diários.`);
}

async function seed() {
  console.log("🌱 Iniciando seeding completo do banco de dados...");
  const startTime = Date.now();

  const defaultPassword = "orion123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await cleanDatabase();
  const { companyId, projectId } = await seedProjectInfrastructure();
  await seedAdminUsers(hashedPassword);
  
  // Need to fetch created workers to link them
  await seedMockWorkers(50, hashedPassword); // Reduced to 50 for speed
  const workers = await prisma.user.findMany({ 
    where: { authCredential: { role: 'WORKER' } } 
  });

  const teams = await seedTeams(companyId, projectId, workers);
  await seedTimeRecords(workers, companyId);
  await seedDailyReports(teams, companyId);

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\n✨ Seeding COMPLETO em ${duration}s!`);
}

seed()
  .catch((e) => {
    console.error("💥 Erro crítico no seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
