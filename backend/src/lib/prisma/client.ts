import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// Estender o tipo do PrismaClient para incluir os novos modelos se o gerador falhar no reconhecimento
export type ExtendedPrismaClient = PrismaClient & {
  governanceAuditHistory: any;
  routeHealthHistory: any;
  projectPermissionDelegation: any;
  permissionMatrix: any;
  permissionLevel: any;
  permissionModule: any;
  taskQueue: any;
};

declare global {
  var prisma: ExtendedPrismaClient | undefined;
}

const createPrismaClient = () => {
  if (process.env.PRISMA_IGNORE_CONNECTION === 'true') {
    return new Proxy({}, {
      get: () => {
        return new Proxy(() => { }, {
          get: () => () => Promise.resolve([]),
          apply: () => new Proxy({}, { get: () => () => Promise.resolve([]) })
        });
      }
    }) as any;
  }

  const connectionString = process.env.DATABASE_URL?.replace(/['"]/g, "");
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL não definida. Retornando cliente vazio.");
    return {} as any;
  }

  return buildPrismaWithFallback(connectionString);
};

const buildPrismaWithFallback = (url: string) => {
  const maskedOriginal = url.split('@')[1] || 'oculta';
  console.log(`[Prisma/v84] 🚀 Inicializando v84. URL: ${maskedOriginal}`);

  // Diagnóstico de dependências
  console.log(`📦 [Prisma/v84] Deps Status: Client=${typeof PrismaClient}, PgAdapter=${typeof PrismaPg}, Pg=${typeof pg}`);

  const sslConfig = getSSLConfig(url);

  const poolConfig: any = {
    connectionString: url,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10
  };

  const getEnv = (key: string) => {
    const val = process.env[key];
    return (val && val !== 'undefined' && val !== 'null') ? val : null;
  };

  // Aplica overrides de env vars se existirem
  if (getEnv('PGHOST')) poolConfig.host = getEnv('PGHOST');
  if (getEnv('PGUSER')) poolConfig.user = getEnv('PGUSER');
  if (getEnv('PGPASSWORD')) poolConfig.password = getEnv('PGPASSWORD');
  if (getEnv('PGPORT')) poolConfig.port = parseInt(getEnv('PGPORT')!, 10);
  if (getEnv('PGDATABASE')) poolConfig.database = getEnv('PGDATABASE');

  console.log(`[Prisma/v84] 🔋 Pool configurado (Host: ${poolConfig.host || 'url-base'}).`);

  try {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({
      adapter,
      log: ["error"],
    } as any) as ExtendedPrismaClient;

    return client;
  } catch (err: any) {
    console.error(`❌ [Prisma/v84] Erro FATAL no construtor:`, err.stack || err.message);
    throw err;
  }
};

const getPrisma = () => {
  if (!(globalThis as any).prismaInstance) {
    console.log('💎 [Prisma/v84] Criando Singleton...');
    try {
      const inst = createPrismaClient();
      (globalThis as any).prismaInstance = inst;
      console.log('✅ [Prisma/v84] Singleton Pronto.');
    } catch (e: any) {
      console.error('❌ [Prisma/v84] Falha na criação do Singleton:', e.message);
      return null;
    }
  }
  return (globalThis as any).prismaInstance;
};

// Singleton Proxy Defensivo v84
export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;

    if (p === '$state') {
      const inst = (globalThis as any).prismaInstance;
      return { v: "84", init: !!inst, models: inst ? Object.keys(inst).filter(k => !k.startsWith('$')) : [] };
    }

    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      let instance = getPrisma();

      // Auto-Healing: Se a instância existe mas o modelo não está acessível (bind error avoidance)
      if (instance && !p.startsWith('$') && !instance[p]) {
        console.warn(`🔄 [Prisma/v84] Modelo '${p}' indisponível. Resetando instância...`);
        (globalThis as any).prismaInstance = createPrismaClient();
        instance = (globalThis as any).prismaInstance;
      }

      if (!instance) return undefined;

      const value = (instance as any)[p];

      if (typeof value === 'function') {
        return (...args: any[]) => {
          try {
            return value.apply(instance, args);
          } catch (err: any) {
            console.error(`❌ [Prisma/v84] Erro ao executar ${p}:`, err.message);
            throw err;
          }
        };
      }

      return value;
    } catch (err: any) {
      console.error(`❌ [Prisma/v84] Exceção no Proxy ao acessar '${p}':`, err.message);
      return undefined;
    }
  }
}) as ExtendedPrismaClient;

export default prisma;

const getSSLConfig = (connectionString: string) => {
  let sslConfig: any = false;

  if (connectionString.includes('sslmode=require') ||
    connectionString.includes('sslmode=verify-full') ||
    connectionString.includes('sslmode=verify-ca')) {

    sslConfig = { rejectUnauthorized: false };

    const certsRoot = process.env.CERT_PATH_ROOT || '/application/backend';
    console.log(`🔍 [Prisma/v84] Lendo mTLS de: ${certsRoot}`);

    const paths = {
      ca: [path.join(certsRoot, 'ca.crt'), process.env.PGSSLROOTCERT, '/application/ca.crt'],
      cert: [path.join(certsRoot, 'client.crt'), process.env.PGSSLCERT, '/application/client.crt'],
      key: [path.join(certsRoot, 'client.key'), process.env.PGSSLKEY, '/application/client.key']
    };

    const findFirst = (list: (string | undefined)[], label: string) => {
      const found = list.find(p => p && fs.existsSync(p));
      if (found) console.log(`📍 [Prisma/v84] ${label} OK: ${found}`);
      return found;
    };

    const caPath = findFirst(paths.ca, 'CA');
    const certPath = findFirst(paths.cert, 'Cert');
    const keyPath = findFirst(paths.key, 'Key');

    if (caPath) sslConfig.ca = fs.readFileSync(caPath, 'utf8');
    if (certPath && keyPath) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      console.log('🛡️ [Prisma/v84] mTLS Completo.');
    }
  }
  return sslConfig;
}

export async function checkDatabaseConnection() {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { connected: true, latency: Date.now() - startTime };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}
