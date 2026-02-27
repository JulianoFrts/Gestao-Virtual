import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const STANDARD_ROLES = [
  { name: "HELPER_SYSTEM", rank: 2000 },
  { name: "ADMIN", rank: 1500 },
  { name: "TI_SOFTWARE", rank: 1200 },
  { name: "COMPANY_ADMIN", rank: 1000 },
  { name: "PROJECT_MANAGER", rank: 800 },
  { name: "SITE_MANAGER", rank: 700 },
  { name: "SUPERVISOR", rank: 600 },
  { name: "OPERATIONAL", rank: 100 },
  { name: "VIEWER", rank: 50 },
];

const STANDARD_MODULES = [
  { code: "dashboard", name: "Painel Geral", category: "Geral" },
  { code: "clock", name: "Bate-ponto (Câmera)", category: "Ponto Eletrônico" },
  {
    code: "clock.manual_id",
    name: "Ponto via Matrícula",
    category: "Ponto Eletrônico",
  },
  {
    code: "daily_report.create",
    name: "Preencher RDO",
    category: "Ponto Eletrônico",
  },
  {
    code: "daily_report.list",
    name: "Histórico de RDOs",
    category: "Ponto Eletrônico",
  },
  {
    code: "time_records.view",
    name: "Visualizar Registros",
    category: "Ponto Eletrônico",
  },
  { code: "sites.view", name: "Visualizar Canteiros", category: "Corporativo" },
  { code: "projects.view", name: "Visualizar Obras", category: "Corporativo" },
  { code: "projects.manage", name: "Gerenciar Obras", category: "Corporativo" },
  {
    code: "projects.progress",
    name: "Andamento de Projetos (Mapa)",
    category: "Graficos",
  },
  {
    code: "work_progress.view",
    name: "Andamento da Obra (Graficos)",
    category: "Graficos",
  },
  {
    code: "companies.view",
    name: "Visualizar Empresas",
    category: "Corporativo",
  },
  {
    code: "companies.manage",
    name: "Gerenciar Empresas",
    category: "Corporativo",
  },
  {
    code: "team_composition",
    name: "Composição de Equipe",
    category: "Equipes",
  },
  {
    code: "employees.manage",
    name: "Gestão de Funcionários",
    category: "Equipes",
  },
  { code: "functions.manage", name: "Gestão de Funções", category: "Equipes" },
  { code: "gapo.view", name: "Módulo GAPO", category: "Controle Avançado" },
  { code: "costs.view", name: "Gestão de Custos", category: "Produção" },
  {
    code: "production.planning",
    name: "Planejamento de Produção",
    category: "Produção",
  },
  {
    code: "production.analytics",
    name: "Analytics de Produção",
    category: "Produção",
  },
  { code: "viewer_3d.view", name: "Visualizador 3D", category: "Ferramentas" },
  {
    code: "users.manage",
    name: "Gestão de Usuários",
    category: "Administração",
  },
  {
    code: "custom_su.manage",
    name: "Configurar Matriz SU",
    category: "Administração",
  },
  {
    code: "audit_logs.view",
    name: "Logs de Auditoria",
    category: "Administração",
  },
  { code: "db_hub.manage", name: "Database Hub", category: "Administração" },
  {
    code: "data_ingestion",
    name: "Ingestão de Dados",
    category: "Administração",
  },
  {
    code: "settings.profile",
    name: "Editar Perfil",
    category: "Configurações",
  },
  { code: "settings.mfa", name: "Gerenciar MFA", category: "Configurações" },
  { code: "support.ticket", name: "Chamados de Suporte", category: "Suporte" },
  { code: "messages.view", name: "Mensagens Corporativas", category: "Geral" },
  {
    code: "geo_viewer.view",
    name: "Visualizador Geográfico",
    category: "Ferramentas",
  },
];

async function main() {
  console.log("🚀 Starting Role & Permission Synchronization (Strict Mode)...");

  // 1. Sync Permission Levels (Roles)
  console.log("\n--- Syncing Permission Levels ---");
  for (const role of STANDARD_ROLES) {
    const id = `pl_${role.name.toLowerCase()}`;
    const level = await prisma.permissionLevel.upsert({
      where: { name: role.name },
      update: {
        rank: role.rank,
        description: `Nível de acesso para ${role.name}`,
        isSystem: true,
      },
      create: {
        id,
        name: role.name,
        rank: role.rank,
        description: `Nível de acesso para ${role.name}`,
        isSystem: true,
      },
    });
    console.log(`✅ Level: ${level.name} (Rank: ${level.rank})`);
  }

  // 2. Sync Permission Modules
  console.log("\n--- Syncing Permission Modules ---");
  for (const mod of STANDARD_MODULES) {
    const id = `mod_${mod.code.replace(/\./g, "_")}`;
    const module = await prisma.permissionModule.upsert({
      where: { code: mod.code },
      update: {
        name: mod.name,
        category: mod.category,
      },
      create: {
        id,
        code: mod.code,
        name: mod.name,
        category: mod.category,
      },
    });
    console.log(`✅ Module: ${module.code} (${module.category})`);
  }

  // 3. Sync Permission Matrix (Default Grants)
  console.log("\n--- Syncing Permission Matrix (Default Grants) ---");

  const allLevels = await prisma.permissionLevel.findMany();
  const allModules = await prisma.permissionModule.findMany();

  for (const level of allLevels) {
    const isFullAccess = level.rank >= 1500;
    console.log(
      `${isFullAccess ? "✅ GRANTING" : "❌ RESTRICTING"} all permissions for ${level.name}...`,
    );
    for (const mod of allModules) {
      await prisma.permissionMatrix.upsert({
        where: {
          levelId_moduleId: {
            levelId: level.id,
            moduleId: mod.id,
          },
        },
        update: { isGranted: isFullAccess },
        create: {
          levelId: level.id,
          moduleId: mod.id,
          isGranted: isFullAccess,
        },
      });
    }
  }

  console.log("\n✨ Synchronization complete! Matrix updated.");
}

main()
  .catch((e) => {
    console.error("❌ Error during sync:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
