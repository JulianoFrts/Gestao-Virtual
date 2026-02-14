import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Verificando valores do Enum Role no Postgres...");

  try {
    const result = await prisma.$queryRawUnsafe(`
            SELECT t.typname, e.enumlabel
            FROM pg_type t
            JOIN pg_enum e ON t.oid = e.enumtypid
            WHERE t.typname = 'Role' OR t.typname = 'role'
        `);
    console.log(result);
  } catch (e) {
    console.error("Erro ao consultar enums:", e);
  }

  /*
    console.log('Tentando listar Roles da tabela user...');
    // Isso vai falhar se o Prisma tentar converter para o Enum do Schema e falhar.
    // Então vamos usar queryRaw para ver o que está lá realmente.
    */
  try {
    const users = await prisma.$queryRawUnsafe(
      `SELECT id, email, role::text FROM "users" LIMIT 10`,
    );
    console.log("Users sample:", users);
  } catch (e) {
    console.error("Erro ao consultar users:", e);
  }

  await prisma.$disconnect();
}

main();
