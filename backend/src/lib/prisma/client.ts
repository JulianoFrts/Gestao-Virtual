import { PrismaClient } from "@prisma/client";
import pg from "pg";
import fs from "fs";
import path from "path";

// Tipagem estendida para modelos não detectados
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

/**
 * v91: Pure-Handmade Adapter Bridge
 * Desenvolvido para bypassar falhas de binding do @prisma/adapter-pg em ambientes restritos.
 */
class OrionPgAdapter {
  readonly provider = 'postgres';
  readonly adapterName = 'orion-pg-adapter-v91';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v91] Bridge Handmade Inicializada.`);
  }

  async queryRaw(params: { sql: string; values: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.values);
      // Prisma espera ResultSet: { columnNames, columnTypes, rows }
      return {
        ok: true,
        value: {
          columnNames: res.fields.map(f => f.name),
          columnTypes: res.fields.map(f => f.dataTypeID),
          rows: res.rows
        }
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v91] Erro em QueryRaw:`, err.message);
      return { ok: false, error: err };
    }
  }

  async executeRaw(params: { sql: string; values: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.values);
      return {
        ok: true,
        value: res.rowCount || 0
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v91] Erro em ExecuteRaw:`, err.message);
      return { ok: false, error: err };
    }
  }

  async transactionContext() {
    // Suporte básico a contexto de transação para evitar erros de bind
    const client = await this.pool.connect();
    return {
      ok: true,
      value: {
        queryRaw: async (p: any) => {
          const r = await client.query(p.sql, p.values);
          return { ok: true, value: { columnNames: r.fields.map(f => f.name), columnTypes: r.fields.map(f => f.dataTypeID), rows: r.rows } };
        },
        executeRaw: async (p: any) => {
          const r = await client.query(p.sql, p.values);
          return { ok: true, value: r.rowCount || 0 };
        },
        commit: async () => { await client.query('COMMIT'); client.release(); },
        rollback: async () => { await client.query('ROLLBACK'); client.release(); }
      }
    };
  }
}

const buildPrismaWithFallback = (url: string) => {
  const maskedOriginal = url.split('@')[1] || 'oculta';
  console.log(`[Prisma/v91] 🚀 Inicializando v91. Target: ${maskedOriginal.split('?')[0]}`);

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

  // MODO ADAPTER HANDMADE (v91 - Máxima Estabilidade)
  try {
    const pool = new pg.Pool(poolConfig);
    const adapter = new OrionPgAdapter(pool);

    console.log(`[Prisma/v91] 🔋 Ativando Modo ADAPTER HANDMADE.`);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v91] Erro no Modo Adapter: ${err.message}. Ativando Fallback...`);

    let nativeUrl = url;
    try {
      const urlObj = new URL(url);
      if (poolConfig.user) urlObj.username = poolConfig.user;
      if (poolConfig.password) urlObj.password = poolConfig.password;
      if (poolConfig.host) urlObj.hostname = poolConfig.host;
      if (poolConfig.port) urlObj.port = poolConfig.port.toString();
      if (poolConfig.database && (!urlObj.pathname || urlObj.pathname === '/')) {
        urlObj.pathname = `/${poolConfig.database}`;
      }
      urlObj.searchParams.set('sslmode', 'verify-full');
      urlObj.searchParams.set('sslaccept', 'accept_invalid_certs');
      nativeUrl = urlObj.toString();
    } catch (e) { }

    return new PrismaClient({
      datasources: { db: { url: nativeUrl } },
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  }
};

const getPrisma = () => {
  if (!(globalThis as any).prismaInstance) {
    const url = process.env.DATABASE_URL?.replace(/['"]/g, "");
    if (!url) return {} as any;
    (globalThis as any).prismaInstance = buildPrismaWithFallback(url);
  }
  return (globalThis as any).prismaInstance;
};

export const prisma = new Proxy({} as any, {
  get: (target, prop) => {
    if (typeof prop === 'symbol') return (target as any)[prop];
    const p = prop as string;

    if (p === '$state') {
      const inst = (globalThis as any).prismaInstance;
      return { v: "91", init: !!inst, type: 'handmade' };
    }

    if (['$$typeof', 'constructor', 'toJSON', 'then', 'inspect'].includes(p)) return undefined;

    try {
      let instance = getPrisma();
      if (!instance || (Object.keys(instance).length === 0 && !p.startsWith('$'))) {
        (globalThis as any).prismaInstance = undefined;
        instance = getPrisma();
      }
      if (!instance) return undefined;

      const value = (instance as any)[p];
      if (typeof value === 'function') {
        return (...args: any[]) => value.apply(instance, args);
      }
      return value;
    } catch (err: any) {
      console.error(`❌ [Prisma/v91] Proxy Error '${p}':`, err.message);
      return undefined;
    }
  }
}) as ExtendedPrismaClient;

export default prisma;

const getSSLConfig = (connectionString: string) => {
  let sslConfig: any = false;
  if (connectionString.includes('sslmode')) {
    sslConfig = { rejectUnauthorized: false };
    const certsRoot = '/application/backend';
    const paths = {
      ca: [path.join(certsRoot, 'ca.crt'), '/application/ca.crt'],
      cert: [path.join(certsRoot, 'client.crt'), '/application/client.crt'],
      key: [path.join(certsRoot, 'client.key'), '/application/client.key']
    };
    const findFirst = (list: string[]) => list.find(p => fs.existsSync(p));
    const ca = findFirst(paths.ca);
    if (ca) sslConfig.ca = fs.readFileSync(ca, 'utf8');
    const cert = findFirst(paths.cert);
    const key = findFirst(paths.key);
    if (cert && key) {
      sslConfig.cert = fs.readFileSync(cert, 'utf8');
      sslConfig.key = fs.readFileSync(key, 'utf8');
      console.log('🛡️ [Prisma/v91] mTLS v91 OK.');
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
