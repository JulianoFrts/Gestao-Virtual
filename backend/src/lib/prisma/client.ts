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
  console.log(`[Prisma/v89] 🚀 Inicializando v89. Target: ${maskedOriginal.split('?')[0]}`);

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

  // DIAGNÓSTICO PG (v89)
  const diagPool = new pg.Pool({ ...poolConfig, max: 1 });
  diagPool.query('SELECT 1').then(() => {
    console.log(`✅ [Prisma/v89] Conexão Base (pg) OK.`);
    diagPool.end();
  }).catch(e => {
    console.error(`❌ [Prisma/v89] Conexão Base (pg) FALHOU: ${e.message}`);
    diagPool.end();
  });

  // TENTA MODO ADAPTER COM PROXY DE BINDING (v89)
  try {
    const pool = new pg.Pool(poolConfig);
    const rawAdapter = new PrismaPg(pool);

    // CORREÇÃO CRÍTICA v89: Proxy para resolver o erro "Cannot read properties of undefined (reading 'bind')"
    // Se o Prisma 6 tenta fazer .bind() em métodos que ele espera mas não encontra, nós os interceptamos aqui.
    const adapter = new Proxy(rawAdapter, {
      get: (target, prop) => {
        const name = prop.toString();
        const val = (target as any)[prop];

        // Log de acesso a propriedades críticas para debug
        if (['query', 'execute', 'transactionContext', 'startTransaction'].includes(name)) {
          if (val === undefined) {
            console.warn(`⚠️ [Prisma/v89] Prisma acessou '${name}' que é undefined no adapter!`);
          }
        }

        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    });

    console.log(`[Prisma/v89] 🔋 Ativando Modo ADAPTER.`);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v89] Falha no Modo Adapter. Erro: ${err.message}. Alternando para NATIVO...`);

    // RECONSTRÓI A URL NATIVA (v89 - Preservando Query Params Originais)
    let nativeUrl = url;
    try {
      const urlObj = new URL(url);
      if (poolConfig.user) urlObj.username = poolConfig.user;
      if (poolConfig.password) urlObj.password = poolConfig.password;
      if (poolConfig.host) urlObj.hostname = poolConfig.host;
      if (poolConfig.port) urlObj.port = poolConfig.port.toString();

      // Se PGDATABASE existe e não está na URL, injeta
      if (getEnv('PGDATABASE') && (!urlObj.pathname || urlObj.pathname === '/')) {
        urlObj.pathname = `/${getEnv('PGDATABASE')}`;
      }

      nativeUrl = urlObj.toString();
      console.log(`📍 [Prisma/v89] Fallback URL Nativa: ${urlObj.hostname}${urlObj.pathname}`);
    } catch (e) {
      console.error(`❌ [Prisma/v89] Falha ao processar URL para fallback nativo.`);
    }

    try {
      const client = new PrismaClient({
        datasources: { db: { url: nativeUrl } },
        log: ["error"],
      } as any);
      return client as ExtendedPrismaClient;
    } catch (nativeErr: any) {
      console.error(`❌ [Prisma/v89] Erro Fatal Inevitável:`, nativeErr.message);
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
      return { v: "89", init: !!inst, keys: inst ? Object.keys(inst).length : 0 };
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
      console.error(`❌ [Prisma/v89] Erro de Proxy em '${p}':`, err.message);
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
      console.log('🛡️ [Prisma/v89] mTLS Configurado.');
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
