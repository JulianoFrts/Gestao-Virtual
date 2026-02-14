const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const email = "julianogitiz@gmail.com";
  const password = "orion123"; // Senha com mais de 6 caracteres conforme solicitado
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      status: "ACTIVE",
      role: "Admin",
    },
    create: {
      email,
      password: hashedPassword,
      name: "Juliano Freitas",
      role: "Admin",
      status: "ACTIVE",
    },
  });

  console.log(`✅ Senha resetada com sucesso!`);
  console.log(`👤 Usuario: ${email}`);
  console.log(`🔑 Nova senha: ${password}`);
  console.log(`⚠️  Dica: Use esta senha agora para logar no sistema.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
