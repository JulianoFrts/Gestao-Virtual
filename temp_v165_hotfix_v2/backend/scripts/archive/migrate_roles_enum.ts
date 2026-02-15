import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating Role Enum and Data...");

  // 1. Add new Enum values
  const newRoles = [
    "Admin",
    "Moderator",
    "Manager",
    "Supervisor",
    "Technician",
    "Operator",
    "SuperAdmin",
    "SuperAdminGod",
  ];

  for (const role of newRoles) {
    try {
      console.log(`Adding ${role} to Enum...`);
      // Postgres ALTER TYPE cannot run inside a transaction block usually, so we run individually
      await prisma.$executeRawUnsafe(
        `ALTER TYPE "Role" ADD VALUE IF NOT EXISTS '${role}'`,
      );
    } catch (e: any) {
      console.log(`Note on ${role}:`, e.message);
    }
  }

  console.log("Enum values added (or validated). Updating data...");

  // 2. Update Data
  // We use role::text casting to match old values

  // ADMIN -> Admin
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Admin' WHERE "role"::text = 'ADMIN' OR "role"::text = 'admin'`,
  );

  // MODERATOR -> Moderator
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Moderator' WHERE "role"::text = 'MODERATOR' OR "role"::text = 'moderator'`,
  );

  // MANAGER -> Manager
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Manager' WHERE "role"::text = 'MANAGER' OR "role"::text = 'manager'`,
  );

  // SUPERVISOR -> Supervisor
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Supervisor' WHERE "role"::text = 'SUPERVISOR' OR "role"::text = 'supervisor'`,
  );

  // TECHNICIAN -> Technician
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Technician' WHERE "role"::text = 'TECHNICIAN' OR "role"::text = 'technician'`,
  );

  // OPERATOR -> Operator
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'Operator' WHERE "role"::text = 'OPERATOR' OR "role"::text = 'operator'`,
  );

  // SUPER_ADMIN / super_admin -> SuperAdmin
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'SuperAdmin' WHERE "role"::text = 'SUPER_ADMIN' OR "role"::text = 'super_admin'`,
  );

  // superadmingod -> SuperAdminGod
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'SuperAdminGod' WHERE "role"::text = 'superadmingod'`,
  );

  // user is USER (uppercase) in Schema, so if "user" (lowercase) exists, move to "USER"
  await prisma.$executeRawUnsafe(
    `UPDATE "users" SET "role" = 'USER' WHERE "role"::text = 'user'`,
  );

  console.log("Data migration complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
