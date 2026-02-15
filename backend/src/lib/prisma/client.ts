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
 * v94: Pure-Handmade Adapter Bridge (Deep Serialization)
 * Correção do erro 'expected a string, found {}' em campos de Data/JSON.
 * Traduz Date para ISOString e Objetos para JSON String.
 */
class OrionPgAdapter {
  readonly provider = 'postgres';
  readonly adapterName = 'orion-pg-adapter-v94';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v94] Bridge Handmade Inicializada.`);
  }

  /**
   * Mapeamento preciso para Prisma 6 (Engine Quaint)
   */
  private mapColumnType(oid: number): number {
    switch (oid) {
      case 16: return 4; // Boolean
      case 21: return 0; // Int32
      case 23: return 0; // Int32
      case 20: return 1; // Int64
      case 700: return 2; // Float
      case 701: return 3; // Double
      case 1700: return 2; // Numeric
      case 1082: return 6; // Date (Tratado como string ISO)
      case 1114:
      case 1184: return 6; // DateTime (Tratado como string ISO para evitar found {})
      case 114:
      case 3802: return 11; // Json
      case 2950: return 6; // UUID -> Text
      case 18:
      case 25:
      case 1043: return 6; // Text
      default: return 6; // Default Text
    }
  }

  /**
   * Serializador de Valor: Converte tipos complexos do PG para primitivos que o Prisma entende.
   */
  private serializeValue(val: any): any {
    if (val === null || val === undefined) return null;
    if (val instanceof Date) return val.toISOString();

    // Se for um objeto (como JSONB) mas não for um array primitivo, o Prisma pode se confundir
    if (typeof val === 'object' && !Array.isArray(val)) {
      // Se o Prisma espera um valor e recebe um objeto, ele pode falhar se não souber serializar
      // Para campos JSON, o Prisma geralmente lida com o objeto, mas se deu "found {}", 
      // quer dizer que a engine Quaint precisa de algo mais simples no bridge.
      return val;
    }

    // Conversão de BigInt para string/number conforme necessário
    if (typeof val === 'bigint') return val.toString();

    return val;
  }

  async queryRaw(params: { sql: string; args: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.args);

      const rows = res.rows.map(row =>
        res.fields.map(field => {
          const rawValue = (row as any)[field.name];
          return this.serializeValue(rawValue);
        })
      );

      return {
        ok: true,
        value: {
          columnNames: res.fields.map(f => f.name),
          columnTypes: res.fields.map(f => this.mapColumnType(f.dataTypeID)),
          rows: rows
        }
      };
    } catch (err: any) {
      console.error(`❌ [Adapter/v94] Query Error (${params.sql.substring(0, 50)}...):`, err.message);
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
      console.error(`❌ [Adapter/v94] Execute Error:`, err.message);
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
          const rows = r.rows.map(row => r.fields.map(f => this.serializeValue((row as any)[f.name])));
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
  console.log(`[Prisma/v94] 🚀 Inicializando v94. Target: ${maskedOriginal.split('?')[0]}`);

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
    max: 15
  };

  if (getEnv('PGHOST')) poolConfig.host = getEnv('PGHOST');
  if (getEnv('PGUSER')) poolConfig.user = getEnv('PGUSER');
  if (getEnv('PGPASSWORD')) poolConfig.password = getEnv('PGPASSWORD');
  if (getEnv('PGPORT')) poolConfig.port = parseInt(getEnv('PGPORT')!, 10);
  if (getEnv('PGDATABASE')) poolConfig.database = getEnv('PGDATABASE');

  try {
    const pool = new pg.Pool(poolConfig);
    const adapter = new OrionPgAdapter(pool);

    console.log(`[Prisma/v94] 🔋 Ativando Modo ADAPTER HANDMADE (mTLS Serialized).`);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v94] Falha Crítica. Ativando Modo Nativo...`);
    return new PrismaClient({
      datasources: { db: { url: url } },
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
      return { v: "94", init: !!inst, type: 'handmade' };
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
      console.error(`❌ [Prisma/v94] Proxy Error '${p}':`, err.message);
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
    const findPath = (f: string) => [path.join(certsRoot, f), path.join('/application', f)].find(p => fs.existsSync(p));

    const ca = findPath('ca.crt');
    if (ca) sslConfig.ca = fs.readFileSync(ca, 'utf8');

    const cert = findPath('client.crt');
    const key = findPath('client.key');
    if (cert && key) {
      sslConfig.cert = fs.readFileSync(cert, 'utf8');
      sslConfig.key = fs.readFileSync(key, 'utf8');
      console.log('🛡️ [Prisma/v94] mTLS v94 Ativo.');
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
