const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Restaurando Usuário julianogitiz@gmail.com...");

  // 1. Garantir Empresa Matriz
  const company = await prisma.company.upsert({
    where: { taxId: "00000000000199" },
    update: { name: "ORION MATRIZ", isActive: true },
    create: {
      name: "ORION MATRIZ",
      taxId: "00000000000199",
      address: "Av. Industrial, 1000 - Centro",
      phone: "(11) 4002-8922",
      isActive: true,
    },
  });
  console.log("✅ Empresa Matriz OK:", company.id);

  // 2. Criar ou Restaurar Usuário Juliano
  const email = "julianogitiz@gmail.com";
  const password = "orion123";
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      status: "ACTIVE",
      role: "Admin",
      companyId: company.id,
      name: "Juliano Freitas",
    },
    create: {
      email,
      password: hashedPassword,
      name: "Juliano Freitas",
      role: "Admin",
      status: "ACTIVE",
      companyId: company.id,
    },
  });

  console.log(
    `✅ Usuário ${user.email} restaurado e vinculado à ORION MATRIZ.`,
  );
  console.log(`🔑 Senha confirmada: ${password}`);
  console.log("\n--- RESTAURAÇÃO CONCLUÍDA ---");
}

main()
  .catch((e) => {
    console.error("❌ Erro na restauração:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
