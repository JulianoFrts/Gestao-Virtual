const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      // user_role: true // Tentativa de incluir relação se existir
    },
  });
  console.log("DEBUG_USERS_START");
  console.log(JSON.stringify(users, null, 2));
  console.log("DEBUG_USERS_END");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
