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

// ==========================================
// 1. INSTALAR DEPENDÊNCIAS
// ==========================================

console.log('📦 Instalando dependências do gateway (raiz)...');
try {
    execSync('npm install --omit=dev --no-audit --no-fund', {
        stdio: 'inherit', cwd: __dirname
    });
    console.log('✅ Dependências do gateway instaladas.');
} catch (e) {
    console.warn('⚠️ Falha no npm install raiz:', e.message);
}

console.log('📦 Instalando dependências do backend...');
try {
    execSync('npm install --omit=dev --legacy-peer-deps --no-audit --no-fund', {
        stdio: 'inherit', cwd: backendDir
    });
    console.log('✅ Dependências do backend instaladas.');
} catch (e) {
    console.warn('⚠️ Falha no npm install backend:', e.message);
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

const clientCertPath = path.join(certsDir, 'client.crt');
const clientKeyPath = path.join(certsDir, 'client.key');
const caCertPath = path.join(certsDir, 'ca.crt');
const bundlePath = path.join(certsDir, 'certificate.pem');
const rawCaPath = path.join(certsDir, 'ca-certificate.crt');
const rawKeyPath = path.join(certsDir, 'private-key.key');

if (fs.existsSync(rawCaPath) && !fs.existsSync(caCertPath)) {
    console.log('📦 Copiando ca-certificate.crt -> ca.crt');
    fs.copyFileSync(rawCaPath, caCertPath);
}

if (fs.existsSync(rawKeyPath) && !fs.existsSync(clientKeyPath)) {
    console.log('📦 Copiando private-key.key -> client.key');
    fs.copyFileSync(rawKeyPath, clientKeyPath);
}

let extractedFromBundle = false;
if (fs.existsSync(bundlePath)) {
    try {
        const content = fs.readFileSync(bundlePath, 'utf8');
        const certs = content.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
        const keys = content.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g);

        if (keys && !fs.existsSync(clientKeyPath)) {
            fs.writeFileSync(clientKeyPath, keys[0]);
            console.log('✅ Chave extraída do bundle.');
        }
        if (certs) {
            if (!fs.existsSync(clientCertPath)) {
                fs.writeFileSync(clientCertPath, certs[0]);
                console.log('✅ Certificado extraído do bundle.');
            }
            extractedFromBundle = true;
            if (certs.length > 1 && !fs.existsSync(caCertPath)) {
                fs.writeFileSync(caCertPath, certs[1]);
                console.log('✅ CA Root extraída do bundle.');
            }
        }
    } catch (e) {
        console.warn('⚠️ Erro ao processar bundle:', e.message);
    }
}

// Varredura e Validação
console.log('🔍 Validando Identidade de Cliente...');
let isRealClientCert = extractedFromBundle || fs.existsSync(clientCertPath);

if (!isRealClientCert) {
    try {
        const allFiles = fs.readdirSync(certsDir);
        for (const file of allFiles) {
            const filePath = path.join(certsDir, file);
            if (file.match(/\.(crt|pem|cert)$/) && file !== 'ca.crt' && file !== 'ca-certificate.crt') {
                try {
                    const subject = execSync(`openssl x509 -in "${filePath}" -noout -subject`, { encoding: 'utf8' }).trim();
                    if (!subject.includes('*.squareweb.app')) {
                        console.log(`✨ ALVO ENCONTRADO em [${file}].`);
                        fs.copyFileSync(filePath, clientCertPath);
                        isRealClientCert = true;
                        break;
                    }
                } catch (e) { }
            }
        }
    } catch (e) { }
}

const sslConfig = { rejectUnauthorized: false };
const sslSimpleConfig = { rejectUnauthorized: false }; // Sem mTLS para redundância
if (fs.existsSync(caCertPath)) {
    sslConfig.ca = fs.readFileSync(caCertPath);
    sslSimpleConfig.ca = fs.readFileSync(caCertPath);
    console.log('[SSL] 🛡️  CA Root carregada.');
}
if (isRealClientCert && fs.existsSync(clientKeyPath)) {
    sslConfig.cert = fs.readFileSync(clientCertPath);
    sslConfig.key = fs.readFileSync(clientKeyPath);
    console.log('[mTLS] 🛡️  Identidade ATIVA (Cert + Key).');
} else {
    console.log('[SSL] ℹ️  Modo Simple (Apenas CA).');
}

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

    const candidates = [
        connectionString.replace(/\/([^\/?]+)(\?|$)/, '/squarecloud$2'),
        connectionString.replace(/\/([^\/?]+)(\?|$)/, '/admin$2'),
        connectionString.replace(/\/([^\/?]+)(\?|$)/, '/postgres$2'),
        connectionString
    ];

    let finalUrl = connectionString;
    let success = false;

    for (const url of candidates) {
        const masked = url.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`📡 Testando candidato: ${masked}`);

        const probePool = new Pool({
            connectionString: cleanUrlForProbe(url),
            ssl: { ...sslConfig, rejectUnauthorized: false },
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
            if (dbName === 'squarecloud') break;
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

function buildBackendIfNeeded() {
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
        console.log('🏗️ Build do backend não encontrado. Iniciando "next build"...');
        try {
            console.log('🔧 Gerando Prisma Client...');
            execSync('npx prisma@6 generate', {
                stdio: 'inherit',
                cwd: backendDir,
                env: { ...process.env, NODE_ENV: 'production' }
            });
            console.log('✅ Prisma Client gerado!');

            execSync('npx next build', {
                stdio: 'inherit',
                cwd: backendDir,
                env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' }
            });

            fs.mkdirSync(path.dirname(buildSentinel), { recursive: true });
            fs.writeFileSync(buildSentinel, 'Build finalizado em ' + new Date().toISOString());
            console.log('✅ Build do backend concluído!');
        } catch (e) {
            console.warn('⚠️ Falha no build automático:', e.message);
        }
    } else {
        console.log('✅ Build do backend já existe (sentinel v2 encontrado).');
    }
}

// ==========================================
// 4. SETUP DO AMBIENTE + CERTS PARA O NEXT.JS
// ==========================================

function setupEnvironment(finalUrl) {
    // Preparar certs na raiz do backend
    const absCert = path.join(backendDir, 'client.crt');
    const absKey = path.join(backendDir, 'client.key');
    const absCA = path.join(backendDir, 'ca.crt');

    try {
        if (fs.existsSync(clientCertPath)) fs.copyFileSync(clientCertPath, absCert);
        if (fs.existsSync(clientKeyPath)) fs.copyFileSync(clientKeyPath, absKey);
        if (fs.existsSync(caCertPath)) fs.copyFileSync(caCertPath, absCA);
        try { fs.chmodSync(absCert, 0o644); } catch (e) { }
        try { fs.chmodSync(absKey, 0o644); } catch (e) { }
        try { fs.chmodSync(absCA, 0o644); } catch (e) { }
        console.log('🔓 Chaves mTLS prontas.');
    } catch (e) {
        console.warn('⚠️ Erro certs:', e.message);
    }

    // v159: Forçando schema=public para garantir que o Prisma encontre as tabelas criadas manualmente
    const sslParams = `&schema=public&sslmode=verify-ca&sslcert=${absCert}&sslkey=${absKey}&sslrootcert=${absCA}`;
    const cleanBaseUrl = finalUrl.split('?')[0];
    const finalAppUrl = `${cleanBaseUrl}?${sslParams.substring(1)}`;

    // Parse da URL
    let pgEnvs = {};
    try {
        const urlObj = new URL(finalUrl);
        pgEnvs = {
            PGUSER: urlObj.username || 'squarecloud',
            PGPASSWORD: urlObj.password,
            PGHOST: urlObj.hostname,
            PGPORT: urlObj.port || '7135',
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
        pgEnvs,
        commonEnv: {
            ...process.env,
            ...pgEnvs,
            DATABASE_URL: finalAppUrl,
            PGSSLCERT: absCert,
            PGSSLKEY: absKey,
            PGSSLROOTCERT: absCA,
            PGSSLMODE: 'verify-ca',
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

async function syncSchemaAndSeeds(commonEnv, finalAppUrl, success) {
    const shouldNuke = success && process.env.FORCE_NUKE_DB === 'true';
    const shouldSync = success && (
        shouldNuke ||
        process.env.RUN_SEEDS === 'true' ||
        process.env.FORCE_DB_PUSH === 'true' ||
        process.env.FORCE_SEED === 'true'
    );

    if (shouldNuke) {
        console.log('💣 [v153] Iniciando NUKE do banco via Prisma...');
        const nukeSql = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;';
        runSqlViaPrisma(nukeSql, finalAppUrl, commonEnv);
    }

    if (shouldSync) {
        console.log('🏗️  [v157] Sincronizando Estrutura via Prisma Migrations...');
        try {
            // Tentativa 1: Migrate Deploy (Oficial para produção/banco limpo)
            console.log('🚀 Executando: npx prisma migrate deploy...');
            execSync('npx prisma migrate deploy', {
                env: { ...commonEnv, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
                stdio: 'inherit',
                cwd: backendDir
            });
            console.log('✅ [v157] Migrations aplicadas com sucesso!');
        } catch (e) {
            console.warn('⚠️ [v157] Falha nas Migrations, tentando db push como fallback...', e.message);
            try {
                // Tentativa 2: DB Push (Fallback agressivo)
                execSync('npx prisma db push --skip-generate --accept-data-loss', {
                    env: { ...commonEnv, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
                    stdio: 'inherit',
                    cwd: backendDir
                });
                console.log('✅ [v157] Estrutura sincronizada via db push!');
            } catch (e2) {
                console.warn('⚠️ [v157] Falha no db push, tentando injeção manual...');
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
    }

    // v159: Universal Booster com Fallback SSL
    console.log('🛡️  [v159] EXECUTANDO BOOSTER NUCLEAR...');
    try {
        const boosterOptions = {
            connectionString: finalAppUrl.split('?')[0],
            ssl: { ...sslConfig, rejectUnauthorized: false },
            connectionTimeoutMillis: 10000
        };

        // Tenta com mTLS primeiro, se falhar tenta SSL simples (alguns proxies barram o cert cliente)
        let client;
        try {
            console.log('📡 [v159] Tentativa 1: Booster via mTLS...');
            const pool = new Pool(boosterOptions);
            client = await pool.connect();
        } catch (sslErr) {
            console.warn('⚠️  [v159] Falha mTLS no Booster (tentando SSL Simples):', sslErr.message);
            const poolFallback = new Pool({
                ...boosterOptions,
                ssl: { rejectUnauthorized: false } // Sem certificados cliente no fallback
            });
            client = await poolFallback.connect();
        }

        try {
            console.log('🔑 Aplicando privilégios nucleares e fixando search_path...');
            await client.query(`
                GRANT ALL ON SCHEMA public TO public;
                GRANT ALL ON SCHEMA public TO squarecloud;
                GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO squarecloud;
                GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO squarecloud;
                GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO squarecloud;
                GRANT USAGE, CREATE ON SCHEMA public TO squarecloud;
                ALTER DATABASE squarecloud OWNER TO squarecloud;
                ALTER SCHEMA public OWNER TO squarecloud;
                ALTER ROLE squarecloud SET search_path TO public;
                
                -- Garante que o Prisma (que usa transações) não tenha travas de busca
                SET search_path TO public;
            `);
            console.log('✅ [v159] Booster Nuclear aplicado com SUCESSO!');
        } finally {
            if (client) {
                client.release();
                // O pool será encerrado automaticamente ao fim do processo ou podemos deixá-lo para GC
            }
        }
    } catch (e) {
        console.warn('⚠️ [v159] Booster Nuclear falhou (prosseguindo):', e.message);
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
            console.log('✅ Master Seed finalizado!');
        } catch (e) {
            console.warn('⚠️ Erro no seeding:', e.message);
        }
    }
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
            console.log(`🏃 Iniciando via npx next start na porta ${BACKEND_PORT}...`);
            serverProcess = spawn('npx', ['next', 'start', '-p', String(BACKEND_PORT), '-H', '127.0.0.1'], {
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
            const browserOrigin = req.headers['origin'] || req.headers['referer'];
            if (browserOrigin) {
                const originUrl = browserOrigin.replace(/\/$/, '').split('/').slice(0, 3).join('/');
                resHeaders['access-control-allow-origin'] = originUrl;
                resHeaders['access-control-allow-credentials'] = 'true';
            }

            // Se o backend retornar 429, logamos para debug
            if (proxyRes.statusCode === 429) {
                console.warn(`⚠️ [GATEWAY] Backend retornou 429 para: ${options.path}`);
            }

            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res, { end: true });
        });

        // Aumentar timeout para auditorias longas
        proxyReq.setTimeout(60000, () => {
            console.error('🛑 [GATEWAY] Proxy Timeout!');
            proxyReq.destroy();
        });

        proxyReq.on('error', (err) => {
            console.error('❌ Proxy Error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro na comunicação com o backend.' }));
            }
        });

        // Pipe do body da requisição
        req.pipe(proxyReq, { end: true });
    }

    // CORS preflight handler
    app.options('/api/*', (req, res) => {
        const origin = req.headers['origin'] || '*';
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Max-Age', '86400');
        res.status(204).end();
    });

    app.use('/api', proxyHandler);

    // ---- FRONTEND ESTÁTICO ----
    if (fs.existsSync(frontendDistDir)) {
        console.log(`📁 Servindo frontend estático de: ${frontendDistDir}`);

        app.use(express.static(frontendDistDir, {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                } else {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
            }
        }));

        // SPA Fallback: qualquer rota que não seja arquivo → index.html
        app.get('*', (req, res) => {
            res.sendFile(path.join(frontendDistDir, 'index.html'));
        });
    } else {
        console.warn('⚠️ Frontend dist não encontrado! Apenas a API estará disponível.');
        app.get('/', (req, res) => {
            res.json({
                service: 'Gestão Virtual',
                status: 'online',
                api: '/api/v1',
                frontend: 'não disponível (dist não encontrado)'
            });
        });
    }

    // ---- INICIAR ----
    app.listen(GATEWAY_PORT, '0.0.0.0', () => {
        console.log('');
        console.log('===================================================');
        console.log('🛸 GESTÃO VIRTUAL — SERVIDOR UNIFICADO ONLINE!');
        console.log('===================================================');
        console.log(`🌐 Gateway:  http://0.0.0.0:${GATEWAY_PORT}`);
        console.log(`🔧 Backend:  http://127.0.0.1:${BACKEND_PORT} (interno)`);
        console.log(`🔒 Proxy Key: ${INTERNAL_PROXY_KEY.substring(0, 12)}...`);
        console.log('===================================================');
    });
}

// ==========================================
// 🏁 FLUXO PRINCIPAL
// ==========================================

async function main() {
    try {
        // Passo 1: Probe do banco de dados
        const { finalUrl, success } = await probeDatabase();

        // Passo 2: Setup do ambiente (certs, .env)
        const { finalAppUrl, commonEnv } = setupEnvironment(finalUrl);

        const maskedFull = finalAppUrl.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`📡 DATABASE_URL: ${maskedFull}`);

        // Passo 3: Build do backend se necessário
        buildBackendIfNeeded();

        // Passo 4: Sync schema + seeds (se configurado)
        await syncSchemaAndSeeds(commonEnv, finalAppUrl, success);

        // Passo 5: Iniciar o backend (Next.js na porta 3001)
        await startBackend(commonEnv);

        // Passo 6: Iniciar o gateway Express (porta 80)
        startGateway();

    } catch (err) {
        console.error('❌ Erro fatal no startup:', err);
        process.exit(1);
    }
}

main();
