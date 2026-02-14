import "dotenv/config";
import { prisma } from "../lib/prisma/client";

const STANDARD_ROLES = [
    { name: 'HELPER_SYSTEM', rank: 2000 },
    { name: 'SUPER_ADMIN_GOD', rank: 1500 },
    { name: 'SOCIO_DIRETOR', rank: 1000 },
    { name: 'ADMIN', rank: 950 },
    { name: 'TI_SOFTWARE', rank: 900 },
    { name: 'MODERATOR', rank: 850 },
    { name: 'MANAGER', rank: 850 },
    { name: 'GESTOR_PROJECT', rank: 800 },
    { name: 'GESTOR_CANTEIRO', rank: 700 },
    { name: 'SUPERVISOR', rank: 600 },
    { name: 'TECHNICIAN', rank: 400 },
    { name: 'OPERATOR', rank: 300 },
    { name: 'WORKER', rank: 100 },
    { name: 'USER', rank: 100 },
    { name: 'VIEWER', rank: 50 },
];

const STANDARD_MODULES = [
    { code: 'dashboard', name: 'Painel Geral', category: 'Geral' },
    { code: 'clock', name: 'Bate-ponto (Câmera)', category: 'Ponto Eletrônico' },
    { code: 'clock.manual_id', name: 'Ponto via Matrícula', category: 'Ponto Eletrônico' },
    { code: 'daily_reports', name: 'Relatórios Diários', category: 'Ponto Eletrônico' },
    { code: 'time_records.view', name: 'Visualizar Registros', category: 'Ponto Eletrônico' },
    { code: 'sites.view', name: 'Visualizar Canteiros', category: 'Corporativo' },
    { code: 'projects.view', name: 'Visualizar Obras', category: 'Corporativo' },
    { code: 'projects.manage', name: 'Gerenciar Obras', category: 'Corporativo' },
    { code: 'projects.progress', name: 'Andamento de Projetos (Mapa)', category: 'Graficos' },
    { code: 'work_progress.view', name: 'Andamento da Obra (Graficos)', category: 'Graficos' },
    { code: 'companies.view', name: 'Visualizar Empresas', category: 'Corporativo' },
    { code: 'companies.manage', name: 'Gerenciar Empresas', category: 'Corporativo' },
    { code: 'team_composition', name: 'Composição de Equipe', category: 'Equipes' },
    { code: 'employees.manage', name: 'Gestão de Funcionários', category: 'Equipes' },
    { code: 'gapo.view', name: 'Módulo GAPO', category: 'Controle Avançado' },
    { code: 'costs.view', name: 'Gestão de Custos', category: 'Produção' },
    { code: 'production.analytics', name: 'Analytics de Produção', category: 'Produção' },
    { code: 'viewer_3d.view', name: 'Visualizador 3D', category: 'Ferramentas' },
    { code: 'users.manage', name: 'Gestão de Usuários', category: 'Administração' },
    { code: 'custom_su.manage', name: 'Configurar Matriz SU', category: 'Administração' },
    { code: 'audit_logs.view', name: 'Logs de Auditoria', category: 'Administração' },
    { code: 'db_hub.manage', name: 'Database Hub', category: 'Administração' },
    { code: 'settings.profile', name: 'Editar Perfil', category: 'Configurações' },
    { code: 'settings.mfa', name: 'Gerenciar MFA', category: 'Configurações' },
    { code: 'support.ticket', name: 'Chamados de Suporte', category: 'Suporte' },
];

async function main() {
  console.log("🚀 Iniciando Seed da Matriz de Permissões...");

  // 1. Sincronizar Níveis
  for (const role of STANDARD_ROLES) {
    try {
      await prisma.permissionLevel.upsert({
        where: { name: role.name },
        update: { rank: role.rank },
        create: {
          name: role.name,
          rank: role.rank,
          isSystem: true,
          description: `Nível de acesso para ${role.name}`
        }
      });
    } catch {
      console.error(`Error syncing role ${role.name}`);
    }
  }
  console.log("✅ Níveis sincronizados.");

  // 2. Sincronizar Módulos
  for (const mod of STANDARD_MODULES) {
    try {
      await prisma.permissionModule.upsert({
        where: { code: mod.code },
        update: { name: mod.name, category: mod.category },
        create: {
          code: mod.code,
          name: mod.name,
          category: mod.category
        }
      });
    } catch {
      console.error(`Error syncing module ${mod.code}`);
    }
  }
  console.log("✅ Módulos sincronizados.");

  // 3. Inicializar Matriz (Garantir que Super Admin tenha tudo)
  const levels = await prisma.permissionLevel.findMany();
  const mods = await prisma.permissionModule.findMany();

  let matrixCount = 0;
  for (const level of levels) {
    for (const modItem of mods) {
      // Regra: God levels (rank >= 1000) ganham tudo por padrão
      const isGranted = level.rank >= 1000;
      
      try {
        await prisma.permissionMatrix.upsert({
          where: {
            levelId_moduleId: {
              levelId: level.id,
              moduleId: modItem.id
            }
          },
          update: {}, // Não sobrescreve se já existir
          create: {
            levelId: level.id,
            moduleId: modItem.id,
            isGranted
          }
        });
        matrixCount++;
      } catch {
        // Ignorar se já existe ou erro de transação
      }
    }
  }

  console.log(`✅ Matriz inicializada com sincronização de ${matrixCount} entradas.`);
  console.log("✨ Seed da Matriz concluído!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
