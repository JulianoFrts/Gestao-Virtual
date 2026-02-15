// ============================================================
// 🚀 GESTÃO VIRTUAL — Servidor Unificado para SquareCloud
// Backend (Next.js, porta 3001) + Frontend (Express, porta 80)
// ============================================================

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// 0. CONFIGURAÇÃO DE SEGURANÇA
// ==========================================
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BACKEND_PORT = 3001;
const GATEWAY_PORT = process.env.PORT || 80;

// 🔒 Chave interna de segurança (proxy → backend)
const INTERNAL_PROXY_KEY = process.env.INTERNAL_PROXY_KEY || 'gv-internal-' + Date.now();
process.env.INTERNAL_PROXY_KEY = INTERNAL_PROXY_KEY;

const backendDir = path.join(__dirname, 'backend');
const frontendDistDir = path.join(__dirname, 'frontend_dist');

// v153: Função auxiliar para executar SQL usando o motor do Prisma (resiliente ao mTLS)
function runSqlViaPrisma(sql, url, env) {
    try {
        console.log(`🔨 [v153] Executando comando SQL via Prisma CLI...`);
        execSync(`npx prisma db execute --stdin --url "${url}"`, {
            input: sql,
            env: { ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
            stdio: 'inherit',
            cwd: backendDir
        });
        return true;
    } catch (e) {
        console.warn('⚠️ [v153] Falha ao executar SQL via Prisma:', e.message);
        return false;
    }
}

// ==========================================
// 🚀 AUTO-HEALING (LIMPEZA AUTOMÁTICA)
// ==========================================
const DEPLOY_ID = '[[DEPLOY_ID]]'; // Injetado via PS1
const deployIdFile = path.join(__dirname, '.square_deploy_id');

if (DEPLOY_ID !== '[[DEPLOY_ID]]') {
    let lastId = '';
    if (fs.existsSync(deployIdFile)) {
        lastId = fs.readFileSync(deployIdFile, 'utf8').trim();
    }

    if (lastId !== DEPLOY_ID) {
        console.log('🔄 [AUTO-HEALING] Nova versão detectada! Iniciando limpeza de cache...');

        // Pastas para limpar
        const toClean = [
            path.join(backendDir, '.next'),
            path.join(backendDir, 'node_modules'),
            path.join(__dirname, 'node_modules')
        ];

        toClean.forEach(p => {
            if (fs.existsSync(p)) {
                console.log(`🧹 Removendo: ${p}`);
                try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
            }
        });

        // Limpar sentinelas de build para forçar novo build
        const sentinels = [
            path.join(backendDir, '.next', '.square_build_complete_v2'),
            path.join(backendDir, '.next', '.square_build_complete_unified')
        ];
        sentinels.forEach(s => {
            if (fs.existsSync(s)) {
                try { fs.unlinkSync(s); } catch (e) { }
            }
        });

        fs.writeFileSync(deployIdFile, DEPLOY_ID);
        console.log('✅ [AUTO-HEALING] Cache limpo com sucesso.');
    }
}

console.log('==================================================');
console.log('🚀 GESTÃO VIRTUAL — Servidor Unificado');
console.log('==================================================');
console.log('');
console.log('##################################################');
console.log('🚨 ALERTA DE CONFIGURAÇÃO DE BANCO DE DADOS:');
console.log(`🔥 NUKE ATIVO   : ${process.env.FORCE_NUKE_DB === 'true' ? '🚀 SIM (LIMPANDO TUDO!)' : '---'}`);
console.log(`📥 RESTORE ATIVO: ${process.env.RESTORE_BACKUP === 'true' ? '🚀 SIM (RESTAURANDO 08/02)' : '---'}`);
console.log('##################################################');
console.log('');
console.log(`📦 Backend Dir: ${backendDir}`);
console.log(`📦 Frontend Dist: ${frontendDistDir}`);
console.log('');

// Helper para rodar comandos de pacote (Padrão NPM/NPX Square Cloud)
function runPkg(cmd, options = {}) {
    const isInstall = cmd.startsWith('install');
    // v165: Scripts e Limpeza
    const isScript = ['build', 'start', 'seed', 'test', 'run', 'prisma'].some(s => cmd.trim().startsWith(s));

    let npmCmd;
    if (isInstall) {
        npmCmd = 'npm install --no-audit';
        try {
            const lock = path.join(options.cwd || __dirname, 'package-lock.json');
            if (fs.existsSync(lock)) fs.unlinkSync(lock);
        } catch (e) { }
    } else if (isScript && (cmd === 'build' || cmd === 'start')) {
        npmCmd = `npm run ${cmd}`;
    } else {
        npmCmd = `npx ${cmd}`;
    }

    console.log(`🚀 [v165] Executando: ${npmCmd}`);
    try {
        return execSync(npmCmd, { stdio: 'inherit', ...options });
    } catch (e) {
        console.warn(`⚠️ [v165] Falha no comando ${npmCmd}: ${e.message}`);
        throw e;
    }
}


// ==========================================
// 1. INSTALAR DEPENDÊNCIAS
// ==========================================

console.log('📦 Instalando dependências do gateway (raiz)...');
try {
    runPkg('install', { cwd: __dirname });
    console.log('✅ Dependências do gateway instaladas.');
} catch (e) {
    console.warn('⚠️ Falha na instalação raiz:', e.message);
}

console.log('📦 Instalando dependências do backend...');
try {
    runPkg('install', { cwd: backendDir });
    console.log('✅ Dependências do backend instaladas.');
} catch (e) {
    console.warn('⚠️ Falha na instalação backend:', e.message);
}

// ==========================================
// 2. SSL / mTLS / CERTIFICADOS
// (Lógica mantida do backend/squarecloud.start.cjs)
// ==========================================

const { Pool } = require('pg');

let dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/['"]/g, "") : undefined;

if (dbUrl) {
    if (!dbUrl.includes('sslmode=')) {
        const separator = dbUrl.includes('?') ? '&' : '?';
        dbUrl = dbUrl + separator + 'sslmode=require';
    }
    dbUrl = dbUrl.replace(/[&?]uselibpqcompat=true/, '');
}

if (!dbUrl) {
    console.error('🚨 ERRO: DATABASE_URL não encontrada!');
}

// Certificados
const certsDir = path.join(backendDir, 'certificates');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

// v178: Simplificação de SSL - Mantemos apenas a cópia básica, mas não injetamos na URL
// Apenas para caso precise futuramente.
const caCertPath = path.join(certsDir, 'ca.crt');
const rawCaPath = path.join(certsDir, 'ca-certificate.crt');

if (fs.existsSync(rawCaPath) && !fs.existsSync(caCertPath)) {
    console.log('📦 Copiando ca-certificate.crt -> ca.crt');
    fs.copyFileSync(rawCaPath, caCertPath);
}

const sslConfig = { rejectUnauthorized: false };
console.log('[SSL] ℹ️ Modo v178 (Simplificado): rejectUnauthorized=false');

// ==========================================
// 2. PROBE DE BANCO DE DADOS
// ==========================================

async function probeDatabase() {
    console.log('🧪 Iniciando Probe de Banco...');

    const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/['"]/g, "") : undefined;
    if (!connectionString) {
        console.error('🚨 ERRO: DATABASE_URL não definida.');
        process.exit(1);
    }

    const cleanUrlForProbe = (u) => u.split('?')[0];

    // v161: Candidatos robustos garantindo o pathname /dbname
    const candidates = [];
    try {
        const base = new URL(connectionString);
        const hosts = [base.hostname];
        const ports = [base.port || '7161'];
        // v178: Prioridade DEFINITIVA para 'gestaodb'
        const dbs = ['gestaodb', 'squarecloud', 'postgres', 'admin'];

        for (const db of dbs) {
            const u = new URL(connectionString);
            u.pathname = `/${db}`;
            candidates.push(u.toString());
        }
        candidates.push(connectionString); // Original como fallback
    } catch (e) {
        candidates.push(connectionString);
    }

    // v171: Garante que o default seja o squarecloud se nada for encontrado
    let finalUrl = candidates.find(c => c.includes('/gestaodb')) || candidates[0];
    let success = false;

    for (const url of candidates) {
        const masked = url.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`📡 Testando candidato: ${masked}`);

        const probePool = new Pool({
            connectionString: cleanUrlForProbe(url),
            ssl: { rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            const client = await probePool.connect();
            const res = await client.query('SELECT current_database()');
            const dbName = res.rows[0].current_database;
            console.log(`✅ SUCESSO! Banco detectado: ${dbName}`);
            finalUrl = url;
            success = true;
            client.release();
            await probePool.end();
            if (dbName === 'gestaodb') break;
        } catch (err) {
            console.log(`❌ Falha: ${err.message}`);
            await probePool.end();
        }
    }

    return { finalUrl, success };
}

// ==========================================
// 3. BUILD DO BACKEND (SE NECESSÁRIO)
// ==========================================

function buildBackendIfNeeded(commonEnv) {
    const buildSentinel = path.join(backendDir, '.next', '.square_build_complete_v2');

    // Limpa legado
    const legacyPaths = [
        'src/app/api/v1/time-records',
        'src/app/api/v1/daily-reports',
        'src/app/api/v1/work-stages'
    ];
    legacyPaths.forEach(p => {
        const fullPath = path.join(backendDir, p);
        if (fs.existsSync(fullPath)) {
            console.log(`🧹 Removendo pasta legada: ${p}`);
            try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) { }
        }
    });

    // 🔧 Patch: Desabilitar output standalone para compatibilidade com `next start`
    const nextConfigPath = path.join(backendDir, 'next.config.mjs');
    if (fs.existsSync(nextConfigPath)) {
        try {
            let config = fs.readFileSync(nextConfigPath, 'utf8');
            if (config.includes("output: 'standalone'") || config.includes('output: "standalone"')) {
                config = config.replace(/output:\s*['"]standalone['"]/g, '// output: "standalone" // Desabilitado para SquareCloud (next start)');
                fs.writeFileSync(nextConfigPath, config);
                console.log('🔧 Patch: output standalone DESABILITADO no next.config.mjs');

                // Forçar rebuild se o patch foi aplicado (old build usava standalone)
                const oldSentinel = path.join(backendDir, '.next', '.square_build_complete_unified');
                if (fs.existsSync(oldSentinel)) {
                    console.log('🧹 Removendo sentinel antigo (rebuild necessário)...');
                    try { fs.unlinkSync(oldSentinel); } catch (e) { }
                }
                if (fs.existsSync(buildSentinel)) {
                    try { fs.unlinkSync(buildSentinel); } catch (e) { }
                }
                // Limpar build antigo com standalone
                const nextDir = path.join(backendDir, '.next');
                if (fs.existsSync(nextDir)) {
                    console.log('🧹 Limpando build antigo (.next)...');
                    try { fs.rmSync(nextDir, { recursive: true, force: true }); } catch (e) { }
                }
            }
        } catch (e) {
            console.warn('⚠️ Erro ao patchar next.config.mjs:', e.message);
        }
    }

    if (!fs.existsSync(buildSentinel)) {
        console.log('🏗️ Build do backend não encontrado. Iniciando build...');
        try {
            console.log('🔧 Gerando Prisma Client...');
            runPkg('prisma generate', { cwd: backendDir, env: commonEnv });
            console.log('✅ Prisma Client gerado!');

            console.log('🏗️ Executando build...');
            runPkg('build', { cwd: backendDir, env: commonEnv });

            fs.mkdirSync(path.dirname(buildSentinel), { recursive: true });
            fs.writeFileSync(buildSentinel, `Build v165 complete at ${new Date().toISOString()}`);
            console.log('✅ Build finalizado com sucesso!');
        } catch (e) {
            console.error('⚠️ Falha no build automático:', e.message);
        }
    } else {
        console.log('✅ Build do backend já existe (sentinel v2 encontrado).');
    }
}

// ==========================================
// 4. SETUP DO AMBIENTE + CERTS PARA O NEXT.JS
// ==========================================

function setupEnvironment(finalUrl) {
    // v178: Simplificação (Nenhum path de certificado injetado)

    // v178: SSL Simplificado (User Request)
    // Removemos caminhos de certificado para evitar 'unknown ca'.
    // O servidor SquareCloud aceita conexão apenas com senha + sslmode=require.
    const sslParams = `&schema=public&sslmode=require`;
    const cleanBaseUrl = finalUrl.split('?')[0];

    // v178: URLs Limpas
    const finalNakedUrl = `${cleanBaseUrl}?sslmode=require`;
    const finalAppUrl = `${cleanBaseUrl}?${sslParams.substring(1)}`;

    // Parse da URL
    let pgEnvs = {};
    try {
        const urlObj = new URL(finalUrl);
        pgEnvs = {
            PGUSER: urlObj.username || 'squarecloud',
            PGPASSWORD: urlObj.password,
            PGHOST: urlObj.hostname,
            PGPORT: urlObj.port || '7161',
            PGDATABASE: urlObj.pathname.split('/')[1] || 'squarecloud'
        };
    } catch (e) {
        console.warn('⚠️ Falha no parsing da URL.');
    }

    // Escrever .env no diretório do backend
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'https://www.gestaovirtual.com';
    try {
        fs.writeFileSync(path.join(backendDir, '.env'), [
            `DATABASE_URL="${finalAppUrl}"`,
            `PGHOST="${pgEnvs.PGHOST}"`,
            `PGPORT="${pgEnvs.PGPORT}"`,
            `PGUSER="${pgEnvs.PGUSER}"`,
            `PGPASSWORD="${pgEnvs.PGPASSWORD}"`,
            `PGDATABASE="${pgEnvs.PGDATABASE}"`,
            `PRISMA_CLIENT_ENGINE_TYPE="library"`,
            `PRISMA_CLI_QUERY_ENGINE_TYPE="library"`,
            `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK="1"`,
            `PRISMA_SCHEMA_DISABLE_SEARCH_PATH_CHECK="1"`,
            `PRISMA_SCHEMA_DISABLE_DATABASE_CREATION="1"`,
            `AUTH_TRUST_HOST="1"`,
            `NEXTAUTH_URL="${nextAuthUrl}"`,
            `TRUST_PROXY="1"`,
            `INTERNAL_PROXY_KEY="${INTERNAL_PROXY_KEY}"`,
            ''
        ].join('\n'));
    } catch (err) {
        console.warn('⚠️ Erro ao escrever .env:', err.message);
    }

    return {
        finalAppUrl,
        finalNakedUrl,
        pgEnvs,
        commonEnv: {
            ...process.env,
            ...pgEnvs,
            DATABASE_URL: finalAppUrl,
            // v178: Enviando SSL params simplificados para o env também
            PGSSLMODE: 'require',
            PRISMA_CLIENT_ENGINE_TYPE: 'library',
            PRISMA_CLI_QUERY_ENGINE_TYPE: 'library',
            PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: '1',
            PRISMA_SCHEMA_DISABLE_SEARCH_PATH_CHECK: '1',
            PRISMA_SCHEMA_DISABLE_DATABASE_CREATION: '1',
            AUTH_TRUST_HOST: '1',
            TRUST_PROXY: '1',
            INTERNAL_PROXY_KEY: INTERNAL_PROXY_KEY,
            CERT_PATH_ROOT: backendDir,
            NODE_ENV: 'production'
        }
    };
}

// ==========================================
// 5. SINCRONIZAÇÃO DE SCHEMA + SEEDS
// ==========================================

async function syncSchemaAndSeeds(commonEnv, finalAppUrl, finalNakedUrl, success) {
    const shouldNuke = success && process.env.FORCE_NUKE_DB === 'true';
    const shouldSync = success && (
        shouldNuke ||
        process.env.RUN_SEEDS === 'true' ||
        process.env.FORCE_DB_PUSH === 'true' ||
        process.env.FORCE_SEED === 'true'
    );

    // v178: CLI Booster (Prisma Engine Powered)
    // Substituindo o driver 'pg' (que falha no SSL) pelo Prisma CLI.
    console.log('🛡️ [v178] EXECUTANDO BOOSTER VIA PRISMA CLI (Target: gestaodb)...');
    try {
        const sqlCommands = [
            // Garantir permissões no Schema Public
            `GRANT USAGE, CREATE ON SCHEMA public TO public;`,
            `GRANT USAGE, CREATE ON SCHEMA public TO squarecloud;`,
            `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO squarecloud;`,
            `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO squarecloud;`,
            `GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO squarecloud;`,
            `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO squarecloud;`,
            `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO squarecloud;`,
            // Garantir Owner e Conexão Explicitamente no gestaodb
            `ALTER DATABASE gestaodb OWNER TO squarecloud;`,
            `GRANT CONNECT ON DATABASE gestaodb TO public;`,
            `GRANT CONNECT ON DATABASE gestaodb TO squarecloud;`,
            // Garantir Owner do Schema
            `ALTER SCHEMA public OWNER TO squarecloud;`
        ].join('\n');

        // Executar tudo em um único comando via stdin na URL Naked (gestaodb)
        // A url finalNakedUrl já tem sslmode=require (v178)
        const successGrant = runSqlViaPrisma(sqlCommands, finalNakedUrl, commonEnv);

        if (successGrant) {
            console.log('✅ [v178] Booster CLI aplicado com sucesso!');
        } else {
            console.warn('⚠️ [v178] Booster CLI retornou erro (ver logs acima).');
        }

    } catch (e) {
        console.warn('⚠️ [v178] Falha CRÍTICA no Booster CLI:', e.message);
    }

    if (shouldNuke) {
        console.log('💣 [v153] Iniciando NUKE do banco via Prisma...');
        const nukeSql = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;';
        runSqlViaPrisma(nukeSql, finalAppUrl, commonEnv);
    }

    if (shouldSync) {
        console.log('🏗️  [v162] Sincronizando Estrutura via Prisma Migrations...');
        try {
            console.log('🚀 Executando: prisma migrate deploy...');
            runPkg('prisma migrate deploy', {
                env: { ...commonEnv, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
                cwd: backendDir
            });
            console.log('✅ [v162] Migrations aplicadas com sucesso!');
        } catch (e) {
            console.warn('⚠️ [v162] Falha nas Migrations, tentando db push como fallback...', e.message);
            try {
                runPkg('prisma db push --skip-generate --accept-data-loss', {
                    env: { ...commonEnv, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
                    cwd: backendDir
                });
                console.log('✅ [v162] Estrutura sincronizada via db push!');
            } catch (e2) {
                console.warn('⚠️ [v162] Falha no db push, tentando injeção manual...');
                try {
                    const sqlStructure = execSync(
                        'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
                        { env: commonEnv, encoding: 'utf8', cwd: backendDir }
                    );
                    if (sqlStructure && sqlStructure.trim().length > 10) {
                        runSqlViaPrisma(sqlStructure, finalAppUrl, commonEnv);
                    }
                } catch (e3) {
                    console.error('❌ Falha Total na Sincronização:', e3.message);
                }
            }
        }

        // v154: Restauração com Booster Interno (Prisma powered)
        console.log('--------------------------------------------------');
        console.log('📥 [v155] INICIANDO RESTAURAÇÃO (INTERNAL BOOSTER ACTIVE)');
        try {
            const tsxPath = path.join(backendDir, 'node_modules', '.bin', 'tsx');
            const cmd = fs.existsSync(tsxPath) ? `node ${tsxPath} src/scripts/restore-from-backup.ts` : 'npx tsx src/scripts/restore-from-backup.ts';

            execSync(cmd, {
                stdio: 'inherit',
                env: { ...commonEnv, NODE_OPTIONS: '--import tsx' },
                cwd: backendDir
            });
            console.log('✅ [v154] Processo de restauro finalizado!');
        } catch (e) {
            console.error('❌ [v154] Erro no Restauro:', e.message);
        }
        console.log('--------------------------------------------------');

        if (process.env.RUN_SEEDS === 'true' || process.env.FORCE_SEED === 'true') {
            console.log('🌟 Executando Master Seed...');
            try {
                execSync('npx tsx src/scripts/master-seed.ts', { stdio: 'inherit', env: commonEnv, cwd: backendDir });
            } catch (e) {
                console.warn('⚠️ Erro no seeding:', e.message);
            }
            console.log('✅ Master Seed finalizado!');
        }
    }

    // ==========================================
}

// ==========================================
// 6. INICIAR BACKEND (Next.js na porta 3001)
// ==========================================

function startBackend(commonEnv) {
    const standaloneServer = path.join(backendDir, '.next', 'standalone', 'server.js');
    const rootStandalone = path.join(backendDir, 'server.js');

    const backendEnv = {
        ...commonEnv,
        PORT: String(BACKEND_PORT),
        HOSTNAME: '127.0.0.1' // Bind apenas em localhost (não expõe externamente)
    };

    return new Promise((resolve) => {
        let serverProcess;

        if (fs.existsSync(standaloneServer)) {
            console.log(`🚀 Iniciando Next.js Standalone na porta ${BACKEND_PORT}...`);
            serverProcess = spawn('node', [standaloneServer], {
                stdio: 'inherit',
                shell: true,
                cwd: backendDir,
                env: backendEnv
            });
        } else if (fs.existsSync(rootStandalone)) {
            console.log(`🚀 Iniciando Next.js Root Server na porta ${BACKEND_PORT}...`);
            serverProcess = spawn('node', [rootStandalone], {
                stdio: 'inherit',
                shell: true,
                cwd: backendDir,
                env: backendEnv
            });
        } else {
            console.log(`🏃 Iniciando Next.js start na porta ${BACKEND_PORT}...`);
            // Nota: spawn não funciona direto com runPkg, então usamos a lógica explícita
            const cmd = fs.existsSync(path.join(__dirname, 'yarn.lock')) ? 'yarn' : 'npx';
            const args = cmd === 'yarn' ? ['next', 'start', '-p', String(BACKEND_PORT), '-H', '127.0.0.1'] : ['next', 'start', '-p', String(BACKEND_PORT), '-H', '127.0.0.1'];

            serverProcess = spawn(cmd, args, {
                stdio: 'inherit',
                shell: true,
                cwd: backendDir,
                env: backendEnv
            });
        }

        serverProcess.on('error', (err) => {
            console.error('❌ Erro ao iniciar backend:', err.message);
        });

        // Aguarda o backend estar pronto
        console.log('⏳ Aguardando backend iniciar...');
        let attempts = 0;
        const maxAttempts = 30;

        const checkReady = setInterval(() => {
            attempts++;
            const http = require('http');
            const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/v1/health`, (res) => {
                if (res.statusCode) {
                    clearInterval(checkReady);
                    console.log(`✅ Backend ONLINE na porta ${BACKEND_PORT} (tentativa ${attempts})`);
                    resolve(serverProcess);
                }
            });
            req.on('error', () => {
                if (attempts >= maxAttempts) {
                    clearInterval(checkReady);
                    console.warn(`⚠️ Backend pode não ter iniciado após ${maxAttempts} tentativas. Continuando...`);
                    resolve(serverProcess);
                }
            });
            req.setTimeout(2000, () => req.destroy());
        }, 2000);
    });
}

// ==========================================
// 7. INICIAR GATEWAY EXPRESS (porta 80)
// ==========================================

function startGateway() {
    const http = require('http');

    // Carrega Express
    let express;
    try { express = require('express'); } catch (e) {
        try { express = require(path.join(backendDir, 'node_modules', 'express')); } catch (e2) {
            console.log('📦 Instalando express...');
            execSync('npm install express --no-save', { stdio: 'inherit', cwd: __dirname });
            express = require('express');
        }
    }

    const app = express();
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'https://www.gestaovirtual.com';

    // ---- SECURITY HEADERS ----
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });

    // ---- PROXY REVERSO NATIVO (http.request) ----
    // Usa Node.js http nativo para GARANTIR conexão HTTP (sem SSL)
    console.log(`🔧 Proxy: /api/* → http://127.0.0.1:${BACKEND_PORT} (Node.js http nativo)`);

    function proxyHandler(req, res) {
        const headers = { ...req.headers };

        // 🔒 Injeta header secreto para autenticar proxy interno
        headers['x-internal-proxy-key'] = INTERNAL_PROXY_KEY;

        // Reescreve Origin e Host para o backend aceitar
        headers['origin'] = nextAuthUrl;
        headers['host'] = `127.0.0.1:${BACKEND_PORT}`;

        // Remove headers que podem causar problemas de protocolo
        delete headers['connection'];
        delete headers['upgrade'];

        // Preserva headers de autenticação
        const cfHeaders = ['cf-ray', 'cf-connecting-ip', 'true-client-ip', 'x-forwarded-for'];
        // Forçar x-forwarded-proto como http (comunicação interna)
        headers['x-forwarded-proto'] = 'https'; // Manter como https pois o client original é https

        const options = {
            hostname: '127.0.0.1',
            port: BACKEND_PORT,
            path: (() => {
                let p = req.originalUrl || req.url;
                // Rewrite SELETIVO: só converter rotas que usam underscore no backend
                // Mapa: segmento com hífen (frontend) → segmento com underscore (backend)
                const hyphenToUnderscore = [
                    'work-stages', 'stage-progress', 'map-elements', 'map-element-visibility',
                    'audit-logs', 'construction-documents', 'daily-reports', 'job-functions',
                    'list-iap', 'permission-levels', 'permission-matrix', 'permission-modules',
                    'project-3d-cable-settings', 'project-monthly-targets',
                    'system-messages', 'task-queue', 'team-members', 'temporary-permissions',
                    'time-records', 'user-addresses', 'user-roles',
                    'admin-update-user-email', 'delete-user-safe', 'login-funcionario',
                    'move-team-member', 'resolve-login-identifier'
                ];
                const original = p;
                const [pathPart, queryPart] = p.split('?');
                let rewritten = pathPart;
                for (const segment of hyphenToUnderscore) {
                    if (rewritten.includes(segment)) {
                        rewritten = rewritten.replace(segment, segment.replace(/-/g, '_'));
                    }
                }
                p = queryPart ? rewritten + '?' + queryPart : rewritten;
                if (p !== original) {
                    console.log(`[COMPAT] Rewriting ${original} -> ${p}`);
                }
                return p;
            })(),
            method: req.method,
            headers: headers
        };

        const proxyReq = http.request(options, (proxyRes) => {
            // Corrigir CORS headers na resposta
            const resHeaders = { ...proxyRes.headers };

            // Permitir a origem real do browser
            const origin = req.headers.origin || nextAuthUrl;
            resHeaders['access-control-allow-origin'] = origin;
            resHeaders['access-control-allow-credentials'] = 'true';

            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (e) => {
            console.error(`❌ Proxy Error: ${e.message}`);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend Indisponível' }));
            }
        });

        if (req.body) {
            // Se body-parser já consumiu, teria que reemitir. 
            // Mas aqui estamos usando req direto (stream)
        }

        req.pipe(proxyReq);
    }

    // Rotas de API -> Backend
    app.use('/api', proxyHandler);

    // Servir Frontend Estático
    console.log(`📦 Servindo frontend estático de: ${frontendDistDir}`);
    app.use(express.static(frontendDistDir));

    // Fallback para SPA (qualquer outra rota -> index.html)
    app.get('*', (req, res) => {
        if (req.path.startsWith('/api')) {
            return proxyHandler(req, res);
        }
        const indexHtml = path.join(frontendDistDir, 'index.html');
        if (fs.existsSync(indexHtml)) {
            res.sendFile(indexHtml);
        } else {
            res.status(404).send('Frontend não encontrado (index.html ausente).');
        }
    });

    app.listen(GATEWAY_PORT, '0.0.0.0', () => {
        console.log('');
        console.log('===================================================');
        console.log('🛸 GESTÃO VIRTUAL — SERVIDOR UNIFICADO ONLINE!');
        console.log('===================================================');
        console.log(`🌐 Gateway:  http://0.0.0.0:${GATEWAY_PORT}`);
        console.log(`🔧 Backend:  http://127.0.0.1:${BACKEND_PORT} (interno)`);
        console.log(`🔒 Proxy Key: ${INTERNAL_PROXY_KEY.substring(0, 15)}...`);
        console.log('===================================================');
    });
}

// ==========================================
// 🚀 INICIALIZAÇÃO GERAL
// ==========================================

(async () => {
    try {
        // 1. Probe (para definir URL final)
        const { finalUrl, success } = await probeDatabase();

        // 2. Setup (Certs + Env)
        const { commonEnv, finalAppUrl, finalNakedUrl } = setupEnvironment(finalUrl);

        // 3. Backend Build (se precisar)
        buildBackendIfNeeded(commonEnv);

        // 4. Sync / Seeds / Nuke
        await syncSchemaAndSeeds(commonEnv, finalAppUrl, finalNakedUrl, success);

        // 5. Start Gateway e Backend em PARALELO
        // O Gateway serve o frontend imediatamente. O Backend sobe no seu tempo.
        startGateway();
        await startBackend(commonEnv);

    } catch (e) {
        console.error('🔥 CRASH FATAL:', e);
        process.exit(1);
    }
})();
