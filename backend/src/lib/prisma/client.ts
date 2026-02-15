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
  console.log(`[Prisma/v86] 🚀 Inicializando v86. URL Base: ${maskedOriginal}`);

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
    max: 10
  };

  if (pgHost) poolConfig.host = pgHost;
  if (pgUser) poolConfig.user = pgUser;
  if (pgPassword) poolConfig.password = pgPassword;
  if (pgPort) poolConfig.port = parseInt(pgPort, 10);
  if (pgDatabase) poolConfig.database = pgDatabase;

  // TENTA PRIMEIRO COM ADAPTER
  try {
    console.log(`[Prisma/v86] 🔋 Tentando modo ADAPTER (pg pool)...`);
    const pool = new pg.Pool(poolConfig);
    const adapter = new PrismaPg(pool);

    return new PrismaClient({
      adapter,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.error(`⚠️ [Prisma/v86] Falha no Modo Adapter. Motivo: ${err.message}`);
    console.warn(`🔄 [Prisma/v86] Alternando para MODO NATIVO com injeção de banco: ${pgDatabase}`);

    // RECONSTRÓI A URL PARA MODO NATIVO (Garante que o banco esteja na URL)
    // Extrai os query params da URL original (sslmode, etc)
    const queryParams = url.includes('?') ? url.split('?')[1] : '';

    // Constrói URL: postgresql://user:pass@host:port/database?params
    let nativeUrl = url;
    if (pgUser && pgPassword && pgHost && pgDatabase) {
      nativeUrl = `postgresql://${pgUser}:${pgPassword}@${pgHost}:${pgPort}/${pgDatabase}`;
      if (queryParams) nativeUrl += `?${queryParams}`;
    } else if (!url.includes(`/${pgDatabase}`)) {
      // Se a URL original não tem o banco, tenta injetar
      const base = url.split('?')[0];
      nativeUrl = `${base}/${pgDatabase}${queryParams ? '?' + queryParams : ''}`;
    }

    try {
      const client = new PrismaClient({
        datasources: {
          db: { url: nativeUrl }
        },
        log: ["error"],
      } as any);
      return client as ExtendedPrismaClient;
    } catch (nativeErr: any) {
      console.error(`❌ [Prisma/v86] Falha CRÍTICA em ambos os modos:`, nativeErr.message);
      throw nativeErr;
    }
  }
};

const getPrisma = () => {
  if (!(globalThis as any).prismaInstance) {
    console.log('💎 [Prisma/v86] Criando Singleton...');
    try {
      const inst = createPrismaClient();
      (globalThis as any).prismaInstance = inst;
      console.log('✅ [Prisma/v86] Singleton Pronto.');
    } catch (e: any) {
      console.error('❌ [Prisma/v86] Falha na criação do Singleton:', e.message);
      return null;
    }
  }
  return (globalThis as any).prismaInstance;
};

export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;

    if (p === '$state') {
      const inst = (globalThis as any).prismaInstance;
      return { v: "86", init: !!inst, models: inst ? Object.keys(inst).filter(k => !k.startsWith('$')) : [] };
    }

    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      let instance = getPrisma();

      if (!instance || (Object.keys(instance).length === 0 && !p.startsWith('$'))) {
        console.warn(`🔄 [Prisma/v86] Instância inválida detectada para '${p}'. Forçando reinicialização...`);
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
      console.error(`❌ [Prisma/v86] Erro no Proxy (${p}):`, err.message);
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
