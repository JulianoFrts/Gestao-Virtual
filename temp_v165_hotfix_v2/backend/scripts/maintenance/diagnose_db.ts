import { prisma, checkDatabaseConnection } from "./src/lib/prisma/client.js";

async function diagnose() {
  console.log("--- Database Diagnosis ---");
  const health = await checkDatabaseConnection();
  console.log("Connectivity:", health.connected ? "OK" : "FAILED");
  if (health.error) console.log("Error:", health.error);

  if (health.connected) {
    try {
      const count = await prisma.permissionMatrix.count();
      console.log("PermissionMatrix count:", count);

      const adminPerms = await prisma.permissionMatrix.findMany({
        where: { level: { name: "SUPER_ADMIN_GOD" } },
        include: { level: true, module: true },
      });
      console.log("Admin perms found:", adminPerms.length);
    } catch (err: any) {
      console.error("Data error:", err.message);
    }
  }

  await prisma.$disconnect();
}

diagnose();
