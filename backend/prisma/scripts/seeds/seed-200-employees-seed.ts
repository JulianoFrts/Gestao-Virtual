import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { fakerPT_BR as faker } from "@faker-js/faker";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const prisma = new PrismaClient();

async function main() {
  console.log("--- Iniciando Geração de 200 Funcionários (SEED) ---");

  // 1. Obter Vínculos (Tentar achar algo relacionado a SEED)
  let project = await prisma.project.findFirst({
    where: {
      OR: [
        { name: { contains: "SEED", mode: "insensitive" } },
        { name: { contains: "OBRA", mode: "insensitive" } },
      ],
    },
    include: {
      sites: true,
    },
  });

  if (!project) {
    console.log(
      "Nenhum projeto SEED ou OBRA encontrado. Pegando o primeiro disponível...",
    );
    project = await prisma.project.findFirst({
      include: {
        sites: true,
      },
    });
  }

  if (!project) {
    console.error("Nenhum projeto encontrado para vincular os funcionários.");
    return;
  }

  const companyId = project.companyId;
  const siteId = project.sites[0]?.id || null;

  console.log(`Vinculando ao Projeto: ${project.name} (ID: ${project.id})`);
  console.log(`Localidade (Site): ${project.sites[0]?.name || "N/A"}`);

  const jobFunctions = await prisma.jobFunction.findMany();
  if (jobFunctions.length === 0) {
    console.error(
      "Nenhuma função (JobFunction) encontrada. Seed de funcionários requer funções.",
    );
    return;
  }

  const getJobFunction = () =>
    jobFunctions[Math.floor(Math.random() * jobFunctions.length)]?.id || null;

  const generateCPF = () => {
    const n = () => Math.floor(Math.random() * 9);
    const d1 = n(),
      d2 = n(),
      d3 = n(),
      d4 = n(),
      d5 = n(),
      d6 = n(),
      d7 = n(),
      d8 = n(),
      d9 = n();
    return `${d1}${d2}${d3}${d4}${d5}${d6}${d7}${d8}${d9}${n()}${n()}`;
  };

  const createEmployee = async (gender: "female" | "male") => {
    const firstName = faker.person.firstName(gender);
    const lastName = faker.person.lastName();
    const fullName = `${firstName} ${lastName}`;
    const email = faker.internet
      .email({ firstName, lastName })
      .toLowerCase()
      .replace(/[^\w.@]/g, "");
    const registrationNumber = `SEED${Math.floor(100000 + Math.random() * 900000)}`;
    const cpf = generateCPF();
    const phone = faker.phone.number();

    // Create User
    const user = await prisma.user.create({
      data: {
        name: fullName,
        registrationNumber: registrationNumber,
        cpf: cpf,
        phone: phone,
        gender: gender === "female" ? "F" : "M",
        birthDate: faker.date
          .between({ from: "1970-01-01", to: "2005-01-01" })
          .toISOString()
          .split("T")[0],
        laborType: Math.random() > 0.2 ? "MOD" : "MOI",
        hierarchyLevel: Math.floor(Math.random() * 10) + 1,
        functionId: getJobFunction(),
      },
    });

    let finalEmail = email;
    let emailExists = await prisma.authCredential.findUnique({
      where: { email: finalEmail },
    });

    let attempt = 1;
    while (emailExists) {
      finalEmail = `${email.split("@")[0]}${attempt}@${email.split("@")[1]}`;
      emailExists = await prisma.authCredential.findUnique({
        where: { email: finalEmail },
      });
      attempt++;
    }

    // Create Auth Credential
    await prisma.authCredential.create({
      data: {
        userId: user.id,
        email: finalEmail,
        password:
          "$2a$10$y6BPr.RE7vN/g4eS.X9MFeUpvXF7sV7Jk.eG9yK9A0oW9oW9oW9oW", // hash par "123456"
        role: "WORKER",
        status: "ACTIVE",
        systemUse: true,
      },
    });

    // Create User Affiliation
    await prisma.userAffiliation.create({
      data: {
        userId: user.id,
        companyId: companyId,
        projectId: project!.id,
        siteId: siteId,
      },
    });

    return fullName;
  };

  const totalToCreate = 200;
  console.log(`Gerando ${totalToCreate} funcionários...`);

  for (let i = 0; i < totalToCreate; i++) {
    const gender = Math.random() > 0.3 ? "male" : "female";
    const name = await createEmployee(gender);
    if ((i + 1) % 20 === 0) {
      console.log(`  [${i + 1}/${totalToCreate}] Criado(a): ${name}`);
    }
  }

  console.log("--- Geração Concluída com Sucesso! ---");
}

main()
  .catch((e) => {
    console.error("Erro no seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
