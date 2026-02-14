// Wrapper para verificar build e iniciar server na SquareCloud
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 🔥 SOLUÇÃO DEFINITIVA PARA SSL NA SQUARECLOUD
const { Pool } = require('pg');
// Força o Node.js e o motor do Prisma a aceitarem certificados auto-assinados/mTLS 
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 1. Verifica se existe o build de produção (.next/BUILD_ID)
const buildDir = path.join(__dirname, '.next');
const buildSentinel = path.join(buildDir, '.square_build_complete_v88');

// 🔥 [v84] AUTO-CLEANUP DE LEGADO
const legacyPaths = [
  'src/app/api/v1/time-records',
  'src/app/api/v1/daily-reports',
  'src/app/api/v1/work-stages'
];

legacyPaths.forEach(p => {
  const fullPath = path.join(__dirname, p);
  if (fs.existsSync(fullPath)) {
    console.log(`🧹 Removendo pasta legada: ${p}`);
    try {
      fs.rmSync(fullPath, { recursive: true, force: true });
    } catch (e) {
      console.warn(`⚠️ Não foi possível remover1 ${p}:`, e.message);
    }
  }
});

// 🔥 [v80] AUTO-BUILD: Se não tiver o sentinela, faz o build NA HORA
if (!fs.existsSync(buildSentinel)) {
  console.log('🏗️ [v86] Build não encontrado ou versão atualizada. Iniciando "next build" na Square Cloud...');
  try {
    // Garante que temos as dependências para o build
    execSync('npx next build', { stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' } });
    fs.writeFileSync(buildSentinel, 'Build finalizado com sucesso em ' + new Date().toISOString());
    console.log('✅ Build concluído com sucesso!');
  } catch (e) {
    console.warn('⚠️ Falha no build automático. Verifique se o comando "next" está no path ou se falta memória.');
  }
}

// 🔥 TRATAMENTO DE URL (v51: Auto-Probe e Sanitização)
let dbUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/['"]/g, "") : undefined;

if (dbUrl) {
  // Garante sslmode=require
  if (!dbUrl.includes('sslmode=')) {
    const separator = dbUrl.includes('?') ? '&' : '?';
    dbUrl = dbUrl + separator + 'sslmode=require';
  }
  // Limpeza de parâmetros problemáticos
  dbUrl = dbUrl.replace(/[&?]uselibpqcompat=true/, '');
}

if (!dbUrl) {
  console.error('🚨 ERRO: DATABASE_URL não encontrada!');
}

// 3. Configuração mTLS (v45 - Foco em Estabilidade)
const certsDir = path.join(__dirname, 'certificates');
if (!fs.existsSync(certsDir)) fs.mkdirSync(certsDir, { recursive: true });

const clientCertPath = path.join(certsDir, 'client.crt');
const clientKeyPath = path.join(certsDir, 'client.key');
const caCertPath = path.join(certsDir, 'ca.crt');
const bundlePath = path.join(certsDir, 'certificate.pem');

// Fallback de arquivos crus (se o usuário subiu assim)
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

// 🕵️ Varredura e Validação
console.log('🔍 Validando Identidade de Cliente...');
let isRealClientCert = extractedFromBundle || fs.existsSync(clientCertPath);

if (!isRealClientCert) {
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
}

// Configurações Finais de SSL (v47)
const sslConfig = { rejectUnauthorized: false };

if (fs.existsSync(caCertPath)) {
  sslConfig.ca = fs.readFileSync(caCertPath);
  console.log('[SSL] 🛡️  CA Root carregada.');
}

if (isRealClientCert && fs.existsSync(clientKeyPath)) {
  sslConfig.cert = fs.readFileSync(clientCertPath);
  sslConfig.key = fs.readFileSync(clientKeyPath);
  console.log('[mTLS] 🛡️  Identidade ATIVA (Cert + Key).');
} else {
  console.log('[SSL] ℹ️  Modo Simple (Apenas CA).');
}

// 🔥 FALLBACK DE BANCO (Se o principal falhar, o server.js tentará o fallback via env var)
const dbNameMatch = dbUrl ? dbUrl.match(/\/([^\/??]+)(?:\?|$)/) : null;
const currentDbName = dbNameMatch ? dbNameMatch[1] : null;

if (currentDbName && currentDbName !== 'postgres') {
  process.env.DATABASE_URL_FALLBACK = dbUrl.replace(`/${currentDbName}`, '/postgres');
  console.log(`💡 Fallback configurado para o banco 'postgres' caso '${currentDbName}' falhe.`);
}

// 🔥 [v86] Triple-Probe Master (Cloudflare Shield Mode)
async function probeAndStart() {
  console.log('🧪 [v86] Iniciando Cloudflare-Armor Probe...');

  const connectionString = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/['"]/g, "") : undefined;
  if (!connectionString) {
    console.error('🚨 ERRO: DATABASE_URL não definida.');
    process.exit(1);
  }

  // Prepara URL Limpa para o Probe
  const cleanUrlForProbe = (u) => u.split('?')[0];

  const candidates = [
    connectionString.replace(/\/([^\/?]+)(\?|$)/, '/squarecloud$2'), // Prioridade 1
    connectionString.replace(/\/([^\/?]+)(\?|$)/, '/admin$2'),       // Prioridade 2: Navicat mostrou admin
    connectionString.replace(/\/([^\/?]+)(\?|$)/, '/postgres$2'),    // Prioridade 3: Fallback
    connectionString                                                  // Original
  ];

  let finalUrl = connectionString;
  let success = false;

  for (const url of candidates) {
    const masked = url.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
    console.log(`📡 Testando candidato: ${masked}`);

    // Configuração TLS relaxada para o Probe
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

  // 🔥 Preparação de Certificados
  const absCert = path.join(__dirname, 'client.crt');
  const absKey = path.join(__dirname, 'client.key');
  const absCA = path.join(__dirname, 'ca.crt');

  try {
    if (fs.existsSync(clientCertPath)) fs.copyFileSync(clientCertPath, absCert);
    if (fs.existsSync(clientKeyPath)) fs.copyFileSync(clientKeyPath, absKey);
    if (fs.existsSync(caCertPath)) fs.copyFileSync(caCertPath, absCA);
    fs.chmodSync(absCert, 0o644);
    fs.chmodSync(absKey, 0o644);
    fs.chmodSync(absCA, 0o644);
    console.log('🔓 Chaves mTLS prontas.');
  } catch (e) {
    console.warn('⚠️ Erro certs:', e.message);
  }

  // URL para Aplicação (Full mTLS)
  const sslParams = `&sslmode=verify-ca&sslcert=${absCert}&sslkey=${absKey}&sslrootcert=${absCA}`;
  const cleanBaseUrl = finalUrl.split('?')[0];
  const finalAppUrl = `${cleanBaseUrl}?${sslParams.substring(1)}`;

  // Re-extração para variáveis separadas (Atomic Bridge)
  const urlParts = finalUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):([^/]+)\/(.+)/);
  const pgEnvs = urlParts ? {
    PGUSER: urlParts[1],
    PGPASSWORD: urlParts[2],
    PGHOST: urlParts[3],
    PGPORT: urlParts[4],
    PGDATABASE: urlParts[5].split('?')[0]
  } : {};

  console.log('📝 [V86] Ambiente Master Ativo (Cloudflare Armor + Shield Mode)...');
  try {
    // v86: Otimizado para Cloudflare + Square Cloud (Shield Active)
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'https://gestao-api.squareweb.app';
    fs.writeFileSync('.env', `DATABASE_URL="${finalAppUrl}"\nPGHOST="${pgEnvs.PGHOST}"\nPGPORT="${pgEnvs.PGPORT}"\nPGUSER="${pgEnvs.PGUSER}"\nPGPASSWORD="${pgEnvs.PGPASSWORD}"\nPGDATABASE="${pgEnvs.PGDATABASE}"\nPRISMA_CLIENT_ENGINE_TYPE="library"\nPRISMA_CLI_QUERY_ENGINE_TYPE="library"\nPRISMA_SCHEMA_DISABLE_ADVISORY_LOCK="1"\nPRISMA_SCHEMA_DISABLE_SEARCH_PATH_CHECK="1"\nPRISMA_SCHEMA_DISABLE_DATABASE_CREATION="1"\nAUTH_TRUST_HOST="1"\nNEXTAUTH_URL="${nextAuthUrl}"\nTRUST_PROXY="1"\n`);
  } catch (err) {
    console.warn('⚠️ Erro env v86:', err.message);
  }

  const commonEnv = {
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
    CERT_PATH_ROOT: __dirname,
    NODE_ENV: 'production'
  };

  const maskedFull = finalAppUrl.replace(/(:\/\/.*?:)(.*)(@.*)/, '$1****$3');
  console.log(`📡 [V86] DATABASE_URL (App): ${maskedFull}`);

  // 🔥 SINCRONIZAÇÃO DE SCHEMA
  const shouldSync = success && (process.env.RUN_SEEDS === 'true' || process.env.FORCE_DB_PUSH === 'true' || process.env.FORCE_SEED === 'true');

  if (shouldSync) {
    console.log(`🏗️ [SERVICE] Criando tabelas (v86 - Cloudflare Armor Mode)...`);

    try {
      console.log('⚒️  Gerando script SQL da estrutura...');
      const sqlStructure = execSync(`npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`, {
        env: commonEnv,
        encoding: 'utf8'
      });

      if (sqlStructure && sqlStructure.trim().length > 10) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
        const injectionPool = new Pool({
          connectionString: finalAppUrl,
          ssl: { rejectUnauthorized: false, ...sslConfig }
        });

        const client = await injectionPool.connect();
        try {
          await client.query(sqlStructure);
          console.log('✅ ESTRUTURA INJETADA VIA SQL COM SUCESSO!');
        } finally {
          client.release();
          await injectionPool.end();
        }
      }
    } catch (e) {
      console.warn(`⚠️ Falha na injeção: ${e.message}`);
    }
  }

  // 🔥 EXECUÇÃO DE SEEDS
  if (process.env.RUN_SEEDS === 'true' || process.env.FORCE_SEED === 'true') {
    console.log('🌱 [STARTUP] Populando banco...');
    try {
      execSync('npx yarn seed', { stdio: 'inherit', env: commonEnv });
      console.log('✅ Seeds finalizadas!');
    } catch (e) {
      console.warn('⚠️ Erro seeds.');
    }
  }

  // Inicialização
  const standaloneServer = path.join(__dirname, '.next', 'standalone', 'server.js');
  const rootStandalone = path.join(__dirname, 'server.js');

  const spawnOptions = {
    stdio: 'inherit',
    shell: true,
    env: { ...commonEnv, PORT: '80', HOSTNAME: '0.0.0.0' }
  };

  if (fs.existsSync(standaloneServer)) {
    console.log('🚀 [V86] Iniciando Servidor Standalone.');
    spawn('node', [standaloneServer], spawnOptions);
  } else if (fs.existsSync(rootStandalone)) {
    console.log('🚀 [V86] Iniciando Servidor Root.');
    spawn('node', [rootStandalone], spawnOptions);
  } else {
    console.log('🏃 [V86] Iniciando via yarn start.');
    spawn('npx', ['yarn', 'start'], spawnOptions);
  }
}

// Inicia o fluxo
probeAndStart().catch(err => {
  console.error('Erro no startup wrapper:', err);
  process.exit(1);
});
