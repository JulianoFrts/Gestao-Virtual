const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  const email = "julianogitiz@gmail.com";
  const password = "123";
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

  console.log(`✅ Senha resetada para o usuario: ${email}`);
  console.log(`🔑 Nova senha: ${password}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
