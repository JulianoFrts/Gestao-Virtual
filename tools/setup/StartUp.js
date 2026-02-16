import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m"
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

async function start() {
    console.clear();
    log("===================================================", colors.cyan);
    log("🚀 INICIANDO ATUALIZAÇÃO DO SISTEMA ORION (DOCKER)", colors.bright + colors.cyan);
    log("===================================================", colors.cyan);

    try {
        // 1. Gerar tipos Orval no frontend
        log("\n📦 Passo 1: Sincronizando tipos da API (Orval)...", colors.yellow);
        execSync('npm run orval:generate -w frontend', { stdio: 'inherit' });
        log("✅ Tipos sincronizados com sucesso.", colors.green);

        // 2. Parar containers atuais
        log("\n🛑 Passo 2: Parando containers Docker...", colors.yellow);
        execSync('docker-compose down', { stdio: 'inherit' });
        log("✅ Containers parados.", colors.green);

        // 3. Reconstruir e Iniciar
        log("\n🏗️ Passo 3: Reconstruindo imagens e iniciando Docker...", colors.yellow);
        log("(Isso pode levar alguns minutos se houver muitas mudanças)", colors.reset);
        execSync('docker-compose up -d --build', { stdio: 'inherit' });
        log("✅ Sistema reconstruído e iniciado com sucesso.", colors.green);

        // 4. Mostrar status
        log("\n📊 Status atual do sistema:", colors.cyan);
        execSync('docker-compose ps', { stdio: 'inherit' });

        log("\n===================================================", colors.cyan);
        log("🛸 SISTEMA ONLINE E ATUALIZADO (DOCKER)!", colors.bright + colors.green);
        log("Frontend:     http://localhost:5173", colors.blue);
        log("Backend API:  http://localhost:3000", colors.blue);
        log("Swagger UI:   http://localhost:3000/docs", colors.cyan);
        log("OpenAPI Spec: http://localhost:3000/api/v1/docs (Orval Input)", colors.cyan);
        log("Prisma Studio: Rode 'npm run db:studio' em um novo terminal", colors.yellow);
        log("===================================================", colors.cyan);

    } catch (error) {
        log("\n❌ ERRO DURANTE A EXECUÇÃO:", colors.red + colors.bright);
        log(error.message, colors.red);
        log("\nCertifique-se de que o Docker Desktop está rodando.", colors.yellow);
        process.exit(1);
    }
}

start();
