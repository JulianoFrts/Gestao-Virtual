/**
 * Seed Admin User - GESTÃO VIRTUAL Backend
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prismaClient = new PrismaClient();

async function main() {
  const email = "admin@orion.com";
  const password = "123123";
  const name = "Administrador";

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prismaClient.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
      userRole: {
        upsert: {
          create: { role: "Admin" },
          update: { role: "Admin" },
        },
      },
    },
    create: {
      email,
      name,
      password: hashedPassword,
      role: "Admin",
      status: "ACTIVE",
      emailVerified: new Date(),
      userRole: {
        create: { role: "Admin" },
      },
    },
  });

  console.log("✅ Admin criado/atualizado!");
  console.log("   Email:", user.email);
  console.log("   Senha:", password);
  console.log("   Role:", user.role);
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
