import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando correção de ROLES de usuários...");

  // 1. Atualizar 'ADMIN' (uppercase) para 'Admin' (PascalCase)
  // Usamos updateMany apenas se o Enum permitir. Se o Enum for strict, pode falhar.
  // Mas executeRaw é safer para bypassar validação de tipo do Client.

  // Correção: User
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'USER' WHERE "role" = 'user'`,
  );

  // Correção: Admin
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Admin' WHERE "role" = 'ADMIN' OR "role" = 'admin'`,
  );

  // Correção: SuperAdmin
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'SuperAdmin' WHERE "role" = 'SUPER_ADMIN' OR "role" = 'super_admin'`,
  );

  // Correção: Outros
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Moderator' WHERE "role" = 'MODERATOR' OR "role" = 'moderator'`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Manager' WHERE "role" = 'MANAGER' OR "role" = 'manager'`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Supervisor' WHERE "role" = 'SUPERVISOR' OR "role" = 'supervisor'`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Technician' WHERE "role" = 'TECHNICIAN' OR "role" = 'technician'`,
  );
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Operator' WHERE "role" = 'OPERATOR' OR "role" = 'operator'`,
  );

  // fallback: Se houver algum nulo ou estranho, setar para USER?
  // Deixaremos quieto por enquanto.

  console.log("Roles atualizados com sucesso via SQL Raw.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
