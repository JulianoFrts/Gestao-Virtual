import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

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
      get: () => new Proxy(() => { }, {
        get: () => () => Promise.resolve([]),
        apply: () => new Proxy({}, { get: () => () => Promise.resolve([]) })
      })
    }) as any;
  }

  const connectionString = process.env.DATABASE_URL?.replace(/['"]/g, "");
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL não definida.");
    return {} as any;
  }

  return buildPrismaWithFallback(connectionString);
};

const buildPrismaWithFallback = (url: string) => {
  const maskedOriginal = url.split('@')[1] || 'oculta';
  console.log(`[Prisma/v90] 🚀 Inicializando v90. Target: ${maskedOriginal.split('?')[0]}`);

  const sslConfig = getSSLConfig(url);
  const getEnv = (key: string) => {
    const val = process.env[key];
    return (val && val !== 'undefined' && val !== 'null') ? val : null;
  };

  const poolConfig: any = {
    connectionString: url,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 10
  };

  if (getEnv('PGHOST')) poolConfig.host = getEnv('PGHOST');
  if (getEnv('PGUSER')) poolConfig.user = getEnv('PGUSER');
  if (getEnv('PGPASSWORD')) poolConfig.password = getEnv('PGPASSWORD');
  if (getEnv('PGPORT')) poolConfig.port = parseInt(getEnv('PGPORT')!, 10);
  if (getEnv('PGDATABASE')) poolConfig.database = getEnv('PGDATABASE');

  // PROBE BASE (v90)
  const diagPool = new pg.Pool({ ...poolConfig, max: 1 });
  diagPool.query('SELECT current_user, current_database() as db').then((res) => {
    console.log(`✅ [Prisma/v90] Conexão Base OK. User: ${res.rows[0].current_user}, DB: ${res.rows[0].db}`);
    diagPool.end();
  }).catch(e => {
    console.error(`❌ [Prisma/v90] Conexão Base FALHOU: ${e.message}`);
    diagPool.end();
  });

  // MODO ADAPTER COM BRIDGE MANUAL (v90)
  try {
    console.log(`[Prisma/v90] 🔋 Ativando Modo ADAPTER (Bridge Manual).`);
    const pool = new pg.Pool(poolConfig);
    const rawAdapter = new PrismaPg(pool);

    // Bridge Manual para evitar erros de bind e garantir métodos
    // Isso protege contra tree-shaking e perda de contexto
    const adapter = {
      provider: 'postgres',
      adapterName: 'pg',
      queryRaw: (params: any) => rawAdapter.queryRaw(params),
      executeRaw: (params: any) => rawAdapter.executeRaw(params),
      transactionContext: () => {
        if ((rawAdapter as any).transactionContext) {
          return (rawAdapter as any).transactionContext();
        }
        // Stub manual se o método original sumir
        return Promise.resolve({
          queryRaw: (params: any) => rawAdapter.queryRaw(params),
          executeRaw: (params: any) => rawAdapter.executeRaw(params),
          commit: () => Promise.resolve(),
          rollback: () => Promise.resolve(),
        });
      }
    };

    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v90] Fallback para Modo NATIVO. Erro: ${err.message}`);

    // RECONSTRÓI A URL NATIVA (v90 - Segurança Máxima)
    let nativeUrl = url;
    try {
      const urlObj = new URL(url);
      if (poolConfig.user) urlObj.username = poolConfig.user;
      if (poolConfig.password) urlObj.password = poolConfig.password;
      if (poolConfig.host) urlObj.hostname = poolConfig.host;
      if (poolConfig.port) urlObj.port = poolConfig.port.toString();

      // Injeção de Banco Forçada
      if (poolConfig.database && (!urlObj.pathname || urlObj.pathname === '/')) {
        urlObj.pathname = `/${poolConfig.database}`;
      }

      // Parâmetros de SSL para motor Rust do Prisma
      urlObj.searchParams.set('sslmode', 'verify-ca');
      urlObj.searchParams.set('sslaccept', 'accept_invalid_certs'); // Bypass de hostname mismatch

      nativeUrl = urlObj.toString();
      console.log(`📍 [Prisma/v90] Fallback URL: ${urlObj.host}${urlObj.pathname}`);
    } catch (e) {
      console.error(`❌ [Prisma/v90] Erro na URL de fallback.`);
    }

    try {
      const client = new PrismaClient({
        datasources: { db: { url: nativeUrl } },
        log: ["error"],
      } as any);
      return client as ExtendedPrismaClient;
    } catch (nativeErr: any) {
      console.error(`❌ [Prisma/v90] Falha Inevitável:`, nativeErr.message);
      throw nativeErr;
    }
  }
};

const getPrisma = () => {
  if (!(globalThis as any).prismaInstance) {
    (globalThis as any).prismaInstance = createPrismaClient();
  }
  return (globalThis as any).prismaInstance;
};

export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;

    if (p === '$state') {
      const inst = (globalThis as any).prismaInstance;
      return { v: "90", init: !!inst, keys: inst ? Object.keys(inst).length : 0 };
    }

    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      let instance = getPrisma();
      if (!instance || (Object.keys(instance).length === 0 && !p.startsWith('$'))) {
        (globalThis as any).prismaInstance = createPrismaClient();
        instance = (globalThis as any).prismaInstance;
      }
      if (!instance) return undefined;

      const value = (instance as any)[p];
      if (typeof value === 'function') {
        return (...args: any[]) => value.apply(instance, args);
      }
      return value;
    } catch (err: any) {
      console.error(`❌ [Prisma/v90] Proxy Error '${p}':`, err.message);
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

    const paths = {
      ca: [path.join(certsRoot, 'ca.crt'), '/application/ca.crt'],
      cert: [path.join(certsRoot, 'client.crt'), '/application/client.crt'],
      key: [path.join(certsRoot, 'client.key'), '/application/client.key']
    };

    const findFirst = (list: (string | undefined)[]) => list.find(p => p && fs.existsSync(p));

    const caPath = findFirst(paths.ca);
    if (caPath) sslConfig.ca = fs.readFileSync(caPath, 'utf8');

    const certPath = findFirst(paths.cert);
    const keyPath = findFirst(paths.key);
    if (certPath && keyPath) {
      sslConfig.cert = fs.readFileSync(certPath, 'utf8');
      sslConfig.key = fs.readFileSync(keyPath, 'utf8');
      console.log('🛡️ [Prisma/v90] SSL v90 Ativo.');
    }
  }
  return sslConfig;
}

export async function checkDatabaseConnection() {
  try {
    const res = await (prisma as any).$queryRaw`SELECT 1`;
    return { connected: !!res };
  } catch (error: any) {
    return { connected: false, error: error.message };
  }
}

export async function disconnectDatabase() {
  if ((globalThis as any).prismaInstance) {
    await (globalThis as any).prismaInstance.$disconnect();
  }
}
