import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";
import * as dotenv from "dotenv";
import path from "path";

// Carregar .env explicitamente do diretório raiz
dotenv.config({ path: path.join(process.cwd(), ".env") });

const prisma = new PrismaClient();

async function run() {
  console.log(
    "🚀 INICIANDO ANÔNIMIZAÇÃO E PADRONIZAÇÃO DE MÃO DE OBRA DEFINITIVA...",
  );

  try {
    // 1. Obter ou Criar função padrão
    let directBase = await prisma.jobFunction.findFirst({
      where: { name: { contains: "Montador", mode: "insensitive" } },
    });

    if (!directBase) {
      console.log("Criando função padrão de Montador...");
      directBase = await prisma.jobFunction.create({
        data: {
          name: "Montador de Estruturas",
          canLeadTeam: false,
          companyId: (await prisma.company.findFirst())?.id || "",
          hierarchyLevel: 1,
        },
      });
    }

    // 2. Padronizar JobFunctions para suportar MOD/MOI
    const allFunctions = await prisma.jobFunction.findMany();
    console.log(`Padronizando ${allFunctions.length} tipos de cargo...`);

    for (const fn of allFunctions) {
      let officialName = fn.name;
      let canLead = fn.canLeadTeam;

      const n = fn.name.toLowerCase();
      if (n.includes("montador")) officialName = "Montador Especialista";
      else if (n.includes("encarregado")) {
        officialName = "Encarregado de Obras";
        canLead = true;
      } else if (n.includes("tecnico")) officialName = "Técnico de Campo";
      else if (n.includes("engenheiro")) {
        officialName = "Engenheiro de Produção";
        canLead = true;
      } else if (n.includes("ajudante") || n.includes("auxiliar"))
        officialName = "Ajudante Geral";
      else if (n.includes("supervisor")) {
        officialName = "Supervisor de Área";
        canLead = true;
      } else if (n.includes("mestre")) {
        officialName = "Mestre de Obras";
        canLead = true;
      } else if (n.includes("adm") || n.includes("administrativo"))
        officialName = "Assistente Administrativo";

      await prisma.jobFunction.update({
        where: { id: fn.id },
        data: {
          name: officialName,
          canLeadTeam: canLead,
        },
      });
    }

    // 3. Anônimizar usuários e garantir que tenham função
    const users = await prisma.user.findMany({
        include: { authCredential: true }
    });
    console.log(`Anônimizando ${users.length} usuários...`);

    let count = 0;
    for (const user of users) {
      const email = user.authCredential?.email;
      const role = user.authCredential?.role;

      if (email === "admin@orion.com" || role === "SUPER_ADMIN_GOD")
        continue;

      const fakeFirstName = faker.person.firstName();
      const fakeLastName = faker.person.lastName();
      const fullName = `${fakeFirstName} ${fakeLastName}`;
      const fakeEmail = faker.internet
        .email({ firstName: fakeFirstName, lastName: fakeLastName })
        .toLowerCase();

      await prisma.user.update({
        where: { id: user.id },
        data: {
          name: fullName,
          cpf: faker.helpers.replaceSymbols("###.###.###-##"),
          phone: faker.helpers.replaceSymbols("(##) 9####-####"),
          registrationNumber: faker.helpers.replaceSymbols("RE#####"),
          functionId: user.functionId || directBase?.id,
          authCredential: {
              update: {
                  email: fakeEmail
              }
          }
        },
      });
      count++;
      if (count % 200 === 0) console.log(`${count} usuários processados...`);
    }

    console.log(
      `✅ SUCESSO ABSOLUTO: ${count} usuários anônimizados e cargos padronizados.`,
    );
  } catch (e) {
    console.error("❌ ERRO NA OPERAÇÃO:", e);
  } finally {
    await prisma.$disconnect();
  }
}

run();
