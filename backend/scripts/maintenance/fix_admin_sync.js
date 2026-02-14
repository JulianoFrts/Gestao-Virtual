const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: "julianogitiz@gmail.com" },
  });

  if (!user) {
    console.log("❌ Usuário julianogitiz@gmail.com não encontrado!");
    return;
  }

  console.log(`Promovendo Juliano (ID: ${user.id})...`);

  // 1. Atualizar tabela User
  await prisma.user.update({
    where: { id: user.id },
    data: {
      role: "Admin", // Enum Role (PascalCase)
      status: "ACTIVE",
    },
  });

  // 2. Atualizar ou Criar na tabela UserRole
  await prisma.userRole.upsert({
    where: { userId: user.id },
    update: { role: "admin" }, // Enum AppRole (lowercase)
    create: {
      userId: user.id,
      role: "admin",
    },
  });

  console.log("✅ Juliano agora é Admin em AMBAS as tabelas!");

  const allUsers = await prisma.user.findMany({
    select: { email: true, role: true },
  });
  console.log("Estado atual dos usuários:", allUsers);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
