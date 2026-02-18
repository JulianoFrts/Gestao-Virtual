import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("--- Verificando Usuários no Banco de Dados ---");
  const users = await prisma.user.findMany({
    include: { authCredential: true }
  });

  console.log(`Total de usuários encontrados: ${users.length}`);
  users.forEach(u => {
    console.log(`- ID: ${u.id}, Nome: ${u.name}, Email: ${u.authCredential?.email}, Role: ${u.authCredential?.role}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
