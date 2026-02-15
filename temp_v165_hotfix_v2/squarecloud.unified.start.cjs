// ============================================================
// ðŸš€ GESTÃƒO VIRTUAL â€” Servidor Unificado para SquareCloud
// Backend (Next.js, porta 3001) + Frontend (Express, porta 80)
// ============================================================

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// 0. CONFIGURAÃ‡ÃƒO DE SEGURANÃ‡A
// ==========================================
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const BACKEND_PORT = 3001;
const GATEWAY_PORT = process.env.PORT || 80;

// ðŸ”’ Chave interna de seguranÃ§a (proxy â†’ backend)
const INTERNAL_PROXY_KEY = process.env.INTERNAL_PROXY_KEY || 'gv-internal-' + Date.now();
process.env.INTERNAL_PROXY_KEY = INTERNAL_PROXY_KEY;

const backendDir = path.join(__dirname, 'backend');
const frontendDistDir = path.join(__dirname, 'frontend_dist');

// v153: FunÃ§Ã£o auxiliar para executar SQL usando o motor do Prisma (resiliente ao mTLS)
function runSqlViaPrisma(sql, url, env) {
    try {
        console.log(`ðŸ”¨ [v153] Executando comando SQL via Prisma CLI...`);
        execSync(`npx prisma db execute --stdin --url "${url}"`, {
            input: sql,
            env: { ...env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
            stdio: 'inherit',
            cwd: backendDir
        });
        return true;
    } catch (e) {
        console.warn('âš ï¸ [v153] Falha ao executar SQL via Prisma:', e.message);
        return false;
    }
}

// ==========================================
// ðŸš€ AUTO-HEALING (LIMPEZA AUTOMÃTICA)
// ==========================================
const DEPLOY_ID = '[[DEPLOY_ID]]'; // Injetado via PS1
const deployIdFile = path.join(__dirname, '.square_deploy_id');

if (DEPLOY_ID !== '[[DEPLOY_ID]]') {
    let lastId = '';
    if (fs.existsSync(deployIdFile)) {
        lastId = fs.readFileSync(deployIdFile, 'utf8').trim();
    }

    if (lastId !== DEPLOY_ID) {
        console.log('ðŸ”„ [AUTO-HEALING] Nova versÃ£o detectada! Iniciando limpeza de cache...');

        // Pastas para limpar
        const toClean = [
            path.join(backendDir, '.next'),
            path.join(backendDir, 'node_modules'),
            path.join(__dirname, 'node_modules')
        ];

        toClean.forEach(p => {
            if (fs.existsSync(p)) {
                console.log(`ðŸ§¹ Removendo: ${p}`);
                try { fs.rmSync(p, { recursive: true, force: true }); } catch (e) { }
            }
        });

        // Limpar sentinelas de build para forÃ§ar novo build
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
        console.log('âœ… [AUTO-HEALING] Cache limpo com sucesso.');
    }
}

console.log('==================================================');
console.log('ðŸš€ GESTÃƒO VIRTUAL â€” Servidor Unificado');
console.log('==================================================');
console.log('');
console.log('##################################################');
console.log('ðŸš¨ ALERTA DE CONFIGURAÃ‡ÃƒO DE BANCO DE DADOS:');
console.log(`ðŸ”¥ NUKE ATIVO   : ${process.env.FORCE_NUKE_DB === 'true' ? 'ðŸš€ SIM (LIMPANDO TUDO!)' : '---'}`);
console.log(`ðŸ“¥ RESTORE ATIVO: ${process.env.RESTORE_BACKUP === 'true' ? 'ðŸš€ SIM (RESTAURANDO 08/02)' : '---'}`);
console.log('##################################################');
console.log('');
console.log(`ðŸ“¦ Backend Dir: ${backendDir}`);
console.log(`ðŸ“¦ Frontend Dist: ${frontendDistDir}`);
console.log('');

// Helper para rodar comandos de pacote (PadrÃ£o NPM/NPX Square Cloud)
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
// 1. INSTALAR DEPENDÃŠNCIAS
// ==========================================

console.log('ðŸ“¦ Instalando dependÃªncias do gateway (raiz)...');
try {
    runPkg('install', { cwd: __dirname });
    console.log('âœ… DependÃªncias do gateway instaladas.');
} catch (e) {
    console.warn('âš ï¸ Falha na instalaÃ§Ã£o raiz:', e.message);
}

console.log('ðŸ“¦ Instalando dependÃªncias do backend...');
try {
    runPkg('install', { cwd: backendDir });
    console.log('âœ… DependÃªncias do backend instaladas.');
} catch (e) {
    console.warn('âš ï¸ Falha na instalaÃ§Ã£o backend:', e.message);
}

// ==========================================
// 2. SSL / mTLS / CERTIFICADOS
// (LÃ³gica mantida do backend/squarecloud.start.cjs)
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
    console.error('ðŸš¨ ERRO: DATABASE_URL nÃ£o encontrada!');
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
    console.log('ðŸ“¦ Copiando ca-certificate.crt -> ca.crt');
    fs.copyFileSync(rawCaPath, caCertPath);
}

if (fs.existsSync(rawKeyPath) && !fs.existsSync(clientKeyPath)) {
    console.log('ðŸ“¦ Copiando private-key.key -> client.key');
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
            console.log('âœ… Chave extraÃ­da do bundle.');
        }
        if (certs) {
            if (!fs.existsSync(clientCertPath)) {
                fs.writeFileSync(clientCertPath, certs[0]);
                console.log('âœ… Certificado extraÃ­do do bundle.');
            }
            extractedFromBundle = true;
            if (certs.length > 1 && !fs.existsSync(caCertPath)) {
                fs.writeFileSync(caCertPath, certs[1]);
                console.log('âœ… CA Root extraÃ­da do bundle.');
            }
        }
    } catch (e) {
        console.warn('âš ï¸ Erro ao processar bundle:', e.message);
    }
}

// Varredura e ValidaÃ§Ã£o
console.log('ðŸ” Validando Identidade de Cliente...');
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
                        console.log(`âœ¨ ALVO ENCONTRADO em [${file}].`);
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
const sslSimpleConfig = { rejectUnauthorized: false }; // Sem mTLS para redundÃ¢ncia
if (fs.existsSync(caCertPath)) {
    sslConfig.ca = fs.readFileSync(caCertPath);
    sslSimpleConfig.ca = fs.readFileSync(caCertPath);
    console.log('[SSL] ðŸ›¡ï¸  CA Root carregada.');
}
if (isRealClientCert && fs.existsSync(clientKeyPath)) {
    sslConfig.cert = fs.readFileSync(clientCertPath);
    sslConfig.key = fs.readFileSync(clientKeyPath);
    console.log('[mTLS] ðŸ›¡ï¸  Identidade ATIVA (Cert + Key).');
} else {
    console.log('[SSL] â„¹ï¸  Modo Simple (Apenas CA).');
}

// ==========================================
// 2. PROBE DE BANCO DE DADOS
// ==========================================

async function probeDatabase() {
    console.log('ðŸ§ª Iniciando Probe de Banco...');

    const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/['"]/g, "") : undefined;
    if (!connectionString) {
        console.error('ðŸš¨ ERRO: DATABASE_URL nÃ£o definida.');
        process.exit(1);
    }

    const cleanUrlForProbe = (u) => u.split('?')[0];

    // v161: Candidatos robustos garantindo o pathname /dbname
    const candidates = [];
    try {
        const base = new URL(connectionString);
        const hosts = [base.hostname];
        const ports = [base.port || '7161'];
        // v165: Adicionando 'postgres' como candidato prioritÃ¡rio
        const dbs = ['postgres', 'squarecloud', 'admin'];

        for (const db of dbs) {
            const u = new URL(connectionString);
            u.pathname = `/${db}`;
            candidates.push(u.toString());
        }
        candidates.push(connectionString); // Original como fallback
    } catch (e) {
        candidates.push(connectionString);
    }

    let finalUrl = candidates[0]; // v162: Default para o primeiro candidato com /squarecloud
    let success = false;

    for (const url of candidates) {
        const masked = url.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`ðŸ“¡ Testando candidato: ${masked}`);

        const probePool = new Pool({
            connectionString: cleanUrlForProbe(url),
            ssl: { ...sslConfig, rejectUnauthorized: false },
            connectionTimeoutMillis: 5000
        });

        try {
            const client = await probePool.connect();
            const res = await client.query('SELECT current_database()');
            const dbName = res.rows[0].current_database;
            console.log(`âœ… SUCESSO! Banco detectado: ${dbName}`);
            finalUrl = url;
            success = true;
            client.release();
            await probePool.end();
            if (dbName === 'squarecloud') break;
        } catch (err) {
            console.log(`âŒ Falha: ${err.message}`);
            await probePool.end();
        }
    }

    return { finalUrl, success };
}

// ==========================================
// 3. BUILD DO BACKEND (SE NECESSÃRIO)
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
            console.log(`ðŸ§¹ Removendo pasta legada: ${p}`);
            try { fs.rmSync(fullPath, { recursive: true, force: true }); } catch (e) { }
        }
    });

    // ðŸ”§ Patch: Desabilitar output standalone para compatibilidade com `next start`
    const nextConfigPath = path.join(backendDir, 'next.config.mjs');
    if (fs.existsSync(nextConfigPath)) {
        try {
            let config = fs.readFileSync(nextConfigPath, 'utf8');
            if (config.includes("output: 'standalone'") || config.includes('output: "standalone"')) {
                config = config.replace(/output:\s*['"]standalone['"]/g, '// output: "standalone" // Desabilitado para SquareCloud (next start)');
                fs.writeFileSync(nextConfigPath, config);
                console.log('ðŸ”§ Patch: output standalone DESABILITADO no next.config.mjs');

                // ForÃ§ar rebuild se o patch foi aplicado (old build usava standalone)
                const oldSentinel = path.join(backendDir, '.next', '.square_build_complete_unified');
                if (fs.existsSync(oldSentinel)) {
                    console.log('ðŸ§¹ Removendo sentinel antigo (rebuild necessÃ¡rio)...');
                    try { fs.unlinkSync(oldSentinel); } catch (e) { }
                }
                if (fs.existsSync(buildSentinel)) {
                    try { fs.unlinkSync(buildSentinel); } catch (e) { }
                }
                // Limpar build antigo com standalone
                const nextDir = path.join(backendDir, '.next');
                if (fs.existsSync(nextDir)) {
                    console.log('ðŸ§¹ Limpando build antigo (.next)...');
                    try { fs.rmSync(nextDir, { recursive: true, force: true }); } catch (e) { }
                }
            }
        } catch (e) {
            console.warn('âš ï¸ Erro ao patchar next.config.mjs:', e.message);
        }
    }

    if (!fs.existsSync(buildSentinel)) {
        console.log('ðŸ—ï¸ Build do backend nÃ£o encontrado. Iniciando build...');
        try {
            console.log('ðŸ”§ Gerando Prisma Client...');
            runPkg('prisma generate', { cwd: backendDir, env: commonEnv });
            console.log('âœ… Prisma Client gerado!');

            console.log('ðŸ—ï¸ Executando build...');
            runPkg('build', { cwd: backendDir, env: commonEnv });

            fs.mkdirSync(path.dirname(buildSentinel), { recursive: true });
            fs.writeFileSync(buildSentinel, `Build v165 complete at ${new Date().toISOString()}`);
            console.log('âœ… Build finalizado com sucesso!');
        } catch (e) {
            console.error('âš ï¸ Falha no build automÃ¡tico:', e.message);
        }
    } else {
        console.log('âœ… Build do backend jÃ¡ existe (sentinel v2 encontrado).');
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
        console.log('ðŸ”“ Chaves mTLS prontas.');
    } catch (e) {
        console.warn('âš ï¸ Erro certs:', e.message);
    }

    // v165: ForÃ§ando parÃ¢metros para o Prisma e formando a Naked URL
    const sslParams = `&schema=public&sslmode=verify-ca&sslcert=${absCert}&sslkey=${absKey}&sslrootcert=${absCA}`;
    const cleanBaseUrl = finalUrl.split('?')[0];

    // v165: Naked URL (sem schema prefixado)
    const finalNakedUrl = `${cleanBaseUrl}?${sslParams.substring(1).replace('schema=public&', '')}`;
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
        console.warn('âš ï¸ Falha no parsing da URL.');
    }

    // Escrever .env no diretÃ³rio do backend
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
        console.warn('âš ï¸ Erro ao escrever .env:', err.message);
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
// 5. SINCRONIZAÃ‡ÃƒO DE SCHEMA + SEEDS
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
        console.log('ðŸ’£ [v153] Iniciando NUKE do banco via Prisma...');
        const nukeSql = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO public;';
        runSqlViaPrisma(nukeSql, finalAppUrl, commonEnv);
    }

    if (shouldSync) {
        console.log('ðŸ—ï¸  [v162] Sincronizando Estrutura via Prisma Migrations...');
        try {
            console.log('ðŸš€ Executando: prisma migrate deploy...');
            runPkg('prisma migrate deploy', {
                env: { ...commonEnv, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
                cwd: backendDir
            });
            console.log('âœ… [v162] Migrations aplicadas com sucesso!');
        } catch (e) {
            console.warn('âš ï¸ [v162] Falha nas Migrations, tentando db push como fallback...', e.message);
            try {
                runPkg('prisma db push --skip-generate --accept-data-loss', {
                    env: { ...commonEnv, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
                    cwd: backendDir
                });
                console.log('âœ… [v162] Estrutura sincronizada via db push!');
            } catch (e2) {
                console.warn('âš ï¸ [v162] Falha no db push, tentando injeÃ§Ã£o manual...');
                try {
                    const sqlStructure = execSync(
                        'npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script',
                        { env: commonEnv, encoding: 'utf8', cwd: backendDir }
                    );
                    if (sqlStructure && sqlStructure.trim().length > 10) {
                        runSqlViaPrisma(sqlStructure, finalAppUrl, commonEnv);
                    }
                } catch (e3) {
                    console.error('âŒ Falha Total na SincronizaÃ§Ã£o:', e3.message);
                }
            }
        }
    }

    // v165: Booster Nuclear via NAKED URL (Resiliente ao P1010)
    console.log('ðŸ›¡ï¸  [v165] EXECUTANDO BOOSTER NUCLEAR (NAKED URL)...');
    try {
        const sqlBoost = `
            ALTER ROLE squarecloud SET search_path TO public;
            SET search_path TO public;
            GRANT CONNECT ON DATABASE squarecloud TO public;
            GRANT CONNECT ON DATABASE squarecloud TO squarecloud;
            GRANT USAGE, CREATE ON SCHEMA public TO public;
            GRANT USAGE, CREATE ON SCHEMA public TO squarecloud;
            GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO squarecloud;
            GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO squarecloud;
            GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO squarecloud;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO squarecloud;
            ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO squarecloud;
            ALTER DATABASE squarecloud OWNER TO squarecloud;
            ALTER SCHEMA public OWNER TO squarecloud;
        `.replace(/\n/g, ' ');

        // v165: Usa a finalNakedUrl para evitar o bloqueio inicial do schema
        runSqlViaPrisma(sqlBoost, finalNakedUrl, commonEnv);
        console.log('âœ… [v165] Booster Nuclear aplicado via motor Prisma!');
    } catch (e) {
        console.warn('âš ï¸ [v165] Booster Nuclear falhou (prosseguindo):', e.message);
    }

    // v154: RestauraÃ§Ã£o com Booster Interno (Prisma powered)
    console.log('--------------------------------------------------');
    console.log('ðŸ“¥ [v155] INICIANDO RESTAURAÃ‡ÃƒO (INTERNAL BOOSTER ACTIVE)');
    try {
        const tsxPath = path.join(backendDir, 'node_modules', '.bin', 'tsx');
        const cmd = fs.existsSync(tsxPath) ? `node ${tsxPath} src/scripts/restore-from-backup.ts` : 'npx tsx src/scripts/restore-from-backup.ts';

        execSync(cmd, {
            stdio: 'inherit',
            env: { ...commonEnv, NODE_OPTIONS: '--import tsx' },
            cwd: backendDir
        });
        console.log('âœ… [v154] Processo de restauro finalizado!');
    } catch (e) {
        console.error('âŒ [v154] Erro no Restauro:', e.message);
    }
    console.log('--------------------------------------------------');

    if (process.env.RUN_SEEDS === 'true' || process.env.FORCE_SEED === 'true') {
        console.log('ðŸŒŸ Executando Master Seed...');
        try {
            execSync('npx tsx src/scripts/master-seed.ts', { stdio: 'inherit', env: commonEnv, cwd: backendDir });
            console.log('âœ… Master Seed finalizado!');
        } catch (e) {
            console.warn('âš ï¸ Erro no seeding:', e.message);
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
        HOSTNAME: '127.0.0.1' // Bind apenas em localhost (nÃ£o expÃµe externamente)
    };

    return new Promise((resolve) => {
        let serverProcess;

        if (fs.existsSync(standaloneServer)) {
            console.log(`ðŸš€ Iniciando Next.js Standalone na porta ${BACKEND_PORT}...`);
            serverProcess = spawn('node', [standaloneServer], {
                stdio: 'inherit',
                shell: true,
                cwd: backendDir,
                env: backendEnv
            });
        } else if (fs.existsSync(rootStandalone)) {
            console.log(`ðŸš€ Iniciando Next.js Root Server na porta ${BACKEND_PORT}...`);
            serverProcess = spawn('node', [rootStandalone], {
                stdio: 'inherit',
                shell: true,
                cwd: backendDir,
                env: backendEnv
            });
        } else {
            console.log(`ðŸƒ Iniciando Next.js start na porta ${BACKEND_PORT}...`);
            // Nota: spawn nÃ£o funciona direto com runPkg, entÃ£o usamos a lÃ³gica explÃ­cita
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
            console.error('âŒ Erro ao iniciar backend:', err.message);
        });

        // Aguarda o backend estar pronto
        console.log('â³ Aguardando backend iniciar...');
        let attempts = 0;
        const maxAttempts = 30;

        const checkReady = setInterval(() => {
            attempts++;
            const http = require('http');
            const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/api/v1/health`, (res) => {
                if (res.statusCode) {
                    clearInterval(checkReady);
                    console.log(`âœ… Backend ONLINE na porta ${BACKEND_PORT} (tentativa ${attempts})`);
                    resolve(serverProcess);
                }
            });
            req.on('error', () => {
                if (attempts >= maxAttempts) {
                    clearInterval(checkReady);
                    console.warn(`âš ï¸ Backend pode nÃ£o ter iniciado apÃ³s ${maxAttempts} tentativas. Continuando...`);
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
            console.log('ðŸ“¦ Instalando express...');
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
    // Usa Node.js http nativo para GARANTIR conexÃ£o HTTP (sem SSL)
    console.log(`ðŸ”§ Proxy: /api/* â†’ http://127.0.0.1:${BACKEND_PORT} (Node.js http nativo)`);

    function proxyHandler(req, res) {
        const headers = { ...req.headers };

        // ðŸ”’ Injeta header secreto para autenticar proxy interno
        headers['x-internal-proxy-key'] = INTERNAL_PROXY_KEY;

        // Reescreve Origin e Host para o backend aceitar
        headers['origin'] = nextAuthUrl;
        headers['host'] = `127.0.0.1:${BACKEND_PORT}`;

        // Remove headers que podem causar problemas de protocolo
        delete headers['connection'];
        delete headers['upgrade'];

        // Preserva headers de autenticaÃ§Ã£o
        const cfHeaders = ['cf-ray', 'cf-connecting-ip', 'true-client-ip', 'x-forwarded-for'];
        // ForÃ§ar x-forwarded-proto como http (comunicaÃ§Ã£o interna)
        headers['x-forwarded-proto'] = 'https'; // Manter como https pois o client original Ã© https

        const options = {
            hostname: '127.0.0.1',
            port: BACKEND_PORT,
            path: (() => {
                let p = req.originalUrl || req.url;
                // Rewrite SELETIVO: sÃ³ converter rotas que usam underscore no backend
                // Mapa: segmento com hÃ­fen (frontend) â†’ segmento com underscore (backend)
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
                console.warn(`âš ï¸ [GATEWAY] Backend retornou 429 para: ${options.path}`);
            }

            res.writeHead(proxyRes.statusCode, resHeaders);
            proxyRes.pipe(res, { end: true });
        });

        // Aumentar timeout para auditorias longas
        proxyReq.setTimeout(60000, () => {
            console.error('ðŸ›‘ [GATEWAY] Proxy Timeout!');
            proxyReq.destroy();
        });

        proxyReq.on('error', (err) => {
            console.error('âŒ Proxy Error:', err.message);
            if (!res.headersSent) {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, message: 'Erro na comunicaÃ§Ã£o com o backend.' }));
            }
        });

        // Pipe do body da requisiÃ§Ã£o
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

    // ---- FRONTEND ESTÃTICO ----
    if (fs.existsSync(frontendDistDir)) {
        console.log(`ðŸ“ Servindo frontend estÃ¡tico de: ${frontendDistDir}`);

        app.use(express.static(frontendDistDir, {
            setHeaders: (res, filePath) => {
                if (filePath.endsWith('.html')) {
                    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
                } else {
                    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
                }
            }
        }));

        // SPA Fallback: qualquer rota que nÃ£o seja arquivo â†’ index.html
        app.get('*', (req, res) => {
            res.sendFile(path.join(frontendDistDir, 'index.html'));
        });
    } else {
        console.warn('âš ï¸ Frontend dist nÃ£o encontrado! Apenas a API estarÃ¡ disponÃ­vel.');
        app.get('/', (req, res) => {
            res.json({
                service: 'GestÃ£o Virtual',
                status: 'online',
                api: '/api/v1',
                frontend: 'nÃ£o disponÃ­vel (dist nÃ£o encontrado)'
            });
        });
    }

    // ---- INICIAR ----
    app.listen(GATEWAY_PORT, '0.0.0.0', () => {
        console.log('');
        console.log('===================================================');
        console.log('ðŸ›¸ GESTÃƒO VIRTUAL â€” SERVIDOR UNIFICADO ONLINE!');
        console.log('===================================================');
        console.log(`ðŸŒ Gateway:  http://0.0.0.0:${GATEWAY_PORT}`);
        console.log(`ðŸ”§ Backend:  http://127.0.0.1:${BACKEND_PORT} (interno)`);
        console.log(`ðŸ”’ Proxy Key: ${INTERNAL_PROXY_KEY.substring(0, 12)}...`);
        console.log('===================================================');
    });
}

// ==========================================
// ðŸ FLUXO PRINCIPAL
// ==========================================

async function main() {
    try {
        // Passo 1: Probe do banco de dados
        const { finalUrl, success } = await probeDatabase();

        // Passo 2: Setup do ambiente (certs, .env)
        const { finalAppUrl, commonEnv } = setupEnvironment(finalUrl);

        const maskedFull = finalAppUrl.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
        console.log(`ðŸ“¡ DATABASE_URL: ${maskedFull}`);

        // Passo 3: Build do backend se necessÃ¡rio
        buildBackendIfNeeded();

        // Passo 4: Sync schema + seeds (se configurado)
        await syncSchemaAndSeeds(commonEnv, finalAppUrl, success);

        // Passo 5: Iniciar o backend (Next.js na porta 3001)
        await startBackend(commonEnv);

        // Passo 6: Iniciar o gateway Express (porta 80)
        startGateway();

    } catch (err) {
        console.error('âŒ Erro fatal no startup:', err);
        process.exit(1);
    }
}

main();



