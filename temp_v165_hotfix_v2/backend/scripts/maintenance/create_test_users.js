const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require("bcryptjs");

async function main() {
  const usersToCreate = [
    {
      email: "gestor.obra@orion.com",
      name: "Ricardo Gestor",
      role: "GESTOR_PROJECT", // No model User (Role Enum)
      appRole: "worker", // No model UserRole (AppRole Enum - Fallback para worker pois GESTOR_PROJECT não existe no AppRole)
    },
    {
      email: "supervisor.canteiro@orion.com",
      name: "Marcos Supervisor",
      role: "Supervisor", // PascalCase conforme schema.prisma linha 134
      appRole: "worker",
    },
    {
      email: "operador.maquina@orion.com",
      name: "João Trabalhador",
      role: "WORKER",
      appRole: "worker",
    },
    {
      email: "ti.suporte@orion.com",
      name: "Ana TI",
      role: "TI_SOFTWARE",
      appRole: "admin", // TI Software mapeado para admin no appRole
    },
    {
      email: "admin.teste@orion.com",
      name: "Admin Teste",
      role: "Admin", // PascalCase conforme schema.prisma linha 131
      appRole: "admin",
    },
  ];

  const password = await bcrypt.hash("Obrane@2024", 10);

  console.log("Iniciando criação de usuários de teste...");

  for (const u of usersToCreate) {
    try {
      const existing = await prisma.user.findUnique({
        where: { email: u.email },
      });

      if (existing) {
        console.log(
          "--- Usuário " + u.email + " já existe. Atualizando cargos...",
        );
        // Garantir que os cargos estejam sincronizados mesmo se o usuário já existir
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: u.role, status: "ACTIVE" },
        });
        await prisma.userRole.upsert({
          where: { userId: existing.id },
          update: { role: u.appRole },
          create: { userId: existing.id, role: u.appRole },
        });
        continue;
      }

      console.log("Criando " + u.name + " (" + u.email + ")...");
      const newUser = await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          password: password,
          role: u.role,
          status: "ACTIVE",
        },
      });

      await prisma.userRole.upsert({
        where: { userId: newUser.id },
        update: { role: u.appRole },
        create: { userId: newUser.id, role: u.appRole },
      });

      console.log("✅ Criado com sucesso!");
    } catch (err) {
      console.log("❌ Erro em " + u.email + ": " + err.message);
    }
  }

  console.log("Fim do processo.");
}

main()
  .catch((e) => {
    console.error("ERRO FATAL:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
