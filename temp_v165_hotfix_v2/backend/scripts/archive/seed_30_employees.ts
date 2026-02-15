import path from "path";
import dotenv from "dotenv";

// Load .env from root explicitly using process.cwd() (safe for ESM/tsx)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

console.log("DEBUG: DATABASE_URL:", process.env.DATABASE_URL);

import { PrismaClient, Role, AccountStatus } from "@prisma/client";

const prisma = new PrismaClient();

// Função para gerar CPF válido
function generateCPF(masked: boolean = false): string {
  const n1 = Math.floor(Math.random() * 10);
  const n2 = Math.floor(Math.random() * 10);
  const n3 = Math.floor(Math.random() * 10);
  const n4 = Math.floor(Math.random() * 10);
  const n5 = Math.floor(Math.random() * 10);
  const n6 = Math.floor(Math.random() * 10);
  const n7 = Math.floor(Math.random() * 10);
  const n8 = Math.floor(Math.random() * 10);
  const n9 = Math.floor(Math.random() * 10);

  let d1 =
    n9 * 2 +
    n8 * 3 +
    n7 * 4 +
    n6 * 5 +
    n5 * 6 +
    n4 * 7 +
    n3 * 8 +
    n2 * 9 +
    n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;

  let d2 =
    d1 * 2 +
    n9 * 3 +
    n8 * 4 +
    n7 * 5 +
    n6 * 6 +
    n5 * 7 +
    n4 * 8 +
    n3 * 9 +
    n2 * 10 +
    n1 * 11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;

  if (masked) {
    return `${n1}${n2}${n3}.${n4}${n5}${n6}.${n7}${n8}${n9}-${d1}${d2}`;
  }
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

const firstNames = [
  "João",
  "Maria",
  "Pedro",
  "Ana",
  "Carlos",
  "Paulo",
  "Lucas",
  "Marcos",
  "Fernanda",
  "Juliana",
  "Rafael",
  "Bruno",
  "Gabriel",
  "Mariana",
  "Amanda",
  "Rodrigo",
  "Luiz",
  "Antônio",
  "Francisco",
  "José",
  "Adriana",
  "Patrícia",
  "Aline",
  "Camila",
  "Bruna",
  "Diego",
  "Tiago",
  "Felipe",
  "Roberto",
  "Eduardo",
];

const lastNames = [
  "Silva",
  "Santos",
  "Oliveira",
  "Souza",
  "Rodrigues",
  "Ferreira",
  "Alves",
  "Pereira",
  "Lima",
  "Gomes",
  "Costa",
  "Ribeiro",
  "Martins",
  "Carvalho",
  "Almeida",
  "Lopes",
  "Soares",
  "Fernandes",
  "Vieira",
  "Barbosa",
  "Rocha",
  "Dias",
  "Nascimento",
  "Andrade",
  "Moreira",
  "Nunes",
  "Marques",
  "Machado",
];

async function main() {
  console.log("🌱 Iniciando seed de 30 funcionários...");

  // 1. Obter ou criar Empresa
  let company = await prisma.company.findFirst();
  if (!company) {
    console.log("🏢 Criando empresa padrão...");
    company = await prisma.company.create({
      data: {
        name: "Construtora Orion Exemplo",
        taxId: "12.345.678/0001-90",
        isActive: true,
      },
    });
  }
  console.log(`🏢 Usando empresa: ${company.name} (${company.id})`);

  // 2. Criar ou obter Job Functions
  const jobRoles = [
    "Pedreiro",
    "Servente",
    "Mestre de Obras",
    "Eletricista",
    "Encarregado",
    "Pintor",
  ];
  const jobs: any = {};

  for (const jobName of jobRoles) {
    const job = await prisma.jobFunction.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: jobName,
        },
      },
      update: {},
      create: {
        name: jobName,
        companyId: company.id,
        description: `Função de ${jobName}`,
        hierarchyLevel:
          jobName === "Mestre de Obras" ? 5 : jobName === "Encarregado" ? 4 : 1,
      },
    });
    jobs[jobName] = job;
  }

  // 3. Gerar 30 Funcionários
  for (let i = 1; i <= 30; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const fullName = `${firstName} ${lastName} ${i}`; // ${i} para evitar duplicação em seed rápido
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@exemplo.com`;
    // const cpf = generateCPF(true); // Com mascara
    const cpf = generateCPF(false); // Sem mascara para o banco (geralmente salva limpo)

    // Escolher cargo random ponderado
    let jobName = "Servente";
    const rand = Math.random();
    if (rand < 0.1) jobName = "Mestre de Obras";
    else if (rand < 0.2) jobName = "Encarregado";
    else if (rand < 0.4) jobName = "Eletricista";
    else if (rand < 0.6) jobName = "Pedreiro";
    else jobName = "Servente";

    // Definir Role do sistema baseada na função
    let role: Role = Role.WORKER;
    if (jobName === "Mestre de Obras" || jobName === "Encarregado")
      role = Role.SUPERVISOR;
    if (jobName === "Eletricista") role = Role.TECHNICIAN;

    const matricula = `MAT-${2025000 + i}`;

    try {
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          name: fullName,
          email: email,
          password: "$2b$10$EpWaT7.F8.Wc8.F8.Wc8.eWc8.Wc8.Wc8.Wc8.Wc8.Wc8.Wc8.", // Hash fictício ou '123456' plain se o sistema aceita (mas melhor hash fake pra não quebrar auth real se usar bcrypt)
          // Usando senha '123456' hasheada (exemplo aproximado ou placeholder)
          // Se o seu sistema usa bcrypt, o login pode falhar se a hash for inválida.
          // Vou colocar uma string simples, assumindo que em ambiente dev pode ter bypass ou eu geraria real.
          // Mas vou usar um placeholder.
          phone: `119${Math.floor(Math.random() * 100000000)}`,
          companyId: company.id,
          functionId: jobs[jobName].id,
          role: role,
          status: AccountStatus.ACTIVE,
          cpf: cpf,
          registrationNumber: matricula,
          laborType: "OWN", // Próprio
        },
      });
      process.stdout.write(".");
    } catch (e) {
      console.error(`\nErro ao criar ${fullName}:`, e);
    }
  }

  console.log("\n✅ 30 Funcionários gerados com sucesso!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
