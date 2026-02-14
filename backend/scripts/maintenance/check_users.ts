import { prisma } from "../../src/lib/prisma/client";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true },
  });

  console.log("--- USERS ---");
  for (const u of users) {
    console.log(`Email: ${u.email} | Role: ${u.role} | ID: ${u.id}`);
  }

  const userRoles = await prisma.userRole.findMany({
    include: { user: { select: { email: true } } },
  });

  console.log("\n--- USER_ROLES table ---");
  for (const ur of userRoles) {
    console.log(`User: ${ur.user?.email} | AppRole: ${ur.role}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
