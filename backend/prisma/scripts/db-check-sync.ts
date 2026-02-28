import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkSync() {
  console.log('\n--- INICIANDO CHECK DE SINCRONIA GESTAO VIRTUAL ---\n');

  const report = {
    schema: false,
    permissions: false,
    seeds: false,
    issues: [] as string[]
  }

  try {
    // 1. Check de Banco de Dados (Conectividade e Tabelas Criticas)
    console.log('1. Validando Estrutura do Banco...');
    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'` as any[];
    const tableNames = tables.map(t => t.table_name);
    
    const requiredTables = ['users', 'projects', 'companies', 'map_elements', 'permission_modules', 'permission_matrix'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    if (missingTables.length === 0) {
      console.log('   [OK] Tabelas fundamentais encontradas.');
      report.schema = true;
    } else {
      report.issues.push(`Tabelas ausentes no banco real: ${missingTables.join(', ')}`);
      console.log(`   [FALHA] Faltando tabelas: ${missingTables.join(', ')}`);
    }

    // 2. Check de Permissoes e Niveis de Acesso
    console.log('\n2. Validando Sistema de Permissoes...');
    const modulesCount = await prisma.permissionModule.count();
    const matrixCount = await prisma.permissionMatrix.count();
    const levelsCount = await prisma.permissionLevel.count();

    console.log(`   - Modulos Cadastrados: ${modulesCount}`);
    console.log(`   - Regras na Matriz: ${matrixCount}`);
    console.log(`   - Niveis de Acesso: ${levelsCount}`);

    // Verificar se o modulo do Cockpit 3D existe
    const cockpitModule = await prisma.permissionModule.findFirst({
      where: { id: 'projects.progress' }
    });

    if (cockpitModule) {
      console.log('   [OK] Modulo Cockpit 3D (projects.progress) identificado.');
    } else {
      report.issues.push('Modulo "projects.progress" nao encontrado na tabela permission_modules.');
      console.log('   [FALHA] Modulo Cockpit 3D ausente.');
    }

    // 3. Validacao de Integridade Referencial (Projetos/Empresas)
    console.log('\n3. Validando Integridade de Dados...');
    const orphanedProjects = await prisma.project.findMany({
      where: { companyId: null as any }
    });

    if (orphanedProjects.length === 0) {
      console.log('   [OK] Todos os projetos possuem vinculo com empresas.');
    } else {
      report.issues.push(`${orphanedProjects.length} projetos estao sem empresa vinculada.`);
      console.log(`   [FALHA] Projetos orfaos detectados: ${orphanedProjects.length}`);
    }

    // 4. Check de Compatibilidade de Seeds (Amostragem)
    console.log('\n4. Analisando Prontidao de Seeds...');
    const mapElementFields = Object.keys(prisma.mapElementTechnicalData.fields);
    if (mapElementFields.includes('displaySettings')) {
      console.log('   [OK] Schema de map_elements atualizado (displaySettings presente).');
      report.seeds = true;
    } else {
      report.issues.push('Schema de map_elements desatualizado no Prisma.');
      console.log('   [FALHA] Schema de map_elements incompativel.');
    }

    // RELATORIO FINAL
    console.log('\n--- RELATORIO FINAL ---');
    if (report.issues.length === 0) {
      console.log('TUDO SINCRONIZADO! O ambiente esta seguro para prosseguir.');
    } else {
      console.log(`FORAM ENCONTRADAS ${report.issues.length} INCONSISTENCIAS:`);
      report.issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('\nRECOMENDACAO: Corrigir as inconsistencias acima antes de rodar qualquer seed.');
    }

  } catch (error) {
    console.error('\nERRO CRITICO DURANTE O CHECK:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSync();
