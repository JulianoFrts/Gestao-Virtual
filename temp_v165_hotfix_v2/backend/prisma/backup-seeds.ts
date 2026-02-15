/**
 * Script de Backup: Extrai dados do banco atual e salva como seeds
 *
 * Uso: npx ts-node prisma/backup-seeds.ts
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

async function exportTableToSeed(
  tableName: string,
  data: any[],
  outputDir: string
): Promise<void> {
  if (data.length === 0) {
    console.log(`⏭️  ${tableName}: Sem dados`);
    return;
  }

  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const fileName = `backup-${timestamp}-${tableName}.json`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✅ ${tableName}: ${data.length} registros -> ${fileName}`);
}

async function main() {
  console.log('🔄 Iniciando backup de seeds...\n');

  const outputDir = path.join(__dirname, 'seeds-backup');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // =============================================
  // EMPRESAS
  // =============================================
  const companies = await prisma.company.findMany({
    include: {
      jobFunctions: true,
    },
  });
  await exportTableToSeed('companies', companies, outputDir);

  // =============================================
  // PROJETOS
  // =============================================
  const projects = await prisma.project.findMany();
  await exportTableToSeed('projects', projects, outputDir);

  // =============================================
  // CANTEIROS (SITES)
  // =============================================
  const sites = await prisma.site.findMany();
  await exportTableToSeed('sites', sites, outputDir);

  // =============================================
  // USUÁRIOS (SEM SENHA)
  // =============================================
  const users = await prisma.user.findMany({
    include: {
      address: true,
      affiliation: true,
    },
  });
  await exportTableToSeed('users', users, outputDir);

  // =============================================
  // CREDENCIAIS (COM SENHA HASH)
  // =============================================
  const authCredentials = await prisma.authCredential.findMany();
  await exportTableToSeed('auth-credentials', authCredentials, outputDir);

  // =============================================
  // FUNÇÕES DE TRABALHO
  // =============================================
  const jobFunctions = await prisma.jobFunction.findMany();
  await exportTableToSeed('job-functions', jobFunctions, outputDir);

  // =============================================
  // NÍVEIS DE PERMISSÃO
  // =============================================
  const permissionLevels = await prisma.permissionLevel.findMany();
  await exportTableToSeed('permission-levels', permissionLevels, outputDir);

  // =============================================
  // MÓDULOS DE PERMISSÃO
  // =============================================
  const permissionModules = await prisma.permissionModule.findMany();
  await exportTableToSeed('permission-modules', permissionModules, outputDir);

  // =============================================
  // MATRIZ DE PERMISSÕES
  // =============================================
  const permissionMatrix = await prisma.permissionMatrix.findMany();
  await exportTableToSeed('permission-matrix', permissionMatrix, outputDir);

  // =============================================
  // DELEGAÇÕES DE PERMISSÃO POR PROJETO
  // =============================================
  const permissionDelegations = await prisma.projectPermissionDelegation.findMany();
  await exportTableToSeed('permission-delegations', permissionDelegations, outputDir);

  // =============================================
  // EQUIPES
  // =============================================
  const teams = await prisma.team.findMany({
    include: { members: true },
  });
  await exportTableToSeed('teams', teams, outputDir);

  // =============================================
  // MEMBROS DE EQUIPE
  // =============================================
  const teamMembers = await prisma.teamMember.findMany();
  await exportTableToSeed('team-members', teamMembers, outputDir);

  // =============================================
  // AFILIAÇÕES DE USUÁRIO
  // =============================================
  const userAffiliations = await prisma.userAffiliation.findMany();
  await exportTableToSeed('user-affiliations', userAffiliations, outputDir);

  // =============================================
  // DADOS TÉCNICOS (TORRES, ETC)
  // =============================================
  const mapElements = await prisma.mapElementTechnicalData.findMany();
  await exportTableToSeed('map-elements', mapElements, outputDir);

  // =============================================
  // PRODUÇÃO E CRONOGRAMA
  // =============================================
  const productionCategories = await prisma.productionCategory.findMany();
  await exportTableToSeed('production-categories', productionCategories, outputDir);

  const productionActivities = await prisma.productionActivity.findMany();
  await exportTableToSeed('production-activities', productionActivities, outputDir);

  const workStages = await prisma.workStage.findMany();
  await exportTableToSeed('work-stages', workStages, outputDir);

  const mapElementProgress = await prisma.mapElementProductionProgress.findMany();
  await exportTableToSeed('map-element-progress', mapElementProgress, outputDir);

  const activitySchedules = await prisma.activitySchedule.findMany();
  await exportTableToSeed('activity-schedules', activitySchedules, outputDir);

  const stageProgress = await prisma.stageProgress.findMany();
  await exportTableToSeed('stage-progress', stageProgress, outputDir);

  // =============================================
  // RELATÓRIOS E REGISTROS
  // =============================================
  const dailyReports = await prisma.dailyReport.findMany();
  await exportTableToSeed('daily-reports', dailyReports, outputDir);

  const timeRecords = await prisma.timeRecord.findMany();
  await exportTableToSeed('time-records', timeRecords, outputDir);

  const auditLogs = await prisma.auditLog.findMany();
  await exportTableToSeed('audit-logs', auditLogs, outputDir);

  // =============================================
  // INFRAESTRUTURA DE REDE (CIRCUITOS/CABOS)
  // =============================================
  const circuits = await prisma.circuit.findMany();
  await exportTableToSeed('circuits', circuits, outputDir);

  const segments = await prisma.segment.findMany();
  await exportTableToSeed('segments', segments, outputDir);

  const conductors = await prisma.conductor.findMany();
  await exportTableToSeed('conductors', conductors, outputDir);

  const siteResponsibles = await prisma.siteResponsible.findMany();
  await exportTableToSeed('site-responsibles', siteResponsibles, outputDir);

  console.log('\n✅ Backup concluído!');
  console.log(`📁 Arquivos salvos em: ${outputDir}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('❌ Erro no backup:', e);
  prisma.$disconnect();
  process.exit(1);
});
