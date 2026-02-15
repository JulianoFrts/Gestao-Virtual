const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Iniciando Configuração do Sistema...");

  // 1. Criar Empresa Principal com UUID Real
  const company = await prisma.company.upsert({
    where: { taxId: "00000000000199" },
    update: {},
    create: {
      name: "ORION MATRIZ",
      taxId: "00000000000199",
      address: "Av. Industrial, 1000 - Centro",
      phone: "(11) 4002-8922",
      isActive: true,
    },
  });
  console.log("✅ Empresa Matriz configurada:", company.id);

  // 2. Vincular Usuário Principal à Empresa
  const userEmail = "julianogitiz@gmail.com";
  await prisma.user.update({
    where: { email: userEmail },
    data: {
      companyId: company.id,
      role: "Admin", // Garantir que é Admin
      status: "ACTIVE",
    },
  });
  console.log(`✅ Usuário ${userEmail} vinculado à empresa.`);

  // 3. Criar uma Obra de exemplo para teste
  const project = await prisma.project.create({
    data: {
      name: "OBRA LGO - TRECHO 1",
      code: "LGO-001",
      description: "Projeto de Linha de Transmissão",
      status: "active",
      companyId: company.id,
    },
  });
  console.log("✅ Projeto inicial criado:", project.id);

  // 4. Criar um Canteiro para a Obra
  const site = await prisma.site.create({
    data: {
      name: "CANTEIRO CENTRAL LGO",
      code: "CC-01",
      projectId: project.id,
    },
  });
  console.log("✅ Canteiro inicial criado:", site.id);

  console.log("\n--- CONFIGURAÇÃO CONCLUÍDA ---");
}

main()
  .catch((e) => {
    console.error("❌ Erro na configuração:", e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
