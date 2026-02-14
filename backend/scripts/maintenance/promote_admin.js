const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = "julianogitiz@gmail.com";
  console.log(`Buscando usuário: ${email}`);
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (user) {
    console.log(`Promovendo usuário: ${user.email} (ID: ${user.id})`);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        role: "ADMIN",
        status: "ACTIVE",
        name: "Juliano Freitas",
      },
    });
    console.log("✅ Usuário promovido com sucesso a Administrador (ADMIN)!");
  } else {
    console.log(`❌ Usuário ${email} não encontrado.`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro ao promover usuário:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
