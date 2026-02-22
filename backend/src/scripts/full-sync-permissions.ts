import "dotenv/config";
import { prisma } from "../lib/prisma/client";
import { ROLE_FLAGS } from "../lib/constants/security";

/**
 * Script de Sincronização Total de Permissões
 * Sincroniza Hierarquia (Levels), Recursos (Modules) e Autorizações (Matrix)
 */

const STANDARD_ROLES = [
  {
    name: "HELPER_SYSTEM",
    rank: 2500,
    description: "Acesso total ao sistema (Helper/Suporte)",
  },
  {
    name: "SUPER_ADMIN_GOD",
    rank: 2000,
    description: "Administrador Supremo (God Mode)",
  },
  { name: "SOCIO_DIRETOR", rank: 1500, description: "Diretoria Executiva" },
  { name: "ADMIN", rank: 1200, description: "Administrador de Empresa" },
  { name: "TI_SOFTWARE", rank: 1100, description: "Equipe de TI e Manutenção" },
  { name: "MODERATOR", rank: 1000, description: "Moderador de Conteúdo" },
  { name: "MANAGER", rank: 950, description: "Gerente Geral" },
  { name: "GESTOR_PROJECT", rank: 900, description: "Gestor de Projeto/Obra" },
  { name: "GESTOR_CANTEIRO", rank: 800, description: "Gestor de Canteiro" },
  { name: "SUPERVISOR", rank: 700, description: "Supervisão de Campo" },
  { name: "TECHNICIAN", rank: 600, description: "Técnico Especializado" },
  { name: "OPERATOR", rank: 500, description: "Operador de Equipamento" },
  { name: "WORKER", rank: 300, description: "Colaborador Operacional" },
  { name: "USER", rank: 150, description: "Usuário Padrão" },
  { name: "VIEWER", rank: 100, description: "Visualizador (Apenas Leitura)" },
  { name: "GUEST", rank: 50, description: "Convidado Externo" },
];

const MODULE_CATEGORIES: Record<string, string> = {
  users: "Administração",
  companies: "Corporativo",
  projects: "Corporativo",
  sites: "Corporativo",
  audit_logs: "Administração",
  db_hub: "Administração",
  custom_su: "Administração",
  settings: "Configurações",
  gapo: "Controle Avançado",
  work_progress: "Gráficos",
  viewer_3d: "Ferramentas",
  clock: "Ponto Eletrônico",
  daily_reports: "Ponto Eletrônico",
  time_records: "Ponto Eletrônico",
  employees: "Equipes",
  team: "Equipes",
};

async function main() {
  console.log("🚀 Iniciando Sincronização de Permissões (Full Sync)...");

  // 1. Sincronizar Níveis (PermissionLevel)
  console.log("\n--- Sincronizando Níveis ---");
  for (const role of STANDARD_ROLES) {
    await prisma.permissionLevel.upsert({
      where: { name: role.name },
      update: { rank: role.rank, description: role.description },
      create: {
        id: role.name,
        name: role.name,
        rank: role.rank,
        description: role.description,
        isSystem: true,
      },
    });
  }
  console.log("✅ Níveis sincronizados.");

  // 2. Coletar e Sincronizar Módulos (PermissionModule)
  console.log("\n--- Sincronizando Módulos (Flags) ---");
  const allFlags = new Set<string>();
  Object.values(ROLE_FLAGS).forEach((flags) => {
    flags.forEach((flag) => {
      if (flag !== "*") allFlags.add(flag);
    });
  });

  // Adicionar flags extras manuais se necessário
  allFlags.add("dashboard");
  allFlags.add("support.ticket");

  for (const flag of allFlags) {
    const prefix = flag.split(".")[0];
    const category = MODULE_CATEGORIES[prefix] || "Outros";

    await prisma.permissionModule.upsert({
      where: { code: flag },
      update: { category },
      create: {
        code: flag,
        name: flag
          .split(".")
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
          .join(" "),
        category,
      },
    });
  }
  console.log(`✅ ${allFlags.size} Módulos sincronizados.`);

  // 3. Sincronizar Matriz (PermissionMatrix)
  console.log("\n--- Sincronizando Matriz de Autorizações ---");
  const dbLevels = await prisma.permissionLevel.findMany();
  const dbModules = await prisma.permissionModule.findMany();

  for (const level of dbLevels) {
    const expectedFlags = ROLE_FLAGS[level.name] || [];
    const isGod = expectedFlags.includes("*");

    console.log(
      `Audito: ${level.name} (Rank: ${level.rank})${isGod ? " [GOD MODE]" : ""}`,
    );

    for (const mod of dbModules) {
      // Regra de Concessão:
      // Se for God, ganha tudo.
      // Se não, ganha se estiver na lista de flags ou for flag raiz.
      const isGranted = isGod || expectedFlags.includes(mod.code as any);

      await prisma.permissionMatrix.upsert({
        where: {
          levelId_moduleId: {
            levelId: level.id,
            moduleId: mod.id,
          },
        },
        update: { isGranted },
        create: {
          levelId: level.id,
          moduleId: mod.id,
          isGranted,
        },
      });
    }
  }
  console.log("✅ Matriz de Permissões sincronizada com sucesso.");

  console.log("\n✨ Sincronização Concluída!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
