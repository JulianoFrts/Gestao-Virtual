import { PrismaClient } from "@prisma/client";
import { fakerPT_BR as faker } from "@faker-js/faker";

const prisma = new PrismaClient();

async function cleanSweepAnonymization() {
  process.stdout.write(
    "--- OPERAÇÃO: ANÔNIMIZAÇÃO TOTAL E LIMPEZA DE CARGOS ---\n",
  );

  try {
    // 1. Garantir que existam cargos básicos se necessário
    const basicFunction = await prisma.jobFunction.findFirst({
      where: { name: { contains: "Montador", mode: "insensitive" } },
    });

    const defaultFunctionId = basicFunction?.id;

    // 2. Corrigir Funções (JobFunctions) para serem genéricas
    const functions = await prisma.jobFunction.findMany();
    process.stdout.write(`Processando ${functions.length} cargos...\n`);

    for (const fn of functions) {
      let fakeName = fn.name;

      if (fn.name.toLowerCase().includes("montador"))
        fakeName = "Montador Especialista";
      else if (fn.name.toLowerCase().includes("encarregado"))
        fakeName = "Encarregado de Obra";
      else if (fn.name.toLowerCase().includes("tecnico"))
        fakeName = "Técnico de Campo";
      else if (fn.name.toLowerCase().includes("engenheiro"))
        fakeName = "Engenheiro Residente";
      else if (fn.name.toLowerCase().includes("auxiliar"))
        fakeName = "Ajudante Geral";
      else if (fn.name.toLowerCase().includes("almoxarife"))
        fakeName = "Almoxarife Pleno";

      const shouldLead =
        fn.name.toLowerCase().includes("encarregado") ||
        fn.name.toLowerCase().includes("supervisor") ||
        fn.name.toLowerCase().includes("lider") ||
        fn.name.toLowerCase().includes("engenheiro");

      await prisma.jobFunction.update({
        where: { id: fn.id },
        data: {
          name: fakeName,
          canLeadTeam: shouldLead,
        },
      });
    }

    // 3. Anônimizar Usuários e garantir JobFunction
    const users = await prisma.user.findMany();
    process.stdout.write(`Anônimizando ${users.length} usuários...\n`);

    let count = 0;
    for (const user of users) {
      // Não anônimiza o admin principal
      if (user.email === "admin@orion.com" || user.role === "SUPER_ADMIN_GOD") {
        continue;
      }

      const fakeFirstName = faker.person.firstName();
      const fakeLastName = faker.person.lastName();
      const fullName = `${fakeFirstName} ${fakeLastName}`;
      const fakeEmail = faker.internet
        .email({ firstName: fakeFirstName, lastName: fakeLastName })
        .toLowerCase();

      const updateData = {
        name: fullName,
        email: fakeEmail,
        cpf: faker.helpers.replaceSymbolWithNumber("###.###.###-##"),
        phone: faker.helpers.replaceSymbolWithNumber("(##) 9####-####"),
        registrationNumber: faker.helpers.replaceSymbolWithNumber("RE#####"),
      };

      // Se o usuário não tem função, atribui uma padrão ou a primeira do banco
      if (!user.functionId && defaultFunctionId) {
        updateData.functionId = defaultFunctionId;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      count++;
      if (count % 100 === 0)
        process.stdout.write(`${count} usuários processados...\n`);
    }

    process.stdout.write(
      `--- SUCESSO: ${count} usuários e ${functions.length} cargos processados! ---\n`,
    );
  } catch (err) {
    process.stderr.write(`Falha na operação clean-sweep: ${err.message}\n`);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

cleanSweepAnonymization();
