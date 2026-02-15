const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: "julianogitiz@gmail.com" },
  });
  if (!user) {
    console.log("USUARIO NAO ENCONTRADO");
    return;
  }
  console.log(`USUARIO: ${user.email}`);
  console.log(`ROLE: ${user.role}`);
  console.log(`STATUS: ${user.status}`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
