const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany({
      select: { email: true, role: true, name: true, password: true },
    });
    console.log("USUARIOS ENCONTRADOS:");
    users.forEach((u) => {
      console.log(
        `- ${u.email} (Role: ${u.role}) | Hash: ${u.password ? "Sim" : "Não"}`,
      );
    });
  } catch (e) {
    console.error("ERRO AO BUSCAR USUARIOS:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
