import { PrismaClient } from '@prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";
import { fakerPT_BR as faker } from '@faker-js/faker';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('--- Iniciando Geração de 90 Funcionários ---');

  // 1. Obter Vínculos Padrão
  const project = await prisma.project.findFirst({
    include: {
      sites: true
    }
  });

  if (!project) {
    console.error('Nenhum projeto encontrado para vincular os funcionários.');
    return;
  }

  const companyId = project.companyId;
  const siteId = project.sites[0]?.id || null;

  console.log(`Vinculando ao Projeto: ${project.name} (Site: ${project.sites[0]?.name || 'N/A'})`);

  const jobFunctions = await prisma.jobFunction.findMany();
  const getJobFunction = () => jobFunctions[Math.floor(Math.random() * jobFunctions.length)]?.id || null;

  const generateCPF = () => {
    const n = () => Math.floor(Math.random() * 9);
    const d1 = n(), d2 = n(), d3 = n(), d4 = n(), d5 = n(), d6 = n(), d7 = n(), d8 = n(), d9 = n();
    // Simplified CPF generator (just for uniqueness/simulation)
    return `${d1}${d2}${d3}${d4}${d5}${d6}${d7}${d8}${d9}${n()}${n()}`;
  };

  const createEmployee = async (gender: 'female' | 'male') => {
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet.email({ firstName, lastName }).toLowerCase();
    const registrationNumber = Math.floor(100000 + Math.random() * 900000).toString();
    const cpf = generateCPF();
    const phone = faker.phone.number();
    
    // Create User
    const user = await prisma.user.create({
      data: {
        name: fullName,
        registrationNumber: registrationNumber,
        cpf: cpf,
        phone: phone,
        gender: gender === 'female' ? 'F' : 'M',
        birthDate: faker.date.between({ from: '1970-01-01', to: '2005-01-01' }).toISOString().split('T')[0],
        laborType: 'MOD',
        hierarchyLevel: 10,
        functionId: getJobFunction(),
      }
    });

    // Create Auth Credential
    await prisma.authCredential.create({
      data: {
        userId: user.id,
        email: email,
        password: '$2a$10$y6BPr.RE7vN/g4eS.X9MFeUpvXF7sV7Jk.eG9yK9A0oW9oW9oW9oW', // hash for "123456"
        role: 'WORKER',
        status: 'ACTIVE',
        systemUse: true
      }
    });

    // Create User Affiliation
    await prisma.userAffiliation.create({
      data: {
        userId: user.id,
        companyId: companyId,
        projectId: project.id,
        siteId: siteId
      }
    });

    return fullName;
  };

  console.log('Gerando 20 funcionárias femininas...');
  for (let i = 0; i < 20; i++) {
    const name = await createEmployee('female');
    if (i % 5 === 0) console.log(`  [${i+1}/20] Criada: ${name}`);
  }

  console.log('Gerando 70 funcionários masculinos...');
  for (let i = 0; i < 70; i++) {
    const name = await createEmployee('male');
    if (i % 10 === 0) console.log(`  [${i+1}/70] Criado: ${name}`);
  }

  console.log('--- Geração Concluída com Sucesso! ---');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
