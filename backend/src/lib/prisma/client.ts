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
 * v93: Pure-Handmade Adapter Bridge (Final Precision)
 * Correção do mapeamento de ColumnTypes para o motor Quaint do Prisma 6.
 * O erro 'Inconsistent column data' no v92 provou que a conexão está OK.
 */
class OrionPgAdapter {
  readonly provider = 'postgres';
  readonly adapterName = 'orion-pg-adapter-v93';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v93] Bridge Handmade Inicializada.`);
  }

  /**
   * Mapeamento preciso para Prisma 6 (Engine Quaint)
   * 0: Int32, 1: Int64, 2: Float, 3: Double, 4: Boolean, 5: Char, 6: Text, ...
   * Nota: O erro 'must be an i32' no v92 (que retornava 0) indica que 0 é interpretado como i32.
   * Portanto, precisamos retornar o ID correto para TEXT/UUID.
   */
  private mapColumnType(oid: number): number {
    switch (oid) {
      case 16: return 4; // Boolean
      case 21: return 0; // Int32 (int2)
      case 23: return 0; // Int32 (int4)
      case 20: return 1; // Int64 (int8)
      case 700: return 2; // Float
      case 701: return 3; // Double
      case 1700: return 2; // Numeric (mapeado para float por segurança)
      case 1082: return 9; // Date
      case 1114:
      case 1184: return 8; // DateTime / Timestamp
      case 114:
      case 3802: return 11; // Json
      case 2950: return 6; // UUID -> Text
      case 18:
      case 25:
      case 1043: return 6; // Char/Text/Varchar -> Text
      default: return 6; // Default to Text para evitar erros de cast numérico
    }
  }

  async queryRaw(params: { sql: string; args: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.args);

      // Converte objetos de linha em arrays puros de valores para o Prisma
      const rows = res.rows.map(row => res.fields.map(field => (row as any)[field.name]));

      return {
        ok: true,
        value: {
          columnNames: res.fields.map(f => f.name),
          columnTypes: res.fields.map(f => this.mapColumnType(f.dataTypeID)),
          rows: rows
        }
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v93] Query Error (${params.sql.substring(0, 50)}...):`, err.message);
      return { ok: false, error: err };
    }
  }

  async executeRaw(params: { sql: string; args: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.args);
      return {
        ok: true,
        value: res.rowCount || 0
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v93] Execute Error:`, err.message);
      return { ok: false, error: err };
    }
  }

  async transactionContext() {
    const client = await this.pool.connect();
    return {
      ok: true,
      value: {
        queryRaw: async (p: any) => {
          const r = await client.query(p.sql, p.args);
          const rows = r.rows.map(row => r.fields.map(f => (row as any)[f.name]));
          return {
            ok: true,
            value: {
              columnNames: r.fields.map(f => f.name),
              columnTypes: r.fields.map(f => this.mapColumnType(f.dataTypeID)),
              rows: rows
            }
          };
        },
        executeRaw: async (p: any) => {
          const r = await client.query(p.sql, p.args);
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
  console.log(`[Prisma/v93] 🚀 Inicializando v93. Target: ${maskedOriginal.split('?')[0]}`);

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
    max: 15 // Aumentado para suportar picos
  };

  if (getEnv('PGHOST')) poolConfig.host = getEnv('PGHOST');
  if (getEnv('PGUSER')) poolConfig.user = getEnv('PGUSER');
  if (getEnv('PGPASSWORD')) poolConfig.password = getEnv('PGPASSWORD');
  if (getEnv('PGPORT')) poolConfig.port = parseInt(getEnv('PGPORT')!, 10);
  if (getEnv('PGDATABASE')) poolConfig.database = getEnv('PGDATABASE');

  try {
    const pool = new pg.Pool(poolConfig);
    const adapter = new OrionPgAdapter(pool);

    console.log(`[Prisma/v93] 🔋 Ativando Modo ADAPTER HANDMADE (mTLS).`);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v93] Falha Crítica de Inicialização. Ativando Modo Nativo...`);

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
    const url = (process.env.DATABASE_URL || '').replace(/['"]/g, "");
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
      return { v: "93", init: !!inst, status: inst ? 'online' : 'uninitialized' };
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
      console.error(`❌ [Prisma/v93] Erro de Proxy em '${p}':`, err.message);
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
      console.log('🛡️ [Prisma/v93] mTLS v93 Ativo.');
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
