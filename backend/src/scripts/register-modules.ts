import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const modules = [
  // Administração
  { code: "users.read", name: "Ver Usuários", category: "Administração" },
  {
    code: "users.manage",
    name: "Gerenciar Usuários",
    category: "Administração",
  },
  { code: "users.create", name: "Criar Usuários", category: "Administração" },
  { code: "users.update", name: "Editar Usuários", category: "Administração" },
  { code: "users.delete", name: "Excluir Usuários", category: "Administração" },
  { code: "custom_su.manage", name: "Custom SU", category: "Administração" },
  {
    code: "audit_logs.view",
    name: "Ver Logs de Auditoria",
    category: "Administração",
  },
  {
    code: "permissions.manage",
    name: "Gerenciar Permissões",
    category: "Administração",
  },
  { code: "db_hub.manage", name: "Database Hub", category: "Administração" },
  {
    code: "functions.manage",
    name: "Gerenciar Funções/Cargos",
    category: "Administração",
  },
  {
    code: "showAdminMenu",
    name: "Exibir Menu Administrativo",
    category: "Administração",
  },
  {
    code: "showMaintenance",
    name: "Exibir Menu Manutenção",
    category: "Administração",
  },

  // Equipes / RH
  {
    code: "employees.manage",
    name: "Gerenciar Funcionários",
    category: "Equipes",
  },
  {
    code: "team_composition",
    name: "Composição de Equipe",
    category: "Equipes",
  },
  { code: "clock", name: "Ponto Eletrônico", category: "Equipes" },

  // Operacional / RDO
  { code: "daily_report.create", name: "Criar RDO", category: "Operacional" },
  {
    code: "daily_report.schedule",
    name: "Programação RDO",
    category: "Operacional",
  },
  { code: "daily_report.audit", name: "Audit RDO", category: "Operacional" },
  { code: "daily_report.list", name: "Listagem RDO", category: "Operacional" },
  {
    code: "time_records.view",
    name: "Registros de Ponto",
    category: "Operacional",
  },

  // Controle Avançado (GAPO / Produção)
  { code: "gapo.view", name: "GAPO - Visão Geral", category: "Controle" },
  {
    code: "production.planning",
    name: "Planejamento de Produção",
    category: "Controle",
  },
  {
    code: "production.analytics",
    name: "Analytics de Produção",
    category: "Controle",
  },
  { code: "costs.view", name: "Visualizar Custos", category: "Controle" },
  { code: "data_ingestion", name: "Ingestão de Dados", category: "Controle" },

  // Corporativo
  { code: "dashboard", name: "Dashboard Principal", category: "Geral" },
  {
    code: "settings.profile",
    name: "Perfil e Configurações",
    category: "Geral",
  },
  { code: "settings.mfa", name: "Configurar MFA", category: "Geral" },
  { code: "messages.view", name: "Mensagens do Sistema", category: "Geral" },
  { code: "companies.view", name: "Ver Empresas", category: "Corporativo" },
  {
    code: "companies.manage",
    name: "Gerenciar Empresas",
    category: "Corporativo",
  },
  { code: "projects.view", name: "Ver Projetos", category: "Corporativo" },
  {
    code: "projects.manage",
    name: "Gerenciar Projetos",
    category: "Corporativo",
  },
  { code: "sites.view", name: "Ver Canteiros", category: "Corporativo" },
  {
    code: "projects.progress",
    name: "Progresso de Projetos",
    category: "Corporativo",
  },

  // Engenharia / Visualização
  { code: "viewer_3d.view", name: "Visualizador 3D", category: "Engenharia" },
  { code: "geo_viewer.view", name: "Visualizador Geo", category: "Engenharia" },
  {
    code: "work_progress.view",
    name: "Ver Progresso de Obra",
    category: "Engenharia",
  },
];

async function main() {
  console.log("🚀 Iniciando registro de módulos...");

  let createdCount = 0;
  let updatedCount = 0;

  for (const mod of modules) {
    const existing = await prisma.permissionModule.findUnique({
      where: { code: mod.code },
    });

    if (existing) {
      await prisma.permissionModule.update({
        where: { code: mod.code },
        data: {
          name: mod.name,
          category: mod.category,
        },
      });
      updatedCount++;
    } else {
      await prisma.permissionModule.create({
        data: mod,
      });
      createdCount++;
    }
  }

  console.log(
    `✅ Registro concluído! Criados: ${createdCount}, Atualizados: ${updatedCount}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
