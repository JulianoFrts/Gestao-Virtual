const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log(
    "🚀 Ajustando vínculos de usuário e limpando dados inconsistentes...",
  );

  // 1. Limpar empresas com dados "0" ou IDs estranhos que podem travar o sistema
  const badCompanies = await prisma.company.deleteMany({
    where: {
      OR: [{ id: "321321" }, { taxId: "0" }, { name: "0" }],
    },
  });
  console.log(`🗑️ Removidas ${badCompanies.count} empresas inconsistentes.`);

  // 2. Garantir Empresa Matriz
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

  // 3. Vincular julianogitiz@gmail.com
  const user = await prisma.user.update({
    where: { email: "julianogitiz@gmail.com" },
    data: {
      companyId: company.id,
      role: "Admin",
      status: "ACTIVE",
    },
  });
  console.log(`✅ Usuário ${user.email} vinculado à empresa ${company.name}.`);

  console.log("\n--- AJUSTE CONCLUÍDO ---");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
