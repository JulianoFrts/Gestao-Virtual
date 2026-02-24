import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ROLES = [
  "USER",
  "ADMIN",
  "MODERATOR",
  "MANAGER",
  "SUPERVISOR",
  "TECHNICIAN",
  "OPERATOR",
  "SUPER_ADMIN",
  "SUPER_ADMIN_GOD",
  "SOCIO_DIRETOR",
  "HELPER_SYSTEM",
  "WORKER",
  "TI_SOFTWARE",
  "GESTOR_PROJECT",
  "GESTOR_CANTEIRO",
  "VIEWER",
  "GUEST",
];

const MODULE_CODES = [
  "employees.view",
  "employees.edit",
  "employees.delete",
  "functions.view",
  "functions.create",
  "functions.update",
  "functions.delete",
  "teams.view",
  "teams.edit",
  "teams.delete",
  "teams.create",
  "teams.update",
  "teams.manage",
  "records.view",
  "records.edit",
  "records.delete",
  "time_records.view",
  "time_records.manage",
  "reports.view",
  "reports.create",
  "reports.delete",
  "daily_reports.create",
  "daily_reports.manage",
  "daily_reports.schedule",
  "daily_reports.audit",
  "projects.view",
  "projects.create",
  "projects.edit",
  "projects.update",
  "projects.delete",
  "projects.rename",
  "projects.delegate",
  "projects.progress",
  "companies.view",
  "companies.create",
  "companies.edit",
  "companies.delete",
  "sites.view",
  "sites.create",
  "sites.edit",
  "sites.delete",
  "messages.view",
  "messages.create",
  "messages.delete",
  "messages.manage_status",
  "map.view",
  "map.edit",
  "map.manage",
  "viewer_3d.view",
  "geo_viewer.view",
  "production.view",
  "production.planning",
  "production.analytics",
  "costs.view",
  "costs.manage",
  "gapo.view",
  "gapo.manage",
  "users.view",
  "users.create",
  "users.edit",
  "users.delete",
  "users.manage",
  "custom_su.manage",
  "permissions.manage",
  "audit_logs.view",
  "su.manage",
  "settings.view",
  "settings.edit",
  "db_hub.manage",
  "data_ingestion.manage",
  "dashboard.view",
  "system.is_corporate",
  "system_messages.manage",
  "ui.admin_access",
];

async function main() {
  console.log("🚀 Starting permission seeding...");

  // 1. Seed Permission Levels
  const ROLE_RANKS: Record<string, number> = {
    SUPER_ADMIN_GOD: 2000,
    HELPER_SYSTEM: 1900,
    TI_SOFTWARE: 1800,
    SUPER_ADMIN: 1500,
    SOCIO_DIRETOR: 1400,
    ADMIN: 1000,
    MANAGER: 900,
    MODERATOR: 850,
    GESTOR_PROJECT: 800,
    GESTOR_CANTEIRO: 700,
    SUPERVISOR: 600,
    TECHNICIAN: 400,
    OPERATOR: 300,
    USER: 200,
    WORKER: 100,
    VIEWER: 50,
    GUEST: 0,
  };

  for (const role of ROLES) {
    const id = `pl_${role.toLowerCase()}`;
    const rank = ROLE_RANKS[role] || 0;

    await prisma.permissionLevel.upsert({
      where: { name: role },
      update: {
        description: `Nível de acesso para ${role}`,
        rank: rank,
      },
      create: {
        id,
        name: role,
        rank: rank,
        isSystem: true,
        description: `Nível de acesso para ${role}`,
      },
    });
  }
  console.log(`✅ ${ROLES.length} permission levels seeded.`);

  // 2. Seed Permission Modules
  for (const code of MODULE_CODES) {
    const id = `mod_${code.replace(/\./g, "_")}`;
    const name = code
      .split(".")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
    await prisma.permissionModule.upsert({
      where: { code },
      update: { name },
      create: {
        id,
        code,
        name,
        category: code.split(".")[0] || "General",
      },
    });
  }
  console.log(`✅ ${MODULE_CODES.length} permission modules seeded.`);

  // 3. Auto-grant legacy flags for GOD roles and Admins to ensure they don't lose access
  const adminRoleNames = [
    "HELPER_SYSTEM",
    "SUPER_ADMIN_GOD",
    "ADMIN",
    "TI_SOFTWARE",
    "SOCIO_DIRETOR",
    "SUPER_ADMIN",
  ];

  const adminLevels = await prisma.permissionLevel.findMany({
    where: { name: { in: adminRoleNames } },
    select: { id: true, name: true },
  });

  const allModules = await prisma.permissionModule.findMany();

  console.log(
    `🔑 Granting permissions to ${adminLevels.length} admin levels...`,
  );

  for (const level of adminLevels) {
    for (const mod of allModules) {
      await prisma.permissionMatrix.upsert({
        where: {
          levelId_moduleId: {
            levelId: level.id,
            moduleId: mod.id,
          },
        },
        update: { isGranted: true },
        create: {
          levelId: level.id,
          moduleId: mod.id,
          isGranted: true,
        },
      });
    }
    console.log(`   ✅ Granted all modules to ${level.name}`);
  }

  console.log("✨ Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
