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
  console.log(`[Prisma/v88] 🚀 Inicializando v88. Host: ${maskedOriginal.split('?')[0]}`);

  const sslConfig = getSSLConfig(url);
  const getEnv = (key: string) => {
    const val = process.env[key];
    return (val && val !== 'undefined' && val !== 'null') ? val : null;
  };

  const pgHost = getEnv('PGHOST');
  const pgUser = getEnv('PGUSER');
  const pgPassword = getEnv('PGPASSWORD');
  const pgPort = getEnv('PGPORT') || '5432';
  const pgDatabase = getEnv('PGDATABASE') || 'squarecloud';

  const poolConfig: any = {
    connectionString: url,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 5
  };

  if (pgHost) poolConfig.host = pgHost;
  if (pgUser) poolConfig.user = pgUser;
  if (pgPassword) poolConfig.password = pgPassword;
  if (pgPort) poolConfig.port = parseInt(pgPort, 10);
  if (pgDatabase) poolConfig.database = pgDatabase;

  // DIAGNÓSTICO DIRETO (v88): Testar se o PG puro conecta
  const testPool = new pg.Pool({ ...poolConfig, max: 1 });
  testPool.query('SELECT current_user, current_database(), current_schema()')
    .then(res => {
      const row = res.rows[0];
      console.log(`✅ [Prisma/v88] PG Nativo Conectado! User: ${row.current_user}, DB: ${row.current_database}, Schema: ${row.current_schema}`);
      testPool.end();
    })
    .catch(err => {
      console.error(`❌ [Prisma/v88] Falha de conexão PG Nativo: ${err.message}`);
      testPool.end();
    });

  // TENTA MODO ADAPTER (Se não houver erro de bind)
  try {
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);

    // Sanity check para evitar bind error silencioso
    if (!adapter || typeof (adapter as any).query !== 'function') {
      throw new Error("Adapter bind check failed");
    }

    console.log(`[Prisma/v88] 🔋 Usando Modo ADAPTER.`);
    return new PrismaClient({
      adapter: adapter,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v88] Modo Adapter Indisponível (Binding). Alternando para NATIVO...`);

    // RECONSTRÓI A URL NATIVA (v88 - Fiel ao Probe)
    let nativeUrl = url;
    try {
      const urlObj = new URL(url);
      if (pgUser) urlObj.username = pgUser;
      if (pgPassword) urlObj.password = pgPassword;
      if (pgHost) urlObj.hostname = pgHost;
      if (pgPort) urlObj.port = pgPort;

      // Se a URL não tem o banco, e temos PGDATABASE definido
      if ((!urlObj.pathname || urlObj.pathname === '/') && pgDatabase) {
        urlObj.pathname = `/${pgDatabase}`;
      }

      nativeUrl = urlObj.toString();
      console.log(`📍 [Prisma/v88] Fallback URL Nativa: ${urlObj.hostname}/${urlObj.pathname.replace('/', '')}`);
    } catch (e) {
      console.error(`❌ [Prisma/v88] Erro ao processar URL para fallback.`);
    }

    try {
      const client = new PrismaClient({
        datasources: { db: { url: nativeUrl } },
        log: ["error"],
      } as any);
      return client as ExtendedPrismaClient;
    } catch (nativeErr: any) {
      console.error(`❌ [Prisma/v88] Falha crítica final:`, nativeErr.message);
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
      return { v: "88", init: !!inst, models: inst ? Object.keys(inst).filter(k => !k.startsWith('$')) : [] };
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
      console.error(`❌ [Prisma/v88] Erro Proxy (${p}):`, err.message);
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
