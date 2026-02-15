const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Final fix for roles with casting...");
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
    });
    for (const user of users) {
      console.log(`- Updating ${user.email}...`);

      try {
        // Try to set to superadmingod directly with cast
        await prisma.$executeRawUnsafe(
          'UPDATE users SET role = $1::"Role", status = $2::"AccountStatus" WHERE id = $3',
          "SUPER_ADMIN_GOD",
          "ACTIVE",
          user.id,
        );
        console.log("  Applied superadmingod");
      } catch (e) {
        console.log("  Failed to apply superadmingod:", e.message);
        // Try fallback to ADMIN
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE users SET role = $1::"Role", status = $2::"AccountStatus" WHERE id = $3',
            "ADMIN",
            "ACTIVE",
            user.id,
          );
          console.log("  Applied ADMIN instead");
        } catch (e2) {
          console.log("  Fatal error on fallback:", e2.message);
        }
      }
    }
  } catch (e) {
    console.error("Fatal error:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
