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
 * v95: Pure-Handmade Adapter Bridge (Final Type Map)
 * Correção do mapeamento de Booleanos (ID 5) e Numerics/BigInts. 
 * Resolvendo "expected a string-encoded number ... found false".
 */
class OrionPgAdapter {
  readonly provider = 'postgres';
  readonly adapterName = 'orion-pg-adapter-v95';

  constructor(private pool: pg.Pool) {
    console.log(`[Adapter/v95] Bridge Handmade Inicializada.`);
  }

  /**
   * Mapeamento de Tipos para o Motor Quaint (Prisma 6)
   * ID 0: Int32
   * ID 1: Int64 (BigInt)
   * ID 2: Float
   * ID 3: Double
   * ID 4: Numeric (Decimal) -> Espera String-encoded
   * ID 5: Boolean
   * ID 6: Char/Text
   * ID 10: DateTime
   * ID 11: Json
   */
  private mapColumnType(oid: number): number {
    switch (oid) {
      case 16: return 5; // Boolean (OID 16) -> ID 5
      case 21:
      case 23: return 0; // Int32 (int2, int4) -> ID 0
      case 20: return 1; // Int64 (int8) -> ID 1
      case 700: return 2; // Float4 -> ID 2
      case 701: return 3; // Float8 -> ID 3
      case 1700: return 4; // Numeric -> ID 4 (String-encoded)
      case 1082: return 6; // Date -> ID 6 (Text-fallback)
      case 1114:
      case 1184: return 6; // DateTime -> ID 6 (Text-fallback para evitar found {})
      case 114:
      case 3802: return 11; // Json/JsonB -> ID 11
      case 2950: return 6; // UUID -> ID 6 (Text)
      default: return 6; // Default a Text
    }
  }

  /**
   * Serializador para garantir que o Prisma receba o formato exato.
   */
  private serializeValue(val: any, oid: number): any {
    if (val === null || val === undefined) return null;

    // Numerics/BigInts devem ser Strings para o Prisma quando o Adapter é usado
    if (oid === 20 || oid === 1700) return val.toString();

    // Datas devem ser ISOStrings para o Prisma 6 via Adapter manual
    if (val instanceof Date) return val.toISOString();

    // Booleans devem ser literais true/false (mas o log indicou que o tipo 4 é numérico, então mantemos true/false se o tipo for 5)
    if (oid === 16) return !!val;

    // JSON deve ser stringificado se for o tipo 11 ou fallback 6
    if (oid === 114 || oid === 3802) {
      return typeof val === 'string' ? val : JSON.stringify(val);
    }

    return val;
  }

  async queryRaw(params: { sql: string; args: any[] }) {
    try {
      const res = await this.pool.query(params.sql, params.args);

      const rows = res.rows.map(row =>
        res.fields.map(field => {
          const rawValue = (row as any)[field.name];
          return this.serializeValue(rawValue, field.dataTypeID);
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
      console.error(`❌ [Adapter/v95] Query Error:`, err.message);
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
      console.error(`❌ [Adapter/v95] Execute Error:`, err.message);
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
          const rows = r.rows.map(row => r.fields.map(f => this.serializeValue((row as any)[f.name], f.dataTypeID)));
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
  console.log(`[Prisma/v95] 🚀 Inicializando v95. Target: ${maskedOriginal.split('?')[0]}`);

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

    console.log(`[Prisma/v95] 🔋 Ativando Modo ADAPTER HANDMADE (Final Type Map).`);
    return new PrismaClient({
      adapter: adapter as any,
      log: ["error"],
    } as any) as ExtendedPrismaClient;
  } catch (err: any) {
    console.warn(`⚠️ [Prisma/v95] Falha Crítica. Ativando Modo Nativo...`);
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
      return { v: "95", status: inst ? 'online' : 'offline' };
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
      console.error(`❌ [Prisma/v95] Proxy Error '${p}':`, err.message);
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
      console.log('🛡️ [Prisma/v95] mTLS v95 Ativo.');
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
