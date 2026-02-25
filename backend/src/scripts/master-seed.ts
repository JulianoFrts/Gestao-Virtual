import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runScript(scriptName: string) {
    console.log(`\n🚀 Executando: ${scriptName}...`);
    try {
        const scriptPath = path.join(__dirname, scriptName);
        execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit', env: process.env });
        console.log(`✅ ${scriptName} concluído com sucesso!`);
    } catch (error) {
        console.error(`❌ Erro ao executar ${scriptName}:`, (error as any).message);
        throw error;
    }
}

async function main() {
    console.log('🌟 [MASTER SEED] Iniciando processo de população completa...');
    const start = Date.now();

    try {
        // 1. Dados Iniciais (Usuários, Projetos, Canteiros)
        await runScript('seed-initial-data.ts');

        // 2. Matriz de Permissões (Dashboard, Módulos, RDOs)
        await runScript('seed-permission-matrix.ts');

        // 3. Categorias de Produção (Torres, Cabos, Civil)
        await runScript('seed-production-categories.ts');

        const duration = ((Date.now() - start) / 1000).toFixed(2);
        console.log(`\n✨ [MASTER SEED] Finalizado com sucesso em ${duration}s!`);
    } catch (error) {
        console.error('\n💥 [MASTER SEED] Falha crítica no pipeline de seeding.');
        process.exit(1);
    }
}

main();
